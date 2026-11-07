import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../src/orders/schemas/order.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';

describe('Giai đoạn 3.4: Hai Chức Năng In Ấn Nhiệt 80mm Quầy Thu Ngân', () => {
  let app: INestApplication;
  let cashierToken: string;
  let orderModel: Model<Order>;
  let bookingModel: Model<Booking>;
  let testOrderId: string;
  let testOrderCode: string;
  let testBookingId: string;
  let testCheckInCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    orderModel = moduleFixture.get<Model<Order>>(getModelToken(Order.name));
    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));

    // Lấy 1 đơn hàng POS mẫu
    const sampleOrder = await orderModel.findOne().exec();
    testOrderId = sampleOrder?._id.toString() || '66e2c9a1b2c3d4e5f6a7b8c9';
    testOrderCode = sampleOrder?.orderCode || 'HD-20261026-001';

    // Lấy 1 đơn đặt sân mẫu
    const sampleBooking = await bookingModel.findOne().exec();
    testBookingId = sampleBooking?._id.toString() || '66e2c9a1b2c3d4e5f6a7b8a1';
    testCheckInCode = sampleBooking?.checkInCode || 'PHANTA-BK1001';

    // Login Cashier
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0900000003', password: 'Admin@123456' });

    cashierToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Chức năng In 1: Hóa Đơn Thanh Toán Bán Lẻ POS / Căng Tin (Khổ 80mm)', () => {
    it('1. GET /cashier/receipt/:orderId/print-data: Trả về dữ liệu in hóa đơn POS theo ObjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cashier/receipt/${testOrderId}/print-data`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.type).toBe('POS_ORDER');
      expect(res.body.storeInfo.name).toContain('PHANTA');
      expect(res.body.title).toBe('HÓA ĐƠN THANH TOÁN BÁN LẺ');
      expect(res.body.invoiceNo).toBeDefined();
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.finalTotal).toBeGreaterThan(0);
      expect(res.body.finalTotalFormatted).toContain('đ');
      expect(res.body.barcodeText).toBeDefined();
      expect(res.body.qrLookupCode).toBeDefined();
    });

    it('2. GET /cashier/receipt/:orderCode/print-data: Trả về dữ liệu in hóa đơn khi tra cứu bằng orderCode', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cashier/receipt/${testOrderCode}/print-data`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.type).toBe('POS_ORDER');
      expect(res.body.invoiceNo).toBe(`#${testOrderCode}`);
      expect(res.body.finalTotalFormatted).toBeDefined();
    });

    it('3. GET /cashier/receipt/:bookingId/print-data: Tự động hỗ trợ in hóa đơn từ mã đặt sân thể thao', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cashier/receipt/${testBookingId}/print-data`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.type).toBe('BOOKING_INVOICE');
      expect(res.body.title).toBe('HÓA ĐƠN ĐẶT SÂN VÀ DỊCH VỤ THỂ THAO');
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.finalTotal).toBeGreaterThan(0);
    });

    it('4. Báo lỗi 404 khi không tìm thấy hóa đơn cần in', async () => {
      await request(app.getHttpServer())
        .get('/cashier/receipt/000000000000000000000000/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(404);
    });
  });

  describe('Chức năng In 2: Phiếu Vé Cứng Có Mã QR Cổng Xoay Turnstile (Khổ 80mm)', () => {
    it('5. GET /cashier/ticket/:bookingId/print-data: Trả về dữ liệu vé cứng có mã QR theo ObjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cashier/ticket/${testBookingId}/print-data`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.type).toBe('ENTRY_TICKET');
      expect(res.body.ticketTitle).toBe('PHIẾU VÉ VÀO SÂN THỂ THAO');
      expect(res.body.checkInCode).toBeDefined();
      expect(res.body.qrData).toBeDefined();
      expect(res.body.venue.name).toBeDefined();
      expect(res.body.schedule.timeSlot).toBeDefined();
      expect(res.body.instructions).toBeInstanceOf(Array);
      expect(res.body.instructions.length).toBeGreaterThanOrEqual(3);
    });

    it('6. GET /cashier/ticket/:checkInCode/print-data: Trả về dữ liệu vé cứng khi tra cứu bằng checkInCode', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cashier/ticket/${testCheckInCode}/print-data`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.type).toBe('ENTRY_TICKET');
      expect(res.body.checkInCode).toBe(testCheckInCode);
      expect(res.body.statusText).toBeDefined();
    });

    it('7. Báo lỗi 404 khi mã vé không tồn tại trong hệ thống', async () => {
      await request(app.getHttpServer())
        .get('/cashier/ticket/PHANTA-NOTFOUND-9999/print-data')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(404);
    });

    it('8. Chặn truy cập 401 khi không có token xác thực', async () => {
      await request(app.getHttpServer())
        .get(`/cashier/ticket/${testBookingId}/print-data`)
        .expect(401);
    });
  });
});
