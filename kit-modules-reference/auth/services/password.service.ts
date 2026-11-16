import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';

@Injectable()
export class PasswordService {
  /**
   * Băm mật khẩu bằng thuật toán Argon2id (chuẩn ADR-0001)
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Xác thực mật khẩu so với hash
   */
  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  /**
   * Băm SHA-256 an toàn cho refresh token, OTP code hoặc session key
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sinh chuỗi ngẫu nhiên an toàn mã hóa (cryptographically secure)
   */
  generateRandomToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
