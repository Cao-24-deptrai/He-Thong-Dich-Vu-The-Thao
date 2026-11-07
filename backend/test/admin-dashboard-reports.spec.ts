import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin Dashboard, 4 Reports & Excel Export APIs', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Login Admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /admin/dashboard/stats: Trả về thống kê tổng hợp KPIs và sức chứa 3 phân hệ', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('bookings');
    expect(res.body).toHaveProperty('occupancy');
    expect(res.body.occupancy).toHaveProperty('gym');
    expect(res.body.occupancy).toHaveProperty('pool');
    expect(res.body.occupancy).toHaveProperty('gaming');
    expect(res.body.activeVenuesCount).toBeGreaterThan(0);
  });

  it('2. GET /admin/reports/revenue-by-sport: Trả về dữ liệu Pie & Bar theo bộ môn', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/reports/revenue-by-sport')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('pieData');
    expect(res.body).toHaveProperty('barData');
    expect(Array.isArray(res.body.pieData)).toBe(true);
    expect(Array.isArray(res.body.barData)).toBe(true);
  });

  it('3. GET /admin/reports/revenue-by-sport/drilldown: Drill-down danh sách chi tiết từng đơn', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/reports/revenue-by-sport/drilldown?sport=SOCCER')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('4. GET /admin/reports/slot-utilization: Tỷ lệ lấp đầy khung giờ & giờ vàng', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/reports/slot-utilization')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('slots');
    expect(res.body).toHaveProperty('peakHourAverageRate');
    expect(Array.isArray(res.body.slots)).toBe(true);
  });

  it('5. GET /admin/reports/wallet-reconciliation: Đối soát số dư Phanta Pay', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/reports/wallet-reconciliation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('pieBreakdown');
    expect(res.body.summary).toHaveProperty('totalTopup');
  });

  it('6. GET /admin/reports/shifts-summary: Báo cáo ca thu ngân & căng tin bán lẻ', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/reports/shifts-summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('canteenBreakdown');
    expect(res.body).toHaveProperty('recentShifts');
  });

  it('7. GET /admin/users: Danh sách người dùng phân trang & STT liên tục', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('totalCount');
    expect(res.body.items[0].stt).toBe(1);
  });

  it('8. GET /admin/venues: Danh sách 16 cụm sân kèm tọa độ 3D', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(16);
    expect(res.body[0]).toHaveProperty('position3D');
  });

  it('9. GET /admin/export/bookings: Xuất toàn bộ danh sách đặt sân ra Excel', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/export/bookings?status=CONFIRMED&sportCategory=SOCCER')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.header['content-type']).toContain('spreadsheetml.sheet');
  });

  it('10. GET /admin/bookings: Bảng sổ cái đặt sân phân trang, tìm kiếm & STT liên tục', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/bookings?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
    if (res.body.items.length > 0) {
      expect(res.body.items[0].stt).toBe(1);
    }

    // Kiểm tra STT liên tục ở trang 2
    const resPage2 = await request(app.getHttpServer())
      .get('/admin/bookings?page=2&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    if (resPage2.body.items.length > 0) {
      expect(resPage2.body.items[0].stt).toBe(6);
    }
  });
});
