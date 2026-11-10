import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { OtpChallenge, OtpChallengeDocument, OtpPurpose } from './schemas/otp-challenge.schema';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OtpChallenge.name)
    private otpModel: Model<OtpChallengeDocument>,
  ) {}

  /**
   * Sinh và gửi mã OTP 6 số (F02.1 & Spec M02)
   * - Giới hạn 60s giữa 2 lần gửi liên tiếp (Rate limit)
   * - Hạn sử dụng 5 phút (TTL 300s)
   * - Tối đa 5 lần thử
   * - Dev Provider: In mã OTP ra logger console & trả về trong môi trường dev/test
   */
  async sendOtp(phone: string, purpose: OtpPurpose = OtpPurpose.LOGIN) {
    const trimmedPhone = phone.trim();

    // 1. Kiểm tra Rate Limit: Khoảng cách tối thiểu 60s giữa 2 lần gửi
    const lastChallenge = await this.otpModel
      .findOne({ phone: trimmedPhone, purpose })
      .sort({ createdAt: -1 })
      .exec();

    if (lastChallenge) {
      const elapsedSeconds = Math.floor((Date.now() - lastChallenge.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const waitSeconds = 60 - elapsedSeconds;
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            errorCode: 'OTP_RATE_LIMITED',
            message: `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu mã OTP mới`,
            waitSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Sinh mã OTP 6 số ngẫu nhiên an toàn
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // 3. Lưu vào Database
    const challenge = new this.otpModel({
      phone: trimmedPhone,
      codeHash,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    });
    await challenge.save();

    // 4. In mã ra Console (Dev Provider)
    this.logger.log(`[DEV OTP PROVIDER] Mã xác thực cho số ${trimmedPhone} (${purpose}) là: ${code}`);

    return {
      success: true,
      phone: trimmedPhone,
      purpose,
      challengeId: challenge._id.toString(),
      waitSeconds: 60,
      expiresAt,
      // Trong môi trường dev/test, trả về devCode để phục vụ kiểm thử tự động
      ...(process.env.NODE_ENV !== 'production' && { devCode: code }),
    };
  }

  /**
   * Xác thực mã OTP người dùng nhập vào
   * - Kiểm tra hạn sử dụng 5 phút
   * - Đếm số lần thử (tối đa 5 lần, nếu sai quá 5 lần thì vô hiệu hóa)
   */
  async verifyOtp(phone: string, code: string, purpose: OtpPurpose = OtpPurpose.LOGIN) {
    const trimmedPhone = phone.trim();

    // 1. Tìm challenge mới nhất chưa dùng và còn hạn
    const challenge = await this.otpModel
      .findOne({
        phone: trimmedPhone,
        purpose,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!challenge) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'OTP_EXPIRED_OR_NOT_FOUND',
        message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
      });
    }

    // 2. Kiểm tra nếu đã vượt quá số lần nhập sai
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'OTP_MAX_ATTEMPTS',
        message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa.',
      });
    }

    // 3. So khớp mã băm SHA-256
    const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (inputHash !== challenge.codeHash) {
      challenge.attempts += 1;
      await challenge.save();

      const attemptsLeft = challenge.maxAttempts - challenge.attempts;
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'OTP_INVALID',
        message:
          attemptsLeft > 0
            ? `Mã OTP không chính xác. Bạn còn ${attemptsLeft} lần thử.`
            : 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa.',
        attemptsLeft,
      });
    }

    // 4. Xác nhận thành công và đánh dấu đã sử dụng
    challenge.usedAt = new Date();
    await challenge.save();

    return {
      verified: true,
      phone: trimmedPhone,
      purpose,
      verifiedAt: challenge.usedAt,
    };
  }
}
