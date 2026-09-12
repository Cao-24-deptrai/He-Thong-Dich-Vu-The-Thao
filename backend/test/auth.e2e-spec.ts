import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { UserRole } from '../src/common/enums';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let customerToken: string;
  let adminToken: string;

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
    }).compile();

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
});
