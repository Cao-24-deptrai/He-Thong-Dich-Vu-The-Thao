import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { UserRole } from '../src/common/enums';
import { UsersService } from '../src/users/users.service';

describe('Bước 1.4: Tích hợp Giao diện Web Admin & Xoay vòng Token / Báo lỗi Brute-Force', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let usersService: UsersService;

  const adminAccount = {
    phone: '0999999999',
    password: 'Password123!',
    fullName: 'Hệ Thống Admin',
    role: UserRole.ADMIN,
  };

  const staffAccount = {
    phone: '0988888888',
    password: 'Password123!',
    fullName: 'Lễ Tân Quầy',
    role: UserRole.STAFF,
  };

  const managerAccount = {
    phone: '0911000003',
    password: 'Password123!',
    fullName: 'Quản Lý Sân',
    role: UserRole.MANAGER,
  };

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

    // Khởi tạo các tài khoản mẫu cho Web Admin
    await usersService.create(adminAccount);
    await usersService.create(staffAccount);
    await usersService.create(managerAccount);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Luồng Đăng nhập Web Admin & Chuẩn hóa Dữ liệu Token/Profile', () => {
    it('Đăng nhập thành công với tài khoản Admin -> Trả về tokens, role ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: adminAccount.phone,
          password: adminAccount.password,
        })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe(adminAccount.phone);
      expect(res.body.user.role).toBe(UserRole.ADMIN);
    });

    it('Đăng nhập thành công với tài khoản Staff -> Trả về role STAFF phục vụ điều hướng /walk-in', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: staffAccount.phone,
          password: staffAccount.password,
        })
        .expect(HttpStatus.OK);

      expect(res.body.user.role).toBe(UserRole.STAFF);
    });

    it('Đăng nhập thành công với tài khoản Manager -> Trả về role MANAGER phục vụ điều hướng /facilities', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: managerAccount.phone,
          password: managerAccount.password,
        })
        .expect(HttpStatus.OK);

      expect(res.body.user.role).toBe(UserRole.MANAGER);
    });
  });

  describe('2. Cơ chế Xoay vòng Token (Silent Refresh) tích hợp với Web Admin', () => {
    let initialRefreshToken: string;

    it('Lấy refresh token sau khi đăng nhập', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: adminAccount.phone,
          password: adminAccount.password,
        })
        .expect(HttpStatus.OK);

      initialRefreshToken = res.body.refreshToken;
      expect(initialRefreshToken).toBeDefined();
    });

    it('Admin gửi POST /auth/refresh -> Nhận Access Token mới và Refresh Token mới', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      // Access Token mới có thể gọi trực tiếp API /users/me
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(HttpStatus.OK);

      expect(meRes.body.phone).toBe(adminAccount.phone);
    });

    it('Gửi Refresh Token không hợp lệ -> Bị từ chối HTTP 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token_string' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('3. Luồng Cảnh báo & Khóa Tài khoản Brute-Force tích hợp với Banner Web Admin', () => {
    const targetPhone = '0988888888'; // Staff account

    it('Nhập sai mật khẩu lần 1 đến 4 -> HTTP 401 kèm attemptsLeft để hiển thị Warning Banner', async () => {
      for (let i = 1; i <= 4; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            phone: targetPhone,
            password: 'WrongPassword123!',
          })
          .expect(HttpStatus.UNAUTHORIZED);

        expect(res.body).toHaveProperty('attemptsLeft', 5 - i);
      }
    });

    it('Nhập sai mật khẩu lần thứ 5 -> Khóa tài khoản 15 phút với HTTP 403 ACCOUNT_LOCKED & lockedUntil', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: targetPhone,
          password: 'WrongPassword123!',
        })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.errorCode).toBe('ACCOUNT_LOCKED');
      expect(res.body).toHaveProperty('lockedUntil');

      // Xác minh frontend có thể tính ra số phút còn lại
      const lockedTime = new Date(res.body.lockedUntil).getTime();
      const remainingMinutes = Math.ceil((lockedTime - Date.now()) / (60 * 1000));
      expect(remainingMinutes).toBeGreaterThanOrEqual(14);
      expect(remainingMinutes).toBeLessThanOrEqual(15);
    });

    it('Khi tài khoản đang bị khóa, dù nhập mật khẩu ĐÚNG vẫn trả về 403 ACCOUNT_LOCKED', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: targetPhone,
          password: staffAccount.password, // Mật khẩu đúng
        })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.errorCode).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('4. Luồng Đăng xuất (Logout)', () => {
    it('POST /auth/logout với Bearer token -> Trả về HTTP 200 thành công', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: adminAccount.phone,
          password: adminAccount.password,
        })
        .expect(HttpStatus.OK);

      const token = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });
  });
});
