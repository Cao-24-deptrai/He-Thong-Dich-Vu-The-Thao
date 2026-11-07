import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Bước 1.2: Cấu hình CORS & Định Danh Client & Đồng Bộ Session (3 Giao Diện)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Cấu hình CORS giống main.ts
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Client-Type'],
      exposedHeaders: ['Content-Disposition', 'X-Client-Type', 'X-Response-Time'],
      credentials: true,
    });

    await app.init();

    // Login or Register Admin to get token
    const testPhone = '0987654321';
    const testPassword = 'password123';

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: testPhone, password: testPassword });

    if (loginRes.status === 200 && loginRes.body.accessToken) {
      adminToken = loginRes.body.accessToken;
    } else {
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testPhone,
          password: testPassword,
          fullName: 'Super Admin',
          role: 'SYSTEM_ADMIN',
        });
      adminToken = regRes.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Phần 1: Cấu hình CORS Preflight an toàn', () => {
    it('1.1 OPTIONS request từ Origin http://localhost:3001 phải trả về header CORS hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .options('/facilities')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization, X-Client-Type');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Phần 2: Client Identifier Middleware cho 3 Giao diện', () => {
    it('2.1 Tự động nhận diện header X-Client-Type: WEB_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/facilities')
        .set('X-Client-Type', 'WEB_ADMIN');

      expect(res.status).toBe(200);
      expect(res.headers['x-client-type']).toBe('WEB_ADMIN');
      expect(res.headers['x-response-time']).toBeDefined();
    });

    it('2.2 Tự động suy luận CASHIER_POS từ Referer cashier.html', async () => {
      const res = await request(app.getHttpServer())
        .get('/facilities')
        .set('Referer', 'http://localhost:3001/cashier.html');

      expect(res.status).toBe(200);
      expect(res.headers['x-client-type']).toBe('CASHIER_POS');
    });

    it('2.3 Tự động suy luận CUSTOMER_APP từ Referer user-app.html', async () => {
      const res = await request(app.getHttpServer())
        .get('/facilities')
        .set('Referer', 'http://localhost:3001/user-app.html');

      expect(res.status).toBe(200);
      expect(res.headers['x-client-type']).toBe('CUSTOMER_APP');
    });
  });

  describe('Phần 3: Đồng Bộ Phiên Làm Việc (GET /auth/session)', () => {
    it('3.1 Token JWT hợp lệ phải trả về thông tin người dùng và vai trò', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/session')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Client-Type', 'WEB_ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.phone).toBe('0987654321');
      expect(res.body.user.role).toBeDefined();
    });

    it('3.2 Token JWT không hợp lệ phải trả về lỗi 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/session')
        .set('Authorization', 'Bearer INVALID_JWT_TOKEN');

      expect(res.status).toBe(401);
    });
  });
});
