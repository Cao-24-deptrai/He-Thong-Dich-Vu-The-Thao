import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Giai đoạn 2.4: Hai Chức Năng In Ấn (Hóa Đơn Bán Lẻ POS & Vé Cổng Xoay Turnstile 80mm)', () => {
  let app: INestApplication;
  let cashierToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Login tài khoản Thu Ngân đã seed (0900000003)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0900000003', password: 'Admin@123456' });

    cashierToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Chức năng In 1: Hóa Đơn Thanh Toán Bán Lẻ POS (GET /cashier/receipt/:orderId/print-data)', () => {
    it('1. Tra cứu theo orderCode không có tiền tố # (HD-20261026-001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/receipt/HD-20261026-001/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'POS_ORDER');
      expect(res.body).toHaveProperty('storeInfo');
      expect(res.body.storeInfo).toHaveProperty('name', 'TỔ HỢP THỂ THAO VÀ GIẢI TRÍ PHANTA');
      expect(res.body).toHaveProperty('invoiceNo', '#HD-20261026-001');
      expect(res.body).toHaveProperty('subtotal');
      expect(res.body).toHaveProperty('vatRate', 8);
      expect(res.body).toHaveProperty('finalTotal');
      expect(res.body).toHaveProperty('barcodeText');
      expect(res.body).toHaveProperty('qrLookupCode');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('2. Tra cứu linh hoạt theo orderCode có dấu # (#HD-20261026-001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/receipt/%23HD-20261026-001/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.invoiceNo).toBe('#HD-20261026-001');
      expect(res.body.finalTotal).toBeGreaterThan(0);
    });

    it('3. Tra cứu hóa đơn dịch vụ đặt sân bằng checkInCode (PHANTA-BK1001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/receipt/PHANTA-BK1001/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'BOOKING_INVOICE');
      expect(res.body).toHaveProperty('invoiceNo', '#PHANTA-BK1001');
      expect(res.body).toHaveProperty('vatRate', 8);
      expect(res.body.finalTotal).toBeGreaterThan(0);
    });

    it('4. Báo lỗi 404 khi tra cứu đơn hàng không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/receipt/HD-NONEXISTENT-9999/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy thông tin đơn hàng');
    });
  });

  describe('Chức năng In 2: Phiếu Vé Cứng Cổng Xoay Turnstile (GET /cashier/ticket/:bookingId/print-data)', () => {
    it('5. Tra cứu phiếu vé theo checkInCode chuẩn (PHANTA-BK1001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/ticket/PHANTA-BK1001/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'ENTRY_TICKET');
      expect(res.body).toHaveProperty('ticketTitle', 'PHIẾU VÉ VÀO SÂN THỂ THAO');
      expect(res.body).toHaveProperty('checkInCode', 'PHANTA-BK1001');
      expect(res.body).toHaveProperty('qrData');
      expect(res.body.qrData).toContain('PHANTA');

      // Chuẩn hóa Typography 2 dòng
      expect(res.body).toHaveProperty('venue');
      expect(res.body.venue).toHaveProperty('line1');
      expect(res.body.venue).toHaveProperty('line2');
      expect(res.body.venue.line1.length).toBeGreaterThan(0);
      expect(res.body.venue.line2).not.toContain('•');
      expect(res.body.venue.line2).not.toContain('&bull;');

      // Lịch thi đấu & 4 điều khoản vào sân
      expect(res.body).toHaveProperty('schedule');
      expect(res.body.schedule).toHaveProperty('timeSlot');
      expect(Array.isArray(res.body.instructions)).toBe(true);
      expect(res.body.instructions.length).toBe(4);
      expect(res.body.instructions[0]).toContain('Turnstile');
    });

    it('6. Tra cứu linh hoạt theo mã vé có tiền tố # (#PHANTA-BK1001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/ticket/%23PHANTA-BK1001/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.checkInCode).toBe('PHANTA-BK1001');
      expect(res.body.statusText).toBeDefined();
    });

    it('7. Báo lỗi 404 khi tra cứu vé không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get('/cashier/ticket/PHANTA-UNKNOWN-9999/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy thông tin vé đặt sân');
    });
  });
});
