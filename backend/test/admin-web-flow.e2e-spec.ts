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
import { JwtService } from '@nestjs/jwt';

describe('Milestone 4: Web Admin Operational Flow (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let jwtService: JwtService;

  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerId: string;

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
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });
    adminToken = adminLoginRes.body.accessToken;

    // Login Staff
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;

    // Register a Customer for testing online vs walk-in
    const custPhone = '0911223344';
    await userModel.deleteOne({ phone: custPhone });
    const custRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: custPhone,
        password: 'User@123456',
        fullName: 'Nguyễn Văn Test Admin Flow',
      });
    customerToken = custRegRes.body.accessToken;
    customerId = custRegRes.body.user.id || custRegRes.body.user._id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  let createdFacilityId: string;
  let createdVenue1Id: string;
  let createdVenue2Id: string;

  describe('4.1 Quản lý Sân & Cơ sở: Tạo Cơ sở và 2 Sân con', () => {
    it('1. Tạo thành công 1 Cơ sở mới qua API Admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'CLB Thể Thao Đa Năng Sài Gòn Admin Test',
          address: '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM',
          sportType: 'FOOTBALL',
          description: 'Sân cỏ nhân tạo FIFA, đèn LED chuẩn thi đấu',
          openHour: '06:00',
          closeHour: '22:00',
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe('CLB Thể Thao Đa Năng Sài Gòn Admin Test');
      expect(res.body.sportTypes).toContain('FOOTBALL');
      createdFacilityId = res.body._id;
    });

    it('2. Tạo thành công Sân con thứ 1 (Sân Futsal 1) có cấu hình Giờ vàng (Peak hour)', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: createdFacilityId,
          name: 'Sân Futsal 1',
          venueType: 'Futsal 5 người',
          defaultPrice: 200000,
          pricingConfig: [
            {
              startTime: '17:00',
              endTime: '21:00',
              price: 350000,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.facilityId).toBe(createdFacilityId);
      expect(res.body.basePricePerHour).toBe(200000);
      expect(res.body.pricingRules.peakHours).toHaveLength(1);
      expect(res.body.pricingRules.peakHours[0].price).toBe(350000);
      createdVenue1Id = res.body._id;
    });

    it('3. Tạo thành công Sân con thứ 2 (Sân Futsal 2) đồng giá tiêu chuẩn', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: createdFacilityId,
          name: 'Sân Futsal 2 VIP',
          venueType: 'Futsal 5 người',
          defaultPrice: 250000,
          pricingConfig: [],
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe('Sân Futsal 2 VIP');
      createdVenue2Id = res.body._id;
    });

    it('4. Kiểm tra danh sách sân và bảng giá theo giờ (Peak vs Standard)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/venues/${createdVenue1Id}/availability?date=2026-10-20`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.slots).toHaveLength(16); // 06:00 to 22:00

      // Standard hour: 08:00 should be 200000
      const slot8 = res.body.slots.find((s: any) => s.startTime === '08:00');
      expect(slot8.price).toBe(200000);

      // Peak hour: 17:00 should be 350000
      const slot17 = res.body.slots.find((s: any) => s.startTime === '17:00');
      expect(slot17.price).toBe(350000);
    });
  });

  describe('4.2 Check-in: Quét QR & Chống quét trùng lặp', () => {
    let confirmedBookingId: string;
    let validQrToken: string;

    beforeAll(async () => {
      // Create a confirmed booking for customer on Venue 1
      const booking = await bookingModel.create({
        userId: customerId,
        venueId: createdVenue1Id,
        bookingDate: '2026-10-20',
        startTime: '10:00',
        endTime: '11:00',
        totalPrice: 200000,
        status: 'CONFIRMED',
        isCheckedIn: false,
      });
      confirmedBookingId = booking._id.toString();

      // Generate dynamic QR token
      const qrRes = await request(app.getHttpServer())
        .get(`/bookings/${confirmedBookingId}/qr`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(qrRes.status).toBe(200);
      expect(qrRes.body.qrToken).toBeDefined();
      validQrToken = qrRes.body.qrToken;
    });

    it('1. Quét Dynamic QR lần 1 -> Thành công (SUCCESS), cập nhật isCheckedIn = true', async () => {
      const res = await request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: validQrToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Check-in thành công');
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.isCheckedIn).toBe(true);
      expect(res.body.booking.checkedInAt).toBeDefined();
    });

    it('2. Quét lại lần 2 -> Thất bại (409 Conflict) báo vé đã được check-in', async () => {
      const res = await request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: validQrToken });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('đã được check-in');
    });

    it('3. Quét mã QR token giả mạo / hết hạn -> Báo lỗi 400', async () => {
      const fakeToken = jwtService.sign(
        { bookingId: confirmedBookingId, timestamp: Date.now() },
        { secret: 'WRONG_SECRET', expiresIn: '60s' },
      );

      const res = await request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: fakeToken });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không hợp lệ');
    });
  });

  describe('4.3 Đặt tại quầy (Walk-in booking) & Xử lý xung đột online', () => {
    it('1. Đặt thử 1 lượt tại quầy thành công cho slot 14:00 - 15:00', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          venueId: createdVenue1Id,
          bookingDate: '2026-10-20',
          startTime: '14:00',
          endTime: '15:00',
          customerName: 'Anh Long Vãng Lai',
          customerPhone: '0933445566',
          paymentMethod: 'CASH',
          note: 'Khách đến quầy thanh toán tiền mặt',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.isWalkIn).toBe(true);
      expect(res.body.customerName).toBe('Anh Long Vãng Lai');
    });

    it('2. Đặt tiếp cùng slot 14:00 - 15:00 -> Báo lỗi xung đột SLOT_ALREADY_TAKEN_ONLINE', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          venueId: createdVenue1Id,
          bookingDate: '2026-10-20',
          startTime: '14:00',
          endTime: '15:00',
          customerName: 'Khách Bị Trùng',
          customerPhone: '0977889900',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode || res.body.error).toBe('SLOT_ALREADY_TAKEN_ONLINE');
    });
  });

  describe('4.4 Xử lý Hoàn tiền (REFUND_PENDING) thủ công', () => {
    let refundBookingId: string;

    beforeAll(async () => {
      // Simulate a booking with REFUND_PENDING (created by late webhook)
      const booking = await bookingModel.create({
        userId: customerId,
        venueId: createdVenue2Id,
        bookingDate: '2026-10-20',
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 250000,
        status: 'REFUND_PENDING',
        isCheckedIn: false,
      });
      refundBookingId = booking._id.toString();
    });

    it('1. Lấy danh sách booking đang chờ hoàn tiền', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/refund-pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const target = res.body.find((b: any) => (b._id || b.bookingId).toString() === refundBookingId);
      expect(target).toBeDefined();
      expect(target.bookingStatus || target.status).toBe('REFUND_PENDING');
      expect(target.amount || target.totalPrice).toBe(250000);
    });

    it('2. Admin xác nhận đã hoàn tiền thủ công -> Chuyển sang REFUNDED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/refund/${refundBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refundNote: 'Đã hoàn 250.000đ qua Vietcombank số GD #VCB998811',
        });

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('REFUNDED');
      expect(res.body.booking.refundNote).toContain('VCB998811');
      expect(res.body.booking.refundedAt).toBeDefined();

      // Verify it is no longer in REFUND_PENDING
      const checkRes = await request(app.getHttpServer())
        .get('/admin/refund-pending')
        .set('Authorization', `Bearer ${adminToken}`);

      const exists = checkRes.body.some((b: any) => (b._id || b.bookingId).toString() === refundBookingId);
      expect(exists).toBe(false);
    });
  });
});
