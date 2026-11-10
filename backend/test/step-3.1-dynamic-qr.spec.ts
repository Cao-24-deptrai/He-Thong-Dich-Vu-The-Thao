import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { User } from '../src/users/schemas/user.schema';
import { BookingStatus, BookingSource, UserRole } from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Bước 3.1: Hoàn thiện Logic Sinh Vé QR Động 60s (Backend E2E)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let userModel: Model<User>;
  let jwtService: JwtService;

  let staffToken: string;
  let adminToken: string;
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  let testFacilityId: string;
  let testVenueId: string;
  let testBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    facilityModel = moduleFixture.get<Model<Facility>>(getModelToken(Facility.name));
    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));
    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // 1. Staff Token
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;

    // 2. Admin Token
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });
    adminToken = adminLoginRes.body.accessToken;

    // 3. User A
    const phoneA = '0931112222';
    await userModel.deleteOne({ phone: phoneA });
    const regResA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneA, password: 'UserA@123456', fullName: 'Nguyễn Văn A' });
    userAToken = regResA.body.accessToken;
    userAId = regResA.body.user.id;

    // 4. User B
    const phoneB = '0933334444';
    await userModel.deleteOne({ phone: phoneB });
    const regResB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneB, password: 'UserB@123456', fullName: 'Trần Thị B' });
    userBToken = regResB.body.accessToken;
    userBId = regResB.body.user.id;

    // 5. Setup Facility & Venue
    const fac = new facilityModel({
      name: 'Sân Test Dynamic QR 60s',
      address: 'Số 1 Mỹ Đình, Hà Nội',
      location: {
        type: 'Point',
        coordinates: [105.7725, 21.0185],
      },
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân Bóng 5 Mini QR',
      type: 'FOOTBALL_5',
      basePricePerHour: 250000,
      isActive: true,
    });
    await ven.save();
    testVenueId = ven._id.toString();
  });

  afterAll(async () => {
    if (testFacilityId) {
      await bookingModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
      await venueModel.deleteMany({ facilityId: new Types.ObjectId(testFacilityId) });
      await facilityModel.deleteMany({ _id: new Types.ObjectId(testFacilityId) });
    }
    await userModel.deleteMany({ phone: { $in: ['0931112222', '0933334444'] } });
    await app.close();
  });

  it('1. Đơn ở trạng thái HELD -> Bị từ chối cấp vé QR (400 PAYMENT_NOT_CONFIRMED)', async () => {
    const booking = new bookingModel({
      bookingCode: 'BK-QR-001',
      userId: new Types.ObjectId(userAId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-10'),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 250000,
      status: BookingStatus.HELD,
      bookingSource: BookingSource.APP,
    });
    await booking.save();
    testBookingId = booking._id.toString();

    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(400);

    expect(res.body.errorCode).toBe('PAYMENT_NOT_CONFIRMED');
    expect(res.body.qrToken).toBeUndefined();
  });

  it('2. Đơn ở trạng thái CANCELLED -> Bị từ chối cấp vé QR (400 PAYMENT_NOT_CONFIRMED)', async () => {
    await bookingModel.updateOne({ _id: new Types.ObjectId(testBookingId) }, { status: BookingStatus.CANCELLED });

    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(400);

    expect(res.body.errorCode).toBe('PAYMENT_NOT_CONFIRMED');
  });

  it('3. Khách B cố lấy vé của Khách A -> Bị từ chối (403 FORBIDDEN)', async () => {
    await bookingModel.updateOne({ _id: new Types.ObjectId(testBookingId) }, { status: BookingStatus.CONFIRMED });

    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(403);

    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('4. Khách chính chủ A lấy vé khi CONFIRMED -> Nhận QR JWT 60s hợp lệ với đầy đủ thông tin vé', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('qrToken');
    expect(res.body.expiresInSeconds).toBe(60);
    expect(res.body.isCheckedIn).toBe(false);
    expect(res.body.bookingCode).toBe('BK-QR-001');
    expect(res.body.ticketCode).toBeDefined();

    // Giải mã JWT để kiểm tra payload nội bộ
    const decoded: any = jwtService.verify(res.body.qrToken);
    expect(decoded.bookingId).toBe(testBookingId);
    expect(decoded.userId).toBe(userAId);
    expect(decoded.ticketCode).toBe(res.body.ticketCode);
    expect(decoded.bookingCode).toBe('BK-QR-001');
    expect(decoded.jti).toBeDefined();
    expect(decoded.issuedAt).toBeDefined();

    // Kiểm tra TTL sống đúng 60 giây (exp - iat === 60)
    expect(decoded.exp - decoded.iat).toBe(60);
  });

  it('5. Lễ tân (STAFF) và Quản lý (ADMIN) có thể lấy vé QR hỗ trợ cho khách tại quầy', async () => {
    // Staff
    const staffRes = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(staffRes.body.qrToken).toBeDefined();

    // Admin
    const adminRes = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminRes.body.qrToken).toBeDefined();
  });

  it('6. Đơn vãng lai Walk-in không có userId -> Staff vẫn lấy được vé QR thành công', async () => {
    const walkInBooking = new bookingModel({
      bookingCode: 'BK-WALKIN-QR',
      userId: null,
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-10'),
      startTime: '19:00',
      endTime: '20:00',
      totalPrice: 250000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.WALK_IN,
      isWalkIn: true,
      customerName: 'Khách Vãng Lai',
      customerPhone: '0900000000',
    });
    await walkInBooking.save();

    const res = await request(app.getHttpServer())
      .get(`/bookings/${walkInBooking._id}/qr`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(res.body.qrToken).toBeDefined();
    expect(res.body.booking.customerName).toBe('Khách Vãng Lai');

    await bookingModel.deleteOne({ _id: walkInBooking._id });
  });

  it('7. Gọi liên tiếp nhiều lần -> Hệ thống xoay vòng (refresh) qrToken mới với jti khác nhau', async () => {
    const res1 = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res1.body.qrToken).not.toBe(res2.body.qrToken);

    const decoded1: any = jwtService.decode(res1.body.qrToken);
    const decoded2: any = jwtService.decode(res2.body.qrToken);
    expect(decoded1.jti).not.toBe(decoded2.jti);

    // Xác nhận database lưu mã qrToken mới nhất
    const inDb = await bookingModel.findById(testBookingId);
    expect(inDb?.qrToken).toBe(res2.body.qrToken);
  });

  it('8. Vé đã check-in vào sân (isCheckedIn = true) -> Từ chối cấp mã QR mới (409 ALREADY_CHECKED_IN)', async () => {
    await bookingModel.updateOne(
      { _id: new Types.ObjectId(testBookingId) },
      { isCheckedIn: true, checkedInAt: new Date() },
    );

    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(409);

    expect(res.body.errorCode).toBe('ALREADY_CHECKED_IN');
    expect(res.body.qrToken).toBeUndefined();
  });

  it('9. Booking ID không tồn tại -> Báo lỗi 404 NOT_FOUND', async () => {
    const nonExistentId = new Types.ObjectId().toString();
    await request(app.getHttpServer())
      .get(`/bookings/${nonExistentId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(404);
  });
});
