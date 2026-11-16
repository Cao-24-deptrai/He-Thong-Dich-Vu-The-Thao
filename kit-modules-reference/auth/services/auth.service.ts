import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from '../schemas/user.schema.js';
import { UserSession, UserSessionDocument } from '../schemas/user-session.schema.js';
import { PasswordService } from './password.service.js';
import { OtpService } from './otp.service.js';
import { AuditLogService } from './audit-log.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { DomainError } from '../../../common/errors/domain-error.js';
import { Role } from '@sports/shared';
import {
  RegisterRequest,
  LoginRequest,
  AuthTokens,
  UserProfile,
  QuickCreateUserRequest,
  AssignRoleRequest,
  LockUserRequest,
} from '@sports/contracts';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
    private readonly passwordService: PasswordService,
    private readonly otpService: OtpService,
    private readonly auditLogService: AuditLogService,
    private readonly jwtService: JwtService,
    private readonly dbTxService: DatabaseTransactionService,
  ) {}

  /**
   * Đăng ký tài khoản khách hàng mới (bước 1: lưu thông tin và gửi OTP)
   */
  async register(dto: RegisterRequest): Promise<{ challengeId: string; waitSeconds: number; devCode?: string }> {
    // 1. Kiểm tra số điện thoại duy nhất
    const existing = await this.userModel.findOne({ phone: dto.phone }).exec();
    if (existing) {
      throw new DomainError('PHONE_EXISTS', 'Số điện thoại này đã được đăng ký tài khoản.', HttpStatus.CONFLICT);
    }

    // 2. Băm mật khẩu bằng Argon2id
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 3. Tạo user với trạng thái PENDING_ACTIVATION
    const user = new this.userModel({
      type: 'CUSTOMER',
      phone: dto.phone,
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      status: 'PENDING_ACTIVATION',
      role: Role.CUSTOMER,
      permissions: ['booking.create', 'booking.view.own', 'wallet.view.own'],
      consents: dto.consents || { personalData: true, biometric: false, marketing: false, termsVersion: '1.0' },
    });

    await user.save();

    // 4. Sinh mã OTP xác minh số điện thoại
    const otpResult = await this.otpService.createOtpChallenge(dto.phone, 'REGISTER');

    return otpResult;
  }

  /**
   * Xác thực OTP đăng ký (bước 2: kích hoạt tài khoản và cấp token)
   */
  async verifyRegistration(
    challengeId: string,
    code: string,
    deviceId = 'web-browser',
    deviceName = 'Web Browser',
  ): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { phone } = await this.otpService.verifyOtp(challengeId, code);

    const user = await this.userModel.findOne({ phone }).exec();
    if (!user) {
      throw new DomainError('USER_NOT_FOUND', 'Không tìm thấy thông tin tài khoản người dùng.', HttpStatus.NOT_FOUND);
    }

    user.status = 'ACTIVE';
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.createSession(user, deviceId, deviceName, true);

    return {
      user: this.mapToProfile(user),
      tokens,
    };
  }

  /**
   * Đăng nhập bằng số điện thoại và mật khẩu
   */
  async login(
    dto: LoginRequest,
    ip?: string,
    userAgent?: string,
  ): Promise<
    | { requiresOtp: false; user: UserProfile; tokens: AuthTokens }
    | { requiresOtp: true; challengeId: string; phone: string; waitSeconds: number; devCode?: string }
  > {
    const user = await this.userModel.findOne({ phone: dto.phone }).exec();
    const now = new Date();

    if (!user) {
      throw new DomainError(
        'INVALID_CREDENTIALS',
        'Số điện thoại hoặc mật khẩu không chính xác.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 1. Kiểm tra tài khoản có bị khóa không (Brute-force protection: 15 phút sau 5 lần sai)
    if (user.status === 'LOCKED' || (user.lockedUntil && user.lockedUntil > now)) {
      const waitMinutes = user.lockedUntil
        ? Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (60 * 1000))
        : 15;
      throw new DomainError(
        'ACCOUNT_LOCKED',
        `Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${waitMinutes} phút.`,
        HttpStatus.FORBIDDEN,
        { waitMinutes },
      );
    }

    // 2. Xác thực mật khẩu
    const isPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // Khóa 15 phút
        await this.auditLogService.record({
          actorId: user._id.toString(),
          actorRole: user.role,
          action: 'auth.user.locked_bruteforce',
          targetType: 'User',
          targetId: user._id.toString(),
          after: { failedAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil },
          ip,
          userAgent,
        });
      }
      await user.save();

      throw new DomainError(
        'INVALID_CREDENTIALS',
        'Số điện thoại hoặc mật khẩu không chính xác.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Đăng nhập đúng -> reset số lần thất bại
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = now;
    await user.save();

    // 3. Kiểm tra yêu cầu OTP (Rule 02-security-privacy & Spec 3.8):
    // - Nhân viên (STAFF, CASHIER, MANAGER, OWNER) LUÔN CẦN OTP mỗi lần đăng nhập
    // - Khách hàng đăng nhập trên thiết bị chưa được tin cậy hoặc hết hạn tin cậy
    const isStaff = user.type === 'STAFF' || user.role !== Role.CUSTOMER;
    let isDeviceTrusted = false;

    if (!isStaff) {
      const existingSession = await this.sessionModel
        .findOne({ userId: user._id, deviceId: dto.deviceId })
        .exec();
      if (existingSession && existingSession.isTrusted && existingSession.trustedUntil && existingSession.trustedUntil > now) {
        isDeviceTrusted = true;
      }
    }

    if (isStaff || !isDeviceTrusted) {
      // Yêu cầu xác thực OTP
      const otpChallenge = await this.otpService.createOtpChallenge(user.phone, 'LOGIN');
      return {
        requiresOtp: true,
        challengeId: otpChallenge.challengeId,
        phone: user.phone,
        waitSeconds: otpChallenge.waitSeconds,
        devCode: otpChallenge.devCode,
      };
    }

    // Thiết bị đã tin cậy -> cấp token trực tiếp
    const tokens = await this.createSession(user, dto.deviceId, dto.deviceName || 'Web Browser', true);

    return {
      requiresOtp: false,
      user: this.mapToProfile(user),
      tokens,
    };
  }

  /**
   * Xác thực OTP khi đăng nhập
   */
  async verifyLoginOtp(
    challengeId: string,
    code: string,
    deviceId = 'web-browser',
    deviceName = 'Web Browser',
  ): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { phone } = await this.otpService.verifyOtp(challengeId, code);

    const user = await this.userModel.findOne({ phone }).exec();
    if (!user) {
      throw new DomainError('USER_NOT_FOUND', 'Người dùng không tồn tại.', HttpStatus.NOT_FOUND);
    }

    const tokens = await this.createSession(user, deviceId, deviceName, true);

    return {
      user: this.mapToProfile(user),
      tokens,
    };
  }

  /**
   * Xoay vòng Refresh Token (Token Rotation)
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.passwordService.hashToken(refreshToken);

    const session = await this.sessionModel.findOne({ refreshTokenHash: tokenHash }).exec();
    if (!session || session.expiresAt < new Date()) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userModel.findById(session.userId).exec();
    if (!user || user.status === 'LOCKED') {
      await this.sessionModel.deleteOne({ _id: session._id });
      throw new DomainError('UNAUTHORIZED', 'Tài khoản không hợp lệ hoặc đã bị khóa.', HttpStatus.UNAUTHORIZED);
    }

    // Xoay vòng: hủy token cũ, tạo token mới
    const newRefreshToken = this.passwordService.generateRandomToken(40);
    const newRefreshTokenHash = this.passwordService.hashToken(newRefreshToken);

    session.refreshTokenHash = newRefreshTokenHash;
    session.lastActiveAt = new Date();
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày
    await session.save();

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  /**
   * Đăng xuất khỏi thiết bị hiện tại
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.passwordService.hashToken(refreshToken);
    await this.sessionModel.deleteOne({ refreshTokenHash: tokenHash }).exec();
  }

  /**
   * Lễ tân tạo nhanh tài khoản cho khách vãng lai tại quầy (F02.4)
   */
  async quickCreateCustomer(dto: QuickCreateUserRequest, actor: UserDocument): Promise<UserProfile> {
    const existing = await this.userModel.findOne({ phone: dto.phone }).exec();
    if (existing) {
      throw new DomainError('PHONE_EXISTS', 'Số điện thoại này đã có tài khoản trên hệ thống.', HttpStatus.CONFLICT);
    }

    // Mật khẩu ngẫu nhiên mặc định
    const tempPassword = this.passwordService.generateRandomToken(8);
    const passwordHash = await this.passwordService.hashPassword(tempPassword);

    const user = new this.userModel({
      type: 'CUSTOMER',
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      status: 'ACTIVE',
      role: Role.CUSTOMER,
      permissions: ['booking.create', 'booking.view.own', 'wallet.view.own'],
    });

    await user.save();

    await this.auditLogService.record({
      actorId: actor._id.toString(),
      actorRole: actor.role,
      action: 'auth.user.quick_create',
      targetType: 'User',
      targetId: user._id.toString(),
      after: { phone: dto.phone, fullName: dto.fullName },
    });

    return this.mapToProfile(user);
  }

  /**
   * Quản lý gán vai trò & phân quyền (F02.5)
   */
  async assignRole(targetUserId: string, dto: AssignRoleRequest, actor: UserDocument): Promise<UserProfile> {
    const targetUser = await this.userModel.findById(targetUserId).exec();
    if (!targetUser) {
      throw new DomainError('USER_NOT_FOUND', 'Không tìm thấy người dùng.', HttpStatus.NOT_FOUND);
    }

    if (targetUser.role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new DomainError('CANNOT_CHANGE_OWNER', 'Không có quyền thay đổi vai trò của Chủ cơ sở.', HttpStatus.FORBIDDEN);
    }

    const before = { role: targetUser.role, permissions: targetUser.permissions };

    return await this.dbTxService.runTransaction(async (session) => {
      targetUser.role = dto.role;
      targetUser.type = dto.role === Role.CUSTOMER ? 'CUSTOMER' : 'STAFF';
      if (dto.permissions) {
        targetUser.permissions = dto.permissions;
      }
      await targetUser.save({ session });

      // Ghi audit log
      await this.auditLogService.record(
        {
          actorId: actor._id.toString(),
          actorRole: actor.role,
          action: 'auth.role.assign',
          targetType: 'User',
          targetId: targetUser._id.toString(),
          before,
          after: { role: targetUser.role, permissions: targetUser.permissions },
        },
        session,
      );

      return this.mapToProfile(targetUser);
    });
  }

  /**
   * Khóa tài khoản người dùng (F02.6)
   */
  async lockUser(targetUserId: string, dto: LockUserRequest, actor: UserDocument): Promise<UserProfile> {
    const targetUser = await this.userModel.findById(targetUserId).exec();
    if (!targetUser) {
      throw new DomainError('USER_NOT_FOUND', 'Không tìm thấy người dùng.', HttpStatus.NOT_FOUND);
    }

    if (targetUser.role === Role.ADMIN) {
      throw new DomainError('CANNOT_LOCK_OWNER', 'Không thể khóa tài khoản của Chủ cơ sở.', HttpStatus.FORBIDDEN);
    }

    const durationMinutes = dto.durationMinutes || 15;
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    targetUser.status = 'LOCKED';
    targetUser.lockedUntil = lockedUntil;
    await targetUser.save();

    // Hủy bỏ toàn bộ phiên hoạt động của tài khoản này
    await this.sessionModel.deleteMany({ userId: targetUser._id });

    await this.auditLogService.record({
      actorId: actor._id.toString(),
      actorRole: actor.role,
      action: 'auth.user.lock',
      targetType: 'User',
      targetId: targetUser._id.toString(),
      after: { reason: dto.reason, lockedUntil },
    });

    return this.mapToProfile(targetUser);
  }

  /**
   * Mở khóa tài khoản
   */
  async unlockUser(targetUserId: string, actor: UserDocument): Promise<UserProfile> {
    const targetUser = await this.userModel.findById(targetUserId).exec();
    if (!targetUser) {
      throw new DomainError('USER_NOT_FOUND', 'Không tìm thấy người dùng.', HttpStatus.NOT_FOUND);
    }

    targetUser.status = 'ACTIVE';
    targetUser.lockedUntil = undefined;
    targetUser.failedLoginAttempts = 0;
    await targetUser.save();

    await this.auditLogService.record({
      actorId: actor._id.toString(),
      actorRole: actor.role,
      action: 'auth.user.unlock',
      targetType: 'User',
      targetId: targetUser._id.toString(),
    });

    return this.mapToProfile(targetUser);
  }

  // --- Helpers ---

  private generateAccessToken(user: UserDocument): string {
    return this.jwtService.sign(
      {
        sub: user._id.toString(),
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        type: user.type,
      },
      { expiresIn: '15m' }, // Token 15 phút (ADR-0001)
    );
  }

  private async createSession(
    user: UserDocument,
    deviceId: string,
    deviceName: string,
    trusted: boolean,
  ): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.passwordService.generateRandomToken(40);
    const refreshTokenHash = this.passwordService.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày
    const trustedUntil = trusted ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined;

    await this.sessionModel.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        userId: user._id,
        deviceId,
        deviceName,
        refreshTokenHash,
        isTrusted: trusted,
        trustedUntil,
        lastActiveAt: new Date(),
        expiresAt,
      },
      { upsert: true, new: true },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    };
  }

  public mapToProfile(user: UserDocument): UserProfile {
    return {
      id: user._id.toString(),
      type: user.type,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      status: user.status,
      invoiceInfo: user.invoiceInfo,
      consents: user.consents
        ? {
            personalData: user.consents.personalData,
            biometric: user.consents.biometric,
            marketing: user.consents.marketing,
            termsVersion: user.consents.termsVersion,
            consentedAt: user.consents.consentedAt ? user.consents.consentedAt.toISOString() : undefined,
          }
        : undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
