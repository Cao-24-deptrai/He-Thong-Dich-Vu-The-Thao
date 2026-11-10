import {
  Injectable,
  UnauthorizedException,
  ConflictException,
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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from '../common/enums';
import { UserSession, UserSessionDocument } from './schemas/user-session.schema';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
    @InjectModel(UserSession.name)
    private userSessionModel: Model<UserSessionDocument>,
  ) {}

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

    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Tạo phiên thiết bị mặc định
    await this.userSessionModel.findOneAndUpdate(
      { userId: user._id, deviceId: 'default-device' },
      {
        refreshTokenHash,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      },
      { upsert: true, new: true },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      },
    };
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
        // Khóa đã hết hạn, mở khóa tự động
        user.lockedUntil = null as any;
        user.failedLoginAttempts = 0;
        await user.save();
      }
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Nếu nhập sai từ 5 lần trở lên -> Khóa 15 phút
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
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

    // 4. Sinh Access Token (15 phút) và Refresh Token xoay vòng (30 ngày)
    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const deviceId = dto.deviceId || 'default-device';
    const deviceName = dto.deviceName || 'Web Browser';

    // Lưu hoặc cập nhật phiên thiết bị
    await this.userSessionModel.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        deviceName,
        refreshTokenHash,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      },
      { upsert: true, new: true },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      },
    };
  }

  /**
   * Xoay vòng Refresh Token (Token Rotation - F02.2)
   */
  async refreshToken(dto: RefreshTokenDto) {
    const refreshTokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const deviceId = dto.deviceId || 'default-device';

    // 1. Tìm phiên có hash trùng khớp
    const session = await this.userSessionModel.findOne({
      refreshTokenHash,
      deviceId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Tìm người dùng
    const user = await this.usersService.findById(session.userId.toString());
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    // 3. Cấp Access Token mới và Refresh Token mới (Xoay vòng token)
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
