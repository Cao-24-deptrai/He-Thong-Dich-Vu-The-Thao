import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../src/users/schemas/user.schema';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { Payment } from '../src/payments/schemas/payment.schema';
import { VenueType, BookingStatus, PaymentStatus } from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Milestone 5: Mobile App Full Flow (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let paymentModel: Model<Payment>;
  let jwtService: JwtService;

  let staffToken: string;
  let customerToken: string;
  let customerId: string;
  let testFacilityId: string;
  let testVenueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    facilityModel = moduleFixture.get<Model<Facility>>(getModelToken(Facility.name));
    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));
    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));
    paymentModel = moduleFixture.get<Model<Payment>>(getModelToken(Payment.name));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Login Staff (for check-in scanning on Web Admin)
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;

    // Setup Test Facility & Venue
    const fac = await facilityModel.create({
      name: 'Tổ Hợp Thể Thao Olympic Mobile Test',
      address: '100 Điện Biên Phủ, Bình Thạnh, TP.HCM',
      location: { type: 'Point', coordinates: [106.70098, 10.79361] },
      sportTypes: ['FOOTBALL', 'BADMINTON'],
    });
    testFacilityId = fac._id.toString();

    const ven = await venueModel.create({
      facilityId: fac._id,
      name: 'Sân Cầu Lông Số 1 VIP',
      type: VenueType.BADMINTON,
      basePricePerHour: 150000,
      pricingRules: {
        peakHours: [
          {
            startTime: '18:00',
            endTime: '21:00',
            price: 220000,
          },
        ],
      },
    });
    testVenueId = ven._id.toString();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('5.1 Mobile Auth: Đăng ký & Đăng nhập Khách Hàng (CUSTOMER)', () => {
    const custPhone = '0966778899';

    it('1. Đăng ký tài khoản khách hàng mới trên Mobile App', async () => {
      await userModel.deleteOne({ phone: custPhone });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: custPhone,
          password: 'MobileUser@123',
          fullName: 'Trần Văn Mobile',
          email: 'tranvanmobile@gmail.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.phone).toBe(custPhone);
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('2. Đăng nhập tài khoản khách hàng trên Mobile App', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: custPhone,
          password: 'MobileUser@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      customerToken = res.body.accessToken;
      customerId = res.body.user.id || res.body.user._id;
    });
  });

  describe('5.2 Khám phá Sân & Time-slot Grid trực quan (06:00 - 22:00)', () => {
    it('1. Khách hàng duyệt danh sách tổ hợp sân và lọc theo môn thể thao', async () => {
      const res = await request(app.getHttpServer())
        .get('/facilities?sportType=BADMINTON');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const fac = res.body.find((f: any) => f._id === testFacilityId);
      expect(fac).toBeDefined();
    });

    it('2. Khách hàng xem danh sách sân con thuộc tổ hợp', async () => {
      const res = await request(app.getHttpServer())
        .get(`/venues?facilityId=${testFacilityId}`);

      expect(res.status).toBe(200);
      expect(res.body.some((v: any) => v._id === testVenueId)).toBe(true);
    });

    it('3. Khách hàng xem lưới 16 khung giờ với giá giờ cao điểm (Peak hour)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/venues/${testVenueId}/availability?date=2026-11-15`);

      expect(res.status).toBe(200);
      expect(res.body.slots).toHaveLength(16);

      // Slot thường (10:00) -> 150.000 đ
      const slot10 = res.body.slots.find((s: any) => s.startTime === '10:00');
      expect(slot10.price).toBe(150000);
      expect(slot10.status).toBe('AVAILABLE');

      // Slot cao điểm (19:00) -> 220.000 đ
      const slot19 = res.body.slots.find((s: any) => s.startTime === '19:00');
      expect(slot19.price).toBe(220000);
    });
  });

  let heldBookingId: string;

  describe('5.3 Giữ chỗ 10 phút & Luồng Thanh Toán VietQR PayOS', () => {
    const bookingDate = '2026-11-15';
    const startTime = '19:00';
    const endTime = '20:00';

    it('1. Khách hàng bấm giữ chỗ slot 19:00 - 20:00 (POST /bookings/hold)', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId: testVenueId,
          bookingDate,
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.status).toBe(BookingStatus.HELD);
      expect(res.body.totalPrice).toBe(220000); // Peak price applied!
      expect(res.body.holdExpiresAt).toBeDefined();

      heldBookingId = res.body._id;
    });

    it('2. Chống đặt trùng: Khách hàng khác cố giữ cùng slot này -> Bị chặn 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId: testVenueId,
          bookingDate,
          startTime,
          endTime,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Khung giờ này đã có người giữ chỗ hoặc đặt thành công');
    });

    it('3. Khách hàng tạo link thanh toán VietQR PayOS (POST /payments/create-link)', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments/create-link')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: heldBookingId });

      expect([200, 201]).toContain(res.status);
      expect(res.body.checkoutUrl).toBeDefined();
      expect(res.body.qrCode).toBeDefined();
      expect(res.body.amount).toBe(220000);
    });

    it('4. Cổng thanh toán PayOS gửi Webhook xác nhận giao dịch thành công', async () => {
      const uniqueTxn = `FT_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const res = await request(app.getHttpServer())
        .post('/payments/webhook')
        .send({
          code: '00',
          desc: 'Thành công',
          data: {
            orderCode: Math.floor(Math.random() * 900000) + 100000,
            amount: 220000,
            description: `Thanh toan don dat san ${heldBookingId}`,
            accountNumber: '1122334455',
            reference: uniqueTxn,
            transactionDateTime: new Date().toISOString(),
            idempotencyKey: uniqueTxn,
          },
        });

      expect(res.status).toBe(200);

      // Verify booking is now CONFIRMED
      const bookingInDb = await bookingModel.findById(heldBookingId);
      expect(bookingInDb?.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('5.4 Vé Dynamic QR 60s & Quét Check-in tại Web Admin', () => {
    let dynamicQrToken: string;

    it('1. Mobile App lấy mã Dynamic QR hợp lệ 60 giây (GET /bookings/:id/qr)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/${heldBookingId}/qr`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.qrToken).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(60);
      expect(res.body.isCheckedIn).toBe(false);

      dynamicQrToken = res.body.qrToken;
    });

    it('2. Lễ tân quét QR trên Web Admin (POST /checkin/scan) -> SUCCESS màu xanh', async () => {
      const res = await request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: dynamicQrToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Check-in thành công');
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.isCheckedIn).toBe(true);
      expect(res.body.booking.checkedInAt).toBeDefined();
    });

    it('3. Chống quét trùng: Quét lại mã vé lần 2 -> Bị từ chối (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: dynamicQrToken });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('đã được check-in');
    });
  });

  describe('5.5 Lịch sử đặt chỗ & Hủy đơn (Mục 5.4)', () => {
    it('1. Khách hàng xem lịch sử các đơn đặt chỗ của mình (GET /bookings/me)', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const myBooking = res.body.find((b: any) => b._id === heldBookingId);
      expect(myBooking).toBeDefined();
      expect(myBooking.isCheckedIn).toBe(true);
    });

    it('2. Khách hàng giữ chỗ và hủy đơn thành công (POST /bookings/:id/cancel)', async () => {
      // Create a new held booking for cancellation test
      const holdRes = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId: testVenueId,
          bookingDate: '2026-11-15',
          startTime: '07:00',
          endTime: '08:00',
        });
      expect(holdRes.status).toBe(201);
      const cancelTargetId = holdRes.body._id;

      // Cancel the booking
      const cancelRes = await request(app.getHttpServer())
        .post(`/bookings/${cancelTargetId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe(BookingStatus.CANCELLED);

      // Verify slot is now available again
      const availRes = await request(app.getHttpServer())
        .get(`/venues/${testVenueId}/availability?date=2026-11-15`);
      const slot7 = availRes.body.slots.find((s: any) => s.startTime === '07:00');
      expect(slot7.status).toBe('AVAILABLE');
    });
  });
});
