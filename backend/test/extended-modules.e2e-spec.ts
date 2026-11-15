import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../src/users/schemas/user.schema';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { Payment } from '../src/payments/schemas/payment.schema';
import { MembershipPass } from '../src/membership-pass/schemas/membership-pass.schema';
import { MatchRequest } from '../src/match-requests/schemas/match-request.schema';
import { VenueType, BookingStatus, PaymentStatus, MembershipPassType, MatchRequestStatus, PaymentProvider } from '../src/common/enums';

describe('Milestone 6: Extended Modules Full Flow (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let paymentModel: Model<Payment>;
  let passModel: Model<MembershipPass>;
  let matchRequestModel: Model<MatchRequest>;

  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerId: string;
  let customer2Token: string;
  let customer2Id: string;
  let customer3Token: string;
  let customer3Id: string;

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
    passModel = moduleFixture.get<Model<MembershipPass>>(getModelToken(MembershipPass.name));
    matchRequestModel = moduleFixture.get<Model<MatchRequest>>(getModelToken(MatchRequest.name));

    // Admin login
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });
    adminToken = adminRes.body.accessToken || adminRes.body.access_token;

    // Staff login
    const staffRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffRes.body.accessToken || staffRes.body.access_token;

    // Register Customer 1
    const rand = Math.floor(Math.random() * 900000) + 100000;
    const phone1 = `091${rand}`;
    const regRes1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: phone1,
        password: 'Pass@123456',
        fullName: 'Nguyễn Văn Gymmer',
        email: `gymmer${rand}@gmail.com`,
      });
    customerToken = regRes1.body.accessToken || regRes1.body.access_token;
    customerId = regRes1.body.user._id || regRes1.body.user.id;

    // Register Customer 2
    const phone2 = `092${rand}`;
    const regRes2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: phone2,
        password: 'Pass@123456',
        fullName: 'Trần Cáp Kèo',
        email: `capkeo${rand}@gmail.com`,
      });
    customer2Token = regRes2.body.accessToken || regRes2.body.access_token;
    customer2Id = regRes2.body.user._id || regRes2.body.user.id;

    // Register Customer 3
    const phone3 = `093${rand}`;
    const regRes3 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: phone3,
        password: 'Pass@123456',
        fullName: 'Lê Cầu Thủ 3',
        email: `player3_${rand}@gmail.com`,
      });
    customer3Token = regRes3.body.accessToken || regRes3.body.access_token;
    customer3Id = regRes3.body.user._id || regRes3.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 6.1 MODULE GYM (MEMBERSHIP PASS)
  // ==========================================
  describe('6.1 Module Gym (MembershipPass)', () => {
    let monthlyPassId: string;
    let singlePassId: string;

    it('1. Khách hàng mua thẻ tập Gym tháng (POST /membership-pass/purchase)', async () => {
      const res = await request(app.getHttpServer())
        .post('/membership-pass/purchase')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          type: MembershipPassType.MONTHLY_PASS,
          paymentProvider: PaymentProvider.PAYOS,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.pass).toBeDefined();
      expect(res.body.pass.type).toBe(MembershipPassType.MONTHLY_PASS);
      expect(res.body.pass.totalCheckIns).toBe(30);
      expect(res.body.pass.remainingCheckIns).toBe(30);
      monthlyPassId = res.body.pass._id;
    });

    it('2. Khách hàng xem danh sách thẻ tập của mình (GET /membership-pass/me)', async () => {
      const res = await request(app.getHttpServer())
        .get('/membership-pass/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const found = res.body.find((p: any) => p._id === monthlyPassId);
      expect(found).toBeDefined();
      expect(found.status).toBe('ACTIVE');
    });

    it('3. Khách hàng xuất mã dynamic QR 60s vào phòng Gym (POST /membership-pass/:id/qr)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/membership-pass/${monthlyPassId}/qr`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(201);
      expect(res.body.qrToken).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(60);
      expect(res.body.remainingCheckIns).toBe(30);

      // Lưu qrToken để quét tại quầy lễ tân
      const qrToken = res.body.qrToken;

      // 4. Lễ tân / Cổng soát vé quẹt mã QR trừ 1 lượt (POST /membership-pass/check-in)
      const checkinRes = await request(app.getHttpServer())
        .post('/membership-pass/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken });

      expect(checkinRes.status).toBe(201);
      expect(checkinRes.body.success).toBe(true);
      expect(checkinRes.body.remainingCheckIns).toBe(29);
    });

    it('5. Quẹt check-in trực tiếp bằng passId tại quầy lễ tân', async () => {
      const res = await request(app.getHttpServer())
        .post('/membership-pass/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ passId: monthlyPassId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.remainingCheckIns).toBe(28);
    });

    it('6. Chặn check-in khi thẻ đã hết số lượt (NO_REMAINING_CHECKINS)', async () => {
      // Mua Single pass (1 lượt)
      const buyRes = await request(app.getHttpServer())
        .post('/membership-pass/purchase')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ type: MembershipPassType.SINGLE_PASS });
      singlePassId = buyRes.body.pass._id;

      // Check-in lần 1 -> Còn 0 lượt
      const check1 = await request(app.getHttpServer())
        .post('/membership-pass/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ passId: singlePassId });
      expect(check1.body.remainingCheckIns).toBe(0);

      // Check-in lần 2 -> Bị từ chối
      const check2 = await request(app.getHttpServer())
        .post('/membership-pass/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ passId: singlePassId });
      expect(check2.status).toBe(400);
      expect(check2.body.errorCode || check2.body.message).toMatch(/NO_REMAINING_CHECKINS/);
    });

    it('7. Chặn check-in khi thẻ đã hết hạn sử dụng (PASS_EXPIRED)', async () => {
      // Giả lập 1 pass đã hết hạn hôm qua
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      const expiredPass = await passModel.create({
        userId: new Types.ObjectId(customerId),
        type: MembershipPassType.MONTHLY_PASS,
        totalCheckIns: 30,
        remainingCheckIns: 20,
        expiryDate: expiredDate,
      });

      const res = await request(app.getHttpServer())
        .post('/membership-pass/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ passId: expiredPass._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.errorCode || check2Message(res.body)).toMatch(/PASS_EXPIRED/);
    });
  });

  // ==========================================
  // 6.2 MODULE ESPORTS & COMBO GIỜ ĐÊM
  // ==========================================
  describe('6.2 Module Esports & Combo Giờ Đêm', () => {
    let esportsFacilityId: string;
    let vipMachineId: string;

    beforeAll(async () => {
      const facility = await facilityModel.create({
        name: 'Cyber Gaming Arena Esports',
        address: 'Số 10 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội',
        location: {
          type: 'Point',
          coordinates: [105.85, 21.02],
        },
        sportTypes: ['ESPORTS'],
        openingHours: { open: '00:00', close: '24:00' },
      });
      esportsFacilityId = facility._id.toString();

      const vipMachine = await venueModel.create({
        facilityId: facility._id,
        name: 'Máy Gaming VIP 01 (i9-14900K / RTX 4090 / 240Hz)',
        type: VenueType.ESPORT_VIP,
        basePricePerHour: 30000,
        pricingRules: {
          nightCombo: {
            enabled: true,
            startTime: '23:00',
            endTime: '06:00',
            comboPrice: 70000,
          },
        },
      });
      vipMachineId = vipMachine._id.toString();
    });

    it('1. Lấy danh sách khung giờ có slot Combo Giờ Đêm (23:00 - 06:00)', async () => {
      const dateStr = '2026-10-01';
      const res = await request(app.getHttpServer())
        .get(`/venues/${vipMachineId}/availability?date=${dateStr}`);

      expect(res.status).toBe(200);
      expect(res.body.slots).toBeDefined();

      const nightComboSlot = res.body.slots.find((s: any) => s.isNightCombo === true);
      expect(nightComboSlot).toBeDefined();
      expect(nightComboSlot.startTime).toBe('23:00');
      expect(nightComboSlot.endTime).toBe('06:00');
      expect(nightComboSlot.price).toBe(70000);
      expect(nightComboSlot.status).toBe('AVAILABLE');
    });

    it('2. Khách hàng giữ chỗ slot Combo Giờ Đêm tính đúng giá trọn gói 70,000 VND', async () => {
      const dateStr = '2026-10-01';
      const res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId: vipMachineId,
          bookingDate: dateStr,
          startTime: '23:00',
          endTime: '06:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.totalPrice).toBe(70000);
      expect(res.body.status).toBe(BookingStatus.HELD);
    });

    it('3. Nhân viên quầy tạo Walk-in Combo Giờ Đêm tính đúng giá trọn gói 70,000 VND', async () => {
      const dateStr = '2026-10-02';
      const res = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          venueId: vipMachineId,
          bookingDate: dateStr,
          startTime: '23:00',
          endTime: '06:00',
          customerName: 'Gamer Thức Đêm',
          customerPhone: '0977665544',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(201);
      expect(res.body.totalPrice).toBe(70000);
      expect(res.body.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  // ==========================================
  // 6.3 MODULE MATCHMAKING (CÁP KÈO THỂ THAO)
  // ==========================================
  describe('6.3 Module Matchmaking (Cáp Kèo)', () => {
    let matchId: string;

    it('1. User 1 đăng bài tìm 2 đồng đội đá bóng (POST /match-requests)', async () => {
      const res = await request(app.getHttpServer())
        .post('/match-requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sportType: 'FOOTBALL',
          matchDate: '2026-10-15T19:00:00.000Z',
          locationDescription: 'Sân Chùa Láng sân 7, cần 2 bạn đá tiền vệ',
          slotsNeeded: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.sportType).toBe('FOOTBALL');
      expect(res.body.slotsNeeded).toBe(2);
      expect(res.body.slotsFilled).toBe(0);
      expect(res.body.status).toBe(MatchRequestStatus.OPEN);
      matchId = res.body._id;
    });

    it('2. Khách hàng duyệt danh sách kèo mở (GET /match-requests)', async () => {
      const res = await request(app.getHttpServer())
        .get('/match-requests?sportType=FOOTBALL');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((m: any) => m._id === matchId);
      expect(found).toBeDefined();
      expect(found.status).toBe(MatchRequestStatus.OPEN);
    });

    it('3. User 2 tham gia kèo thành công (POST /match-requests/:id/join)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/match-requests/${matchId}/join`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.slotsFilled).toBe(1);
      expect(res.body.status).toBe(MatchRequestStatus.OPEN);
    });

    it('4. Chặn User 2 tham gia lại lần 2 (Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/match-requests/${matchId}/join`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(409);
    });

    it('5. Chặn Creator tự tham gia kèo của chính mình', async () => {
      const res = await request(app.getHttpServer())
        .post(`/match-requests/${matchId}/join`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
    });

    it('6. User 3 tham gia -> Đủ slot (2/2) tự động chuyển sang status = FULL', async () => {
      const res = await request(app.getHttpServer())
        .post(`/match-requests/${matchId}/join`)
        .set('Authorization', `Bearer ${customer3Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.slotsFilled).toBe(2);
      expect(res.body.status).toBe(MatchRequestStatus.FULL);
    });

    it('7. Người khác cố tham gia kèo đã FULL -> Bị chặn 400', async () => {
      const randPhone = `094${Math.floor(Math.random() * 900000) + 100000}`;
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: randPhone,
          password: 'Pass@123456',
          fullName: 'Người Chơi Trễ',
        });
      const lateToken = regRes.body.accessToken || regRes.body.access_token;

      const res = await request(app.getHttpServer())
        .post(`/match-requests/${matchId}/join`)
        .set('Authorization', `Bearer ${lateToken}`);

      expect(res.status).toBe(400);
    });

    it('8. Người tạo kèo hủy bài đăng (POST /match-requests/:id/cancel)', async () => {
      // Tạo kèo mới rồi hủy
      const newMatch = await request(app.getHttpServer())
        .post('/match-requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sportType: 'BADMINTON',
          matchDate: '2026-10-20T18:00:00.000Z',
          slotsNeeded: 1,
        });

      const cancelRes = await request(app.getHttpServer())
        .post(`/match-requests/${newMatch.body._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect([200, 201]).toContain(cancelRes.status);
      expect(cancelRes.body.status).toBe(MatchRequestStatus.CLOSED);
    });
  });

  // ==========================================
  // 6.4 CỔNG THANH TOÁN THỨ 2 (MOMO)
  // ==========================================
  describe('6.4 Cổng thanh toán thứ 2 (MoMo)', () => {
    it('Khách hàng chọn thanh toán qua MoMo (POST /payments/create-link với provider=MOMO)', async () => {
      // Tạo 1 venue bóng đá để test
      const facility = await facilityModel.create({
        name: 'Sân Cỏ Đẹp',
        address: 'Hà Nội',
        location: {
          type: 'Point',
          coordinates: [105.85, 21.02],
        },
        sportTypes: ['FOOTBALL'],
      });
      const venue = await venueModel.create({
        facilityId: facility._id,
        name: 'Sân 5 số 1',
        type: VenueType.FOOTBALL_5,
        basePricePerHour: 200000,
      });

      // Giữ chỗ
      const holdRes = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId: venue._id.toString(),
          bookingDate: '2026-10-10',
          startTime: '08:00',
          endTime: '09:00',
        });

      const bookingId = holdRes.body._id;

      // Gọi tạo link với provider = MOMO
      const paymentRes = await request(app.getHttpServer())
        .post('/payments/create-link')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId,
          provider: 'MOMO',
        });

      expect([200, 201]).toContain(paymentRes.status);
      expect(paymentRes.body.provider).toBe('MOMO');
      expect(paymentRes.body.checkoutUrl).toContain('momo.vn');
      expect(paymentRes.body.qrCode).toBeDefined();
    });
  });

  // ==========================================
  // 6.5 AUTO-REFUND API (MỤC 6.5)
  // ==========================================
  describe('6.5 Auto-Refund API', () => {
    it('Admin thực hiện Auto-Refund tự động gọi cổng thanh toán (POST /admin/refund/:id/auto)', async () => {
      // Tạo 1 booking có status = REFUND_PENDING
      const venue = await venueModel.findOne();
      const lateBooking = await bookingModel.create({
        userId: new Types.ObjectId(customerId),
        venueId: venue?._id,
        bookingDate: new Date('2026-10-11T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        totalPrice: 200000,
        status: BookingStatus.REFUND_PENDING,
      });

      const latePayment = await paymentModel.create({
        bookingId: lateBooking._id,
        amount: 200000,
        provider: PaymentProvider.PAYOS,
        transactionId: `PAYOS_TX_${Date.now()}`,
        status: PaymentStatus.REFUND_PENDING,
      });

      // Gọi API Auto-Refund
      const autoRefundRes = await request(app.getHttpServer())
        .post(`/admin/refund/${lateBooking._id}/auto`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Hoàn tiền tự động webhook trễ qua cổng PayOS' });

      expect(autoRefundRes.status).toBe(201);
      expect(autoRefundRes.body.success).toBe(true);
      expect(autoRefundRes.body.bookingStatus).toBe(BookingStatus.REFUNDED);
      expect(autoRefundRes.body.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(autoRefundRes.body.refundTransactionId).toBeDefined();

      // Kiểm tra trong DB
      const updatedBooking = await bookingModel.findById(lateBooking._id);
      expect(updatedBooking?.status).toBe(BookingStatus.REFUNDED);
      expect(updatedBooking?.refundedAt).toBeDefined();

      const updatedPayment = await paymentModel.findOne({ bookingId: lateBooking._id });
      expect(updatedPayment?.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});

function check2Message(body: any): string {
  return body?.message || body?.errorCode || '';
}
