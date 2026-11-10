import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { OtpPurpose } from '../src/auth/schemas/otp-challenge.schema';
import { UserRole } from '../src/common/enums';
import { UsersService } from '../src/users/users.service';

describe('Bước 1.2: Dịch vụ OTP & Khóa tài khoản Brute-Force 15 phút (F02.1 & F02.2)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let usersService: UsersService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(uri),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('1. Luồng Gửi & Xác Thực OTP (F02.1)', () => {
    const testPhone = '0901112233';
    let devCode: string;

    it('Gửi mã OTP thành công và nhận devCode trong môi trường test', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: testPhone, purpose: OtpPurpose.LOGIN })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.phone).toBe(testPhone);
      expect(res.body.devCode).toBeDefined();
      expect(res.body.devCode).toMatch(/^[0-9]{6}$/);
      devCode = res.body.devCode;
    });

    it('Gửi lại OTP dưới 60 giây phải bị chặn với HTTP 429 Too Many Requests (Rate limit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: testPhone, purpose: OtpPurpose.LOGIN })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(res.body.errorCode).toBe('OTP_RATE_LIMITED');
      expect(res.body.waitSeconds).toBeGreaterThan(0);
    });

    it('Nhập sai mã OTP -> Bị từ chối với HTTP 400 kèm số lần thử còn lại', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: '000000', purpose: OtpPurpose.LOGIN })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.errorCode).toBe('OTP_INVALID');
      expect(res.body.attemptsLeft).toBe(4);
    });

    it('Nhập đúng mã OTP -> Xác minh thành công (HTTP 200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: devCode, purpose: OtpPurpose.LOGIN })
        .expect(HttpStatus.OK);

      expect(res.body.verified).toBe(true);
      expect(res.body.verifiedAt).toBeDefined();
    });

    it('Không thể dùng lại mã OTP đã được xác nhận (Đã usedAt)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: devCode, purpose: OtpPurpose.LOGIN })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.errorCode).toBe('OTP_EXPIRED_OR_NOT_FOUND');
    });
  });

  describe('2. Khóa tài khoản Brute-Force 15 phút (F02.2)', () => {
    const victimPhone = '0909998877';
    const correctPassword = 'Password@123';

    beforeAll(async () => {
      await usersService.create({
        phone: victimPhone,
        password: correctPassword,
        fullName: 'Người Dùng Test Khóa',
        role: UserRole.CUSTOMER,
      });
    });

    it('Nhập sai mật khẩu lần 1 đến 4 -> HTTP 401 kèm attemptsLeft giảm dần', async () => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ phone: victimPhone, password: 'WrongPassword' })
          .expect(HttpStatus.UNAUTHORIZED);

        expect(res.body.attemptsLeft).toBe(5 - attempt);
      }
    });

    it('Nhập sai mật khẩu lần thứ 5 -> Khóa tài khoản 15 phút với HTTP 403 ACCOUNT_LOCKED', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: victimPhone, password: 'WrongPassword' })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.errorCode).toBe('ACCOUNT_LOCKED');
      expect(res.body.remainingMinutes).toBe(15);
      expect(res.body.lockedUntil).toBeDefined();
    });

    it('Khi tài khoản đang bị khóa, dù nhập ĐÚNG mật khẩu vẫn bị từ chối 403 ACCOUNT_LOCKED', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: victimPhone, password: correctPassword })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.errorCode).toBe('ACCOUNT_LOCKED');
    });

    it('Khi hết thời gian khóa (giả lập tua thời gian), đăng nhập thành công và reset failedLoginAttempts', async () => {
      // Giả lập mở khóa bằng cách cập nhật lockedUntil về quá khứ
      const user = await usersService.findByPhone(victimPhone);
      user!.lockedUntil = new Date(Date.now() - 1000);
      await user!.save();

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: victimPhone, password: correctPassword })
        .expect(HttpStatus.OK);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      const updatedUser = await usersService.findByPhone(victimPhone);
      expect(updatedUser!.failedLoginAttempts).toBe(0);
      expect(updatedUser!.lockedUntil).toBeFalsy();
    });
  });

  describe('3. Xoay vòng Refresh Token (Token Rotation - F02.2)', () => {
    const rotationPhone = '0933445566';
    let currentRefreshToken: string;

    beforeAll(async () => {
      await usersService.create({
        phone: rotationPhone,
        password: 'Password@123',
        fullName: 'Người Dùng Test Rotation',
        role: UserRole.CUSTOMER,
      });
    });

    it('Đăng nhập lấy refreshToken đầu tiên', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: rotationPhone, password: 'Password@123', deviceId: 'device-test-1' })
        .expect(HttpStatus.OK);

      expect(res.body.refreshToken).toBeDefined();
      currentRefreshToken = res.body.refreshToken;
    });

    it('POST /auth/refresh cấp Access Token mới và Refresh Token mới', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: currentRefreshToken, deviceId: 'device-test-1' })
        .expect(HttpStatus.OK);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(currentRefreshToken);

      // Cập nhật token mới
      const oldToken = currentRefreshToken;
      currentRefreshToken = res.body.refreshToken;

      // Token cũ phải bị vô hiệu hóa ngay lập tức
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldToken, deviceId: 'device-test-1' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
