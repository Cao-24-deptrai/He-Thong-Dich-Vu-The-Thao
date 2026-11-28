import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import type { Auth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeAppIfConfigured();
  }

  private initializeAppIfConfigured() {
    if (this.app) return;

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const rawPrivateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !rawPrivateKey) {
      this.logger.warn(
        'Firebase Admin SDK chưa được cấu hình đầy đủ (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY). Các tính năng đăng nhập Google & quên mật khẩu Firebase đang tạm tắt.',
      );
      return;
    }

    try {
      // Lazy-load firebase-admin để tránh load ESM dependency (jose) khi chạy test không có Firebase
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cert, getApps, initializeApp } = require('firebase-admin/app') as typeof import('firebase-admin/app');

      const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
      const existingApps = getApps();
      if (existingApps.length > 0 && existingApps[0]) {
        this.app = existingApps[0];
      } else {
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      this.logger.log(`✅ Đã kết nối Firebase Admin SDK (Project: ${projectId}).`);
    } catch (error: any) {
      this.logger.error(`Không thể khởi tạo Firebase Admin SDK: ${error?.message || error}`);
    }
  }

  isConfigured(): boolean {
    return this.app !== null;
  }

  private getWebApiKey(): string {
    return (this.configService.get<string>('firebase.webApiKey') || '').trim();
  }

  isWebApiKeyConfigured(): boolean {
    return Boolean(this.getWebApiKey());
  }

  private getAuth(): Auth {
    if (!this.app) {
      this.initializeAppIfConfigured();
    }
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Dịch vụ xác thực Firebase chưa được cấu hình trên máy chủ. Vui lòng thiết lập biến môi trường Firebase Admin.',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAuth: getFirebaseAuth } = require('firebase-admin/auth') as typeof import('firebase-admin/auth');
    return getFirebaseAuth(this.app);
  }

  /**
   * Xác minh Firebase ID Token gửi lên từ Client SDK.
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    const auth = this.getAuth();
    try {
      return await auth.verifyIdToken(idToken, true);
    } catch (error: any) {
      this.logger.warn(`Xác minh Firebase ID Token thất bại: ${error?.code || error?.message}`);
      throw new UnauthorizedException('Phiên xác thực Firebase không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
    }
  }

  /**
   * Đảm bảo tài khoản email tồn tại trên Firebase Auth để client có thể gọi sendPasswordResetEmail.
   */
  async ensureEmailUserExists(email: string, displayName?: string): Promise<void> {
    const auth = this.getAuth();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      await auth.getUserByEmail(normalizedEmail);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        await auth.createUser({
          email: normalizedEmail,
          displayName: displayName || undefined,
          emailVerified: false,
        });
        this.logger.log(`Đã đồng bộ email ${normalizedEmail} sang Firebase Auth phục vụ đặt lại mật khẩu.`);
        return;
      }
      throw error;
    }
  }

  /**
   * Kiểm tra mật khẩu bằng Firebase Auth REST API để đồng bộ khi người dùng vừa đổi pass qua Firebase hosted page.
   */
  async verifyPasswordWithFirebase(
    email: string,
    password: string,
  ): Promise<{ uid: string; emailVerified: boolean } | null> {
    const webApiKey = this.getWebApiKey();
    if (!webApiKey || !email || !password) return null;

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(webApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            returnSecureToken: true,
          }),
        },
      );

      const data = (await response.json().catch(() => ({}))) as any;
      if (!response.ok || !data?.localId) {
        const errCode = data?.error?.message;
        if (
          errCode &&
          !['INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'].includes(errCode)
        ) {
          this.logger.warn(`Firebase signInWithPassword trả lỗi cho ${normalizedEmail}: ${errCode}`);
        }
        return null;
      }

      if (this.isConfigured() && data.idToken) {
        try {
          const decoded = await this.verifyIdToken(data.idToken);
          return {
            uid: decoded.uid,
            emailVerified: Boolean(decoded.email_verified),
          };
        } catch {
          // Fallback sang kết quả trực tiếp từ Identity Toolkit nếu token chưa kịp sync thời gian
        }
      }

      return {
        uid: String(data.localId),
        emailVerified: false,
      };
    } catch (error: any) {
      this.logger.warn(`Không thể gọi Firebase signInWithPassword: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Cập nhật ngược mật khẩu mới lên Firebase Auth khi người dùng đổi mật khẩu qua Phone OTP
   * để tránh mật khẩu cũ còn tồn tại trên Firebase.
   */
  async syncUserPassword(
    params: { firebaseUid?: string; email?: string },
    newPassword: string,
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const auth = this.getAuth();
      let uid: string | null = null;

      if (params.firebaseUid) {
        try {
          const fbUser = await auth.getUser(params.firebaseUid);
          uid = fbUser.uid;
        } catch (err: any) {
          if (err?.code !== 'auth/user-not-found') throw err;
        }
      }

      if (!uid && params.email) {
        try {
          const fbUser = await auth.getUserByEmail(params.email.trim().toLowerCase());
          uid = fbUser.uid;
        } catch (err: any) {
          if (err?.code !== 'auth/user-not-found') throw err;
        }
      }

      if (!uid) return null;

      await auth.updateUser(uid, { password: newPassword });
      this.logger.log(`Đã đồng bộ mật khẩu mới lên Firebase Auth (UID: ${uid}).`);
      return uid;
    } catch (error: any) {
      this.logger.warn(`Không thể đồng bộ mật khẩu lên Firebase Auth: ${error?.message || error}`);
      return null;
    }
  }
}
