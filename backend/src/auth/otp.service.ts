import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private redisService: RedisService) {}

  /**
   * Sinh mã OTP 6 số lưu trong Redis (5 phút), tự động khóa nếu nhập sai quá 5 lần
   */
  async generateOtp(phone: string, purpose: 'AUTH' | 'TRANSACTION' = 'AUTH') {
    if (!phone || phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }

    const attemptsKey = `otp:attempts:${purpose}:${phone}`;
    const attemptsStr = await this.redisService.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (attempts >= 5) {
      throw new BadRequestException(
        'Số điện thoại tạm thời bị khóa do nhập sai OTP quá 5 lần. Vui lòng thử lại sau 15 phút!',
      );
    }

    // Sinh 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${purpose}:${phone}`;

    // Lưu vào Redis với TTL 300 giây (5 phút)
    await this.redisService.set(otpKey, otpCode, 300);

    this.logger.log(`📱 [SMS Gateway] Mã OTP xác thực cho ${phone} (${purpose}): [${otpCode}] (Hiệu lực: 5 phút)`);

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến số điện thoại của bạn!',
      expiresInSeconds: 300,
      // Trong môi trường development / sandbox, trả về mã OTP để tiện kiểm thử trên app
      otp: otpCode,
    };
  }

  /**
   * Xác thực mã OTP
   */
  async verifyOtp(phone: string, code: string, purpose: 'AUTH' | 'TRANSACTION' = 'AUTH') {
    if (!phone || !code) {
      throw new BadRequestException('Số điện thoại và mã OTP không được để trống');
    }

    const attemptsKey = `otp:attempts:${purpose}:${phone}`;
    const attemptsStr = await this.redisService.get(attemptsKey);
    let attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (attempts >= 5) {
      throw new BadRequestException(
        'Tài khoản đang bị tạm khóa xác thực do nhập sai OTP quá 5 lần. Vui lòng thử lại sau!',
      );
    }

    const otpKey = `otp:${purpose}:${phone}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn (quá 5 phút) hoặc không tồn tại. Vui lòng bấm gửi lại mã mới!');
    }

    if (storedOtp !== code.trim()) {
      attempts++;
      await this.redisService.set(attemptsKey, attempts.toString(), 900); // Khóa 15 phút
      const remaining = Math.max(0, 5 - attempts);
      throw new BadRequestException(
        `Mã OTP không chính xác. Bạn còn lại ${remaining} lần thử trước khi bị khóa tạm thời!`,
      );
    }

    // Xác thực thành công: Xóa OTP và xóa số lần thử
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);

    this.logger.log(`✅ Xác thực OTP thành công cho số điện thoại: ${phone} (${purpose})`);

    return {
      success: true,
      message: 'Xác thực mã OTP thành công!',
      phone,
    };
  }
}
