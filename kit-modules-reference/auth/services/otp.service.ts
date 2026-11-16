import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OtpChallenge, OtpChallengeDocument } from '../schemas/otp-challenge.schema.js';
import { PasswordService } from './password.service.js';
import { DomainError } from '../../../common/errors/domain-error.js';
import { env } from '../../../config/env.config.js';
import * as crypto from 'node:crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OtpChallenge.name)
    private readonly otpModel: Model<OtpChallengeDocument>,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Tạo yêu cầu OTP mới cho số điện thoại
   */
  async createOtpChallenge(
    phone: string,
    purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' | 'VERIFY_PHONE',
  ): Promise<{ challengeId: string; waitSeconds: number; devCode?: string }> {
    const now = new Date();

    // 1. Kiểm tra cooldown 60 giây từ OTP gần nhất
    const latestChallenge = await this.otpModel
      .findOne({ phone, purpose })
      .sort({ createdAt: -1 })
      .exec();

    if (latestChallenge) {
      const elapsedSeconds = Math.floor((now.getTime() - latestChallenge.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        throw new DomainError(
          'OTP_RATE_LIMITED',
          `Vui lòng chờ ${60 - elapsedSeconds} giây trước khi yêu cầu mã OTP mới.`,
          HttpStatus.TOO_MANY_REQUESTS,
          { waitSeconds: 60 - elapsedSeconds },
        );
      }
    }

    // 2. Sinh mã OTP 6 số ngẫu nhiên an toàn
    const codeNumber = crypto.randomInt(100000, 1000000);
    const code = codeNumber.toString();
    const codeHash = this.passwordService.hashToken(code);

    // Thời hạn 5 phút
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const challenge = new this.otpModel({
      phone,
      codeHash,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    });

    const saved = await challenge.save();

    // Che số điện thoại khi ghi log (Rule 02-security-privacy)
    const maskedPhone = phone.replace(/^(\d{3})\d+(\d{3})$/, '$1***$2');
    this.logger.log(`Generated OTP for ${maskedPhone} [purpose: ${purpose}]`);

    // Trong môi trường dev/test, trả về devCode để phục vụ kiểm thử tự động
    const isDev = env.NODE_ENV !== 'production';
    if (isDev) {
      this.logger.debug(`[DEV ONLY] OTP Code for ${maskedPhone}: ${code}`);
    }

    return {
      challengeId: saved._id.toString(),
      waitSeconds: 60,
      ...(isDev ? { devCode: code } : {}),
    };
  }

  /**
   * Xác minh mã OTP
   */
  async verifyOtp(challengeId: string, code: string): Promise<{ phone: string; purpose: string }> {
    const challenge = await this.otpModel.findById(challengeId).exec();

    if (!challenge) {
      throw new DomainError('OTP_NOT_FOUND', 'Yêu cầu OTP không tồn tại hoặc đã hết hạn.', HttpStatus.NOT_FOUND);
    }

    if (challenge.usedAt) {
      throw new DomainError('OTP_ALREADY_USED', 'Mã OTP này đã được sử dụng.', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    if (now > challenge.expiresAt) {
      throw new DomainError('OTP_EXPIRED', 'Mã OTP đã hết hiệu lực (quá 5 phút).', HttpStatus.GONE);
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new DomainError(
        'OTP_MAX_ATTEMPTS',
        'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const inputHash = this.passwordService.hashToken(code);
    if (inputHash !== challenge.codeHash) {
      challenge.attempts += 1;
      await challenge.save();
      const remainingAttempts = challenge.maxAttempts - challenge.attempts;
      throw new DomainError(
        'OTP_INVALID',
        `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`,
        HttpStatus.BAD_REQUEST,
        { remainingAttempts },
      );
    }

    // Đánh dấu đã sử dụng thành công
    challenge.usedAt = now;
    await challenge.save();

    return {
      phone: challenge.phone,
      purpose: challenge.purpose,
    };
  }
}
