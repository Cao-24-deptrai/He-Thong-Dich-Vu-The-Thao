import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  GoogleLoginDto,
  PrepareEmailResetDto,
  ResetPasswordByEmailDto,
  ResetPasswordByPhoneDto,
} from './dto/firebase-auth.dto';
import { UserRole } from '../common/enums';
import { UserSession, UserSessionDocument } from './schemas/user-session.schema';
import { OtpService } from './otp.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private firebaseAdminService: FirebaseAdminService,
    @InjectModel(UserSession.name)
    private userSessionModel: Model<UserSessionDocument>,
  ) {}

  private formatAuthUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      authProviders: user.authProviders || ['local'],
      role: user.role,
      permissions: user.permissions || [],
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private async issueSessionTokens(
    user: UserDocument,
    deviceId = 'default-device',
    deviceName = 'Web Browser',
  ) {
    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.userSessionModel.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        deviceName,
        refreshTokenHash,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true },
    );

    return {
      accessToken,
      refreshToken,
      user: this.formatAuthUser(user),
    };
  }

  private async findByNormalizedPhone(rawPhone: string): Promise<UserDocument | null> {
    const trimmed = rawPhone.trim();
    const candidates = new Set<string>([trimmed]);
    if (trimmed.startsWith('+84')) {
      candidates.add(`0${trimmed.slice(3)}`);
    } else if (trimmed.startsWith('0')) {
      candidates.add(`+84${trimmed.slice(1)}`);
    }

    for (const candidate of candidates) {
      const user = await this.usersService.findByPhone(candidate);
      if (user) return user;
    }
    return null;
  }

  private async applyPasswordReset(user: UserDocument, newPassword: string) {
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;
    const providers = new Set(user.authProviders || []);
    providers.add('local');
    user.authProviders = Array.from(providers);
    await user.save();

    // Thu hồi toàn bộ phiên đăng nhập cũ để đảm bảo an toàn sau khi đổi mật khẩu
    await this.userSessionModel.deleteMany({ userId: user._id });
  }

  /**
   * Đăng ký tài khoản người dùng mới (F02.1)
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Số điện thoại đã được đăng ký');
    }

    const user = await this.usersService.create({
      phone: dto.phone,
      password: dto.password,
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role || UserRole.CUSTOMER,
    });

    return this.issueSessionTokens(user);
  }

  /**
   * Đăng nhập người dùng kèm cơ chế bảo vệ Brute-force 15 phút (F02.2)
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không chính xác');
    }

    // 1. Kiểm tra tài khoản có đang bị tạm khóa do nhập sai 5 lần không
    if (user.lockedUntil) {
      const now = new Date();
      if (user.lockedUntil > now) {
        const remainingMinutes = Math.ceil(
          (user.lockedUntil.getTime() - now.getTime()) / (60 * 1000),
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            errorCode: 'ACCOUNT_LOCKED',
            message: `Tài khoản đã bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMinutes} phút.`,
            lockedUntil: user.lockedUntil,
            remainingMinutes,
          },
          HttpStatus.FORBIDDEN,
        );
      } else {
        user.lockedUntil = null as any;
        user.failedLoginAttempts = 0;
        await user.save();
      }
    }

    // Tài khoản Google chưa đặt mật khẩu cục bộ
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Tài khoản này đăng nhập bằng Google. Vui lòng chọn "Tiếp tục với Google" hoặc dùng Quên mật khẩu để thiết lập mật khẩu.',
      );
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        this.logger.warn(`Tài khoản ${user.phone} đã bị tạm khóa 15 phút do nhập sai 5 lần.`);

        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            errorCode: 'ACCOUNT_LOCKED',
            message: 'Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.',
            lockedUntil: user.lockedUntil,
            remainingMinutes: 15,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      await user.save();
      const attemptsLeft = 5 - user.failedLoginAttempts;
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Số điện thoại hoặc mật khẩu không chính xác',
        attemptsLeft,
      });
    }

    // 3. Đăng nhập thành công -> Reset bộ đếm số lần sai
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null as any;
      await user.save();
    }

    return this.issueSessionTokens(
      user,
      dto.deviceId || 'default-device',
      dto.deviceName || 'Web Browser',
    );
  }

  /**
   * Đăng nhập / Đăng ký nhanh bằng Google thông qua Firebase ID Token (Chỉ dành cho CUSTOMER)
   */
  async loginWithGoogle(dto: GoogleLoginDto) {
    const decoded = await this.firebaseAdminService.verifyIdToken(dto.idToken);

    const provider = decoded.firebase?.sign_in_provider;
    if (provider && provider !== 'google.com') {
      throw new BadRequestException('Token không thuộc phương thức đăng nhập Google');
    }

    if (!decoded.email) {
      throw new BadRequestException('Tài khoản Google không cung cấp địa chỉ email hợp lệ');
    }

    const normalizedEmail = decoded.email.trim().toLowerCase();
    let user = await this.usersService.findByFirebaseUid(decoded.uid);

    if (!user) {
      user = await this.usersService.findByEmail(normalizedEmail);
    }

    if (user) {
      if (user.role !== UserRole.CUSTOMER) {
        throw new ForbiddenException(
          'Tài khoản quản trị / nhân viên không được phép đăng nhập qua Google. Vui lòng dùng tài khoản nội bộ tại cổng quản trị.',
        );
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            errorCode: 'ACCOUNT_LOCKED',
            message: `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
            lockedUntil: user.lockedUntil,
            remainingMinutes,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      let updated = false;
      if (!user.firebaseUid) {
        user.firebaseUid = decoded.uid;
        updated = true;
      }
      if (!user.isEmailVerified && decoded.email_verified) {
        user.isEmailVerified = true;
        updated = true;
      }
      if (!user.avatarUrl && decoded.picture) {
        user.avatarUrl = decoded.picture;
        updated = true;
      }
      const providers = new Set(user.authProviders || []);
      if (!providers.has('google')) {
        providers.add('google');
        user.authProviders = Array.from(providers);
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      user = await this.usersService.createGoogleUser({
        firebaseUid: decoded.uid,
        email: normalizedEmail,
        fullName: decoded.name || normalizedEmail.split('@')[0],
        avatarUrl: decoded.picture,
        isEmailVerified: Boolean(decoded.email_verified),
      });
    }

    const session = await this.issueSessionTokens(
      user,
      dto.deviceId || 'default-device',
      dto.deviceName || 'Google Web Client',
    );

    return {
      ...session,
      requiresPhoneCompletion: !user.phone,
    };
  }

  /**
   * Đặt lại mật khẩu bằng OTP SĐT đã xác thực qua Firebase Phone Auth (Chỉ dành cho CUSTOMER)
   */
  async resetPasswordByPhone(dto: ResetPasswordByPhoneDto) {
    const decoded = await this.firebaseAdminService.verifyIdToken(dto.idToken);

    if (!decoded.phone_number) {
      throw new BadRequestException('Token Firebase không chứa thông tin số điện thoại đã xác thực');
    }

    const user = await this.findByNormalizedPhone(decoded.phone_number);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản khách hàng nào đăng ký với số điện thoại này');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Tài khoản nhân viên / quản trị không thể tự đặt lại mật khẩu');
    }

    user.isPhoneVerified = true;
    await this.applyPasswordReset(user, dto.newPassword);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
    };
  }

  /**
   * Chuẩn bị tài khoản trên Firebase Auth trước khi client gửi Email Reset Password Link
   */
  async prepareEmailReset(dto: PrepareEmailResetDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản khách hàng nào sử dụng địa chỉ email này');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Tài khoản nhân viên / quản trị không thể tự đặt lại mật khẩu qua Email');
    }

    await this.firebaseAdminService.ensureEmailUserExists(normalizedEmail, user.fullName);

    return {
      ready: true,
      email: normalizedEmail,
    };
  }

  /**
   * Đồng bộ mật khẩu mới về MongoDB sau khi người dùng đổi mật khẩu qua Email Link của Firebase
   */
  async completeEmailReset(dto: ResetPasswordByEmailDto) {
    const decoded = await this.firebaseAdminService.verifyIdToken(dto.idToken);

    if (!decoded.email) {
      throw new BadRequestException('Token Firebase không chứa địa chỉ email hợp lệ');
    }

    const normalizedEmail = decoded.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản khách hàng tương ứng');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Tài khoản nội bộ không được phép tự đặt lại mật khẩu');
    }

    if (!user.firebaseUid) {
      user.firebaseUid = decoded.uid;
    }
    user.isEmailVerified = true;
    await this.applyPasswordReset(user, dto.newPassword);

    return {
      success: true,
      message: 'Mật khẩu mới đã được cập nhật đồng bộ. Vui lòng đăng nhập lại.',
    };
  }

  /**
   * Xoay vòng Refresh Token (Token Rotation - F02.2)
   */
  async refreshToken(dto: RefreshTokenDto) {
    const refreshTokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const deviceId = dto.deviceId || 'default-device';

    const session = await this.userSessionModel.findOne({
      refreshTokenHash,
      deviceId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.usersService.findById(session.userId.toString());
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
    };

    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    session.refreshTokenHash = newRefreshTokenHash;
    session.lastActiveAt = new Date();
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Đăng xuất phiên thiết bị
   */
  async logout(userId: string, deviceId = 'default-device') {
    await this.userSessionModel.deleteOne({
      userId: new Types.ObjectId(userId),
      deviceId,
    });
    return { success: true, message: 'Đăng xuất phiên thiết bị thành công' };
  }
}
