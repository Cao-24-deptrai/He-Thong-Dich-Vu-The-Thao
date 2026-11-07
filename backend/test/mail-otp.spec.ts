import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { Venue } from '../src/venues/schemas/venue.schema';

describe('Giai đoạn 3.3: Dịch vụ Gửi Email Hóa Đơn VAT & Xác Thực OTP (SMS/Redis)', () => {
  let app: INestApplication;
  let cashierToken: string;
  let bookingModel: Model<Booking>;
  let venueModel: Model<Venue>;
  let sampleBookingId: string;
  let testVenueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));
    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));

    const sampleBooking = await bookingModel.findOne().exec();
    sampleBookingId = sampleBooking?._id.toString() || '66e2c9a1b2c3d4e5f6a7b8c9';

    const sampleVenue = await venueModel.findOne({ isActive: true }).exec();
    testVenueId = sampleVenue?._id.toString() || '6aa7541a288743fb2966037b';

    // Login Cashier
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0900000003', password: 'Admin@123456' });

    cashierToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Phần 1: Dịch vụ Xác Thực OTP (SMS / Redis)', () => {
    const testPhone = '0988776655';
    let receivedOtp: string;

    it('1. POST /auth/otp/send: Sinh mã OTP 6 số lưu Redis với TTL 5 phút (300s)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: testPhone, purpose: 'AUTH' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.expiresInSeconds).toBe(300);
      expect(res.body.otp).toBeDefined();
      expect(res.body.otp).toHaveLength(6);
      receivedOtp = res.body.otp;
    });

    it('2. POST /auth/otp/verify: Thất bại khi nhập sai mã OTP và phản hồi số lần thử còn lại', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: '000000', purpose: 'AUTH' })
        .expect(400);

      expect(res.body.message).toContain('Mã OTP không chính xác');
      expect(res.body.message).toContain('4 lần thử');
    });

    it('3. POST /auth/otp/verify: Thành công khi nhập đúng mã OTP và xóa cache sau khi dùng', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: receivedOtp, purpose: 'AUTH' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('thành công');

      // Thử dùng lại mã vừa verify (chống tấn công Replay)
      const replayRes = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: testPhone, code: receivedOtp, purpose: 'AUTH' })
        .expect(400);

      expect(replayRes.body.message).toContain('hết hạn');
    });

    it('4. Khóa tạm thời 15 phút khi nhập sai liên tiếp 5 lần', async () => {
      const lockoutPhone = '0977112233';

      // Sinh OTP
      await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({ phone: lockoutPhone, purpose: 'AUTH' })
        .expect(201);

      // Nhập sai 5 lần
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/otp/verify')
          .send({ phone: lockoutPhone, code: '111111', purpose: 'AUTH' })
          .expect(400);
      }

      // Lần thứ 6 phải bị khóa
      const lockRes = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: lockoutPhone, code: '111111', purpose: 'AUTH' })
        .expect(400);

      expect(lockRes.body.message).toContain('khóa');
    });
  });

  describe('Phần 2: Dịch vụ Gửi Email Hóa Đơn Điện Tử VAT', () => {
    it('5. POST /mail/test-invoice: Gửi hóa đơn điện tử VAT mẫu qua Sandbox Mail Service', async () => {
      const res = await request(app.getHttpServer())
        .post('/mail/test-invoice')
        .send({ email: 'khachhang@phanta.vn' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBeDefined();
    });

    it('6. POST /mail/invoice: Gửi hóa đơn điện tử dựa trên bookingId thực tế trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .post('/mail/invoice')
        .send({
          bookingId: sampleBookingId,
          email: 'customer.vip@phanta.vn',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.email).toBe('customer.vip@phanta.vn');
      expect(res.body.messageId).toBeDefined();
    });

    it('7. POST /mail/invoice: Báo lỗi 404 khi không tìm thấy bookingId', async () => {
      await request(app.getHttpServer())
        .post('/mail/invoice')
        .send({
          bookingId: '000000000000000000000000',
          email: 'notfound@phanta.vn',
        })
        .expect(404);
    });

    it('8. POST /cashier/walk-in kèm email: Tự động gửi hóa đơn điện tử khi thanh toán quầy', async () => {
      const randomDay = Math.floor(10 + Math.random() * 18);
      const res = await request(app.getHttpServer())
        .post('/cashier/walk-in')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          venueId: testVenueId,
          bookingDate: `2026-11-${randomDay}`,
          startTime: '08:00',
          endTime: '09:30',
          customerName: 'Nguyễn Văn Minh',
          customerPhone: '0912345678',
          customerEmail: 'minh.nguyen@phanta.vn',
          paymentMethod: 'VIETQR',
          discountAmount: 0,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.booking.checkInCode).toBeDefined();
      expect(res.body.receipt.finalTotal).toBeGreaterThan(0);
    });
  });
});
