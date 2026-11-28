import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { FirebaseAdminService } from '../src/auth/firebase-admin.service';
import { UsersModule } from '../src/users/users.module';
import { UserRole } from '../src/common/enums';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let customerToken: string;
  let adminToken: string;
  const ensureEmailUserExistsMock = jest.fn().mockResolvedValue(undefined);
  const syncUserPasswordMock = jest.fn().mockResolvedValue('fb-uid-synced-1');
  const verifyPasswordWithFirebaseMock = jest.fn(async (email: string, password: string) => {
    if (email === 'nguyenvana@gmail.com' && password === 'FirebaseHostedReset@123') {
      return { uid: 'fb-uid-email-1', emailVerified: true };
    }
    return null;
  });
  const verifyIdTokenMock = jest.fn(async (token: string) => {
    switch (token) {
      case 'google-new-user':
        return {
          uid: 'fb-uid-new-1',
          email: 'googleplayer@gmail.com',
          email_verified: true,
          name: 'Google Player',
          picture: 'https://example.com/avatar.png',
          firebase: { sign_in_provider: 'google.com' },
        };
      case 'google-existing-customer':
        return {
          uid: 'fb-uid-existing-1',
          email: 'nguyenvana@gmail.com',
          email_verified: true,
          name: 'Nguyễn Văn A',
          firebase: { sign_in_provider: 'google.com' },
        };
      case 'google-admin-blocked':
        return {
          uid: 'fb-uid-admin-1',
          email: 'admin@sportsbooking.vn',
          email_verified: true,
          name: 'Admin User',
          firebase: { sign_in_provider: 'google.com' },
        };
      case 'phone-otp-customer':
        return {
          uid: 'fb-uid-phone-1',
          phone_number: '+84912345678',
          firebase: { sign_in_provider: 'phone' },
        };
      case 'phone-otp-admin':
        return {
          uid: 'fb-uid-phone-admin',
          phone_number: '240106',
          firebase: { sign_in_provider: 'phone' },
        };
      case 'email-reset-customer':
        return {
          uid: 'fb-uid-email-1',
          email: 'nguyenvana@gmail.com',
          email_verified: true,
          firebase: { sign_in_provider: 'password' },
        };
      default:
        throw new Error('Invalid mock token');
    }
  });

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        AuthModule,
        UsersModule,
      ],
    })
      .overrideProvider(FirebaseAdminService)
      .useValue({
        isConfigured: () => true,
        isWebApiKeyConfigured: () => true,
        verifyIdToken: verifyIdTokenMock,
        ensureEmailUserExists: ensureEmailUserExistsMock,
        verifyPasswordWithFirebase: verifyPasswordWithFirebaseMock,
        syncUserPassword: syncUserPasswordMock,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('1. Đăng ký tài khoản (POST /auth/register)', () => {
    it('Đăng ký thành công khách hàng mới (CUSTOMER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '0912345678',
          password: 'Password@123',
          fullName: 'Nguyễn Văn A',
          email: 'nguyenvana@gmail.com',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe('0912345678');
      expect(res.body.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      customerToken = res.body.accessToken;
    });

    it('Đăng ký trùng số điện thoại phải bị từ chối với HTTP 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '0912345678',
          password: 'AnotherPassword',
          fullName: 'Người Trùng SĐT',
        })
        .expect(409);

      expect(res.body.message).toContain('đã được đăng ký');
    });

    it('Đăng ký tài khoản với role ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '0999999999',
          password: 'AdminPassword@123',
          fullName: 'Quản Trị Viên',
          role: UserRole.ADMIN,
        })
        .expect(201);

      expect(res.body.user.role).toBe(UserRole.ADMIN);
      adminToken = res.body.accessToken;
    });
  });

  describe('2. Đăng nhập (POST /auth/login)', () => {
    it('Đăng nhập thành công với SĐT và mật khẩu đúng', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'Password@123',
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.phone).toBe('0912345678');
    });

    it('Đăng nhập thành công với Email và mật khẩu đúng (qua phone hoặc identifier)', async () => {
      const resByPhoneField = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: 'NguyenVanA@gmail.com',
          password: 'Password@123',
        })
        .expect(200);

      expect(resByPhoneField.body).toHaveProperty('accessToken');
      expect(resByPhoneField.body.user.email).toBe('nguyenvana@gmail.com');

      const resByIdentifier = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: 'nguyenvana@gmail.com',
          password: 'Password@123',
        })
        .expect(200);

      expect(resByIdentifier.body).toHaveProperty('accessToken');
      expect(resByIdentifier.body.user.phone).toBe('0912345678');
    });

    it('Đăng nhập thất bại khi sai mật khẩu -> 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('Đăng nhập thất bại khi SĐT không tồn tại -> 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0900000000',
          password: 'Password@123',
        })
        .expect(401);
    });
  });

  describe('3. Xác thực & Phân quyền RBAC (GET /auth/me, GET /auth/admin-test)', () => {
    it('Truy cập /auth/me không có Bearer token -> 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('Truy cập /auth/me với token hợp lệ -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.phone).toBe('0912345678');
      expect(res.body.role).toBe(UserRole.CUSTOMER);
    });

    it('Khách hàng (CUSTOMER) truy cập endpoint admin-test -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/admin-test')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(res.body.message).toContain('Quyền truy cập bị từ chối');
    });

    it('Admin (ADMIN) truy cập endpoint admin-test -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/admin-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('Xin chào Admin');
    });
  });

  describe('4. Đăng nhập Google qua Firebase & Bổ sung SĐT', () => {
    let googleUserToken: string;

    it('Đăng nhập Google lần đầu -> tự tạo CUSTOMER không cần SĐT và yêu cầu bổ sung SĐT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/firebase/google')
        .send({ idToken: 'google-new-user' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.requiresPhoneCompletion).toBe(true);
      expect(res.body.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.user.email).toBe('googleplayer@gmail.com');
      expect(res.body.user.phone).toBeUndefined();
      googleUserToken = res.body.accessToken;
    });

    it('Cập nhật số điện thoại cho tài khoản Google (PATCH /users/me/phone)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/phone')
        .set('Authorization', `Bearer ${googleUserToken}`)
        .send({ phone: '0987654321' })
        .expect(200);

      expect(res.body.phone).toBe('0987654321');
    });

    it('Đăng nhập Google trùng email tài khoản CUSTOMER sẵn có -> tự động liên kết', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/firebase/google')
        .send({ idToken: 'google-existing-customer' })
        .expect(200);

      expect(res.body.requiresPhoneCompletion).toBe(false);
      expect(res.body.user.phone).toBe('0912345678');
      expect(res.body.user.authProviders).toContain('google');
    });

    it('Chặn tài khoản ADMIN đăng nhập qua Google -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/auth/firebase/google')
        .send({ idToken: 'google-admin-blocked' })
        .expect(403);
    });
  });

  describe('5. Quên mật khẩu qua Firebase (SĐT OTP & Email Link)', () => {
    it('Đặt lại mật khẩu bằng OTP SĐT (+84912345678 -> 0912345678) -> thành công & đăng nhập lại được', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password/phone/verify-and-reset')
        .send({
          idToken: 'phone-otp-customer',
          newPassword: 'ResetPhone@123',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(syncUserPasswordMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'nguyenvana@gmail.com' }),
        'ResetPhone@123',
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'ResetPhone@123',
        })
        .expect(200);
    });

    it('Chặn tài khoản ADMIN tự đặt lại mật khẩu qua SĐT -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password/phone/verify-and-reset')
        .send({
          idToken: 'phone-otp-admin',
          newPassword: 'HackedPassword@123',
        })
        .expect(403);
    });

    it('Chuẩn bị & hoàn tất đặt lại mật khẩu qua Email Link Firebase', async () => {
      const prep = await request(app.getHttpServer())
        .post('/auth/forgot-password/email/prepare')
        .send({ email: 'nguyenvana@gmail.com' })
        .expect(200);

      expect(prep.body.ready).toBe(true);
      expect(ensureEmailUserExistsMock).toHaveBeenCalledWith('nguyenvana@gmail.com', 'Nguyễn Văn A');

      const complete = await request(app.getHttpServer())
        .post('/auth/forgot-password/email/complete')
        .send({
          idToken: 'email-reset-customer',
          newPassword: 'ResetEmail@123',
        })
        .expect(200);

      expect(complete.body.success).toBe(true);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'ResetEmail@123',
        })
        .expect(200);
    });

    it('Tự đồng bộ mật khẩu mới từ Firebase về MongoDB khi đăng nhập bằng SĐT hoặc Email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: 'nguyenvana@gmail.com',
          password: 'FirebaseHostedReset@123',
        })
        .expect(200);

      expect(verifyPasswordWithFirebaseMock).toHaveBeenCalledWith(
        'nguyenvana@gmail.com',
        'FirebaseHostedReset@123',
      );

      // Mật khẩu cũ không còn hợp lệ sau khi đồng bộ
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'ResetEmail@123',
        })
        .expect(401);

      // Mật khẩu mới đăng nhập được bằng SĐT
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '0912345678',
          password: 'FirebaseHostedReset@123',
        })
        .expect(200);
    });
  });
});
