import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Giai đoạn 3.1: Quản Lý & Chốt Ca Thu Ngân (Shifts Handover & Cash Drawer)', () => {
  let app: INestApplication;
  let cashierToken: string;
  let currentShiftId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Login với tài khoản Thu Ngân đã seed (0900000003)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0900000003', password: 'Admin@123456' });

    cashierToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /cashier/shift/current: Lấy thông tin ca hiện tại đang mở & tính toán doanh thu thực tế', async () => {
    const res = await request(app.getHttpServer())
      .get('/cashier/shift/current')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('active');
    if (res.body.active) {
      expect(res.body.shift).toHaveProperty('shiftCode');
      expect(res.body.shift).toHaveProperty('initialCash');
      expect(res.body.shift).toHaveProperty('expectedCash');
      currentShiftId = res.body.shift._id;
    }
  });

  it('2. POST /cashier/shift/close: Chốt ca thu ngân, kiểm đếm 9 mệnh giá và tính tiền chênh lệch', async () => {
    // Nếu có ca đang mở thì chốt, nếu không có thì mở rồi chốt
    if (!currentShiftId) {
      const openRes = await request(app.getHttpServer())
        .post('/cashier/shift/open')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ initialCash: 2000000, notes: 'Mở ca kiểm thử' })
        .expect(201);
      currentShiftId = openRes.body.shift._id;
    }

    const denominations = {
      '500000': 6,  // 3.000.000
      '200000': 5,  // 1.000.000
      '100000': 10, // 1.000.000
      '50000': 10,  // 500.000
      '20000': 15,  // 300.000
      '10000': 4,   // 40.000
      '5000': 2,    // 10.000
      '2000': 0,
      '1000': 0,
    };
    const actualCash = 5850000;

    const res = await request(app.getHttpServer())
      .post('/cashier/shift/close')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        shiftId: currentShiftId,
        actualCash,
        denominations,
        notes: 'Chốt ca kiểm thử thành công',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('actualCash', actualCash);
    expect(res.body.summary).toHaveProperty('difference');
    expect(res.body.shift.status).toBe('CLOSED');
  });

  it('3. POST /cashier/shift/open: Mở ca thu ngân mới thành công sau khi ca cũ đã đóng', async () => {
    const res = await request(app.getHttpServer())
      .post('/cashier/shift/open')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        initialCash: 2500000,
        notes: 'Mở ca chiều lúc 14:00',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.shift).toHaveProperty('shiftCode');
    expect(res.body.shift.initialCash).toBe(2500000);
    expect(res.body.shift.status).toBe('OPEN');
    currentShiftId = res.body.shift._id;
  });

  it('4. POST /cashier/shift/open: Chặn mở trùng ca khi đã có ca OPEN', async () => {
    const res = await request(app.getHttpServer())
      .post('/cashier/shift/open')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        initialCash: 1000000,
      })
      .expect(400);

    expect(res.body.message).toContain('Đã có ca làm việc đang mở');
  });

  it('5. GET /cashier/shift/history: Lấy danh sách lịch sử ca làm việc', async () => {
    const res = await request(app.getHttpServer())
      .get('/cashier/shift/history?page=1&limit=5')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('totalCount');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toHaveProperty('stt', 1);
  });

  it('6. GET /cashier/shift/:id/report-data: Dữ liệu in biên bản chốt ca 80mm', async () => {
    const res = await request(app.getHttpServer())
      .get(`/cashier/shift/${currentShiftId}/report-data`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('companyName');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('shiftCode');
    expect(res.body).toHaveProperty('initialCash');
    expect(res.body).toHaveProperty('denominations');
  });
});
