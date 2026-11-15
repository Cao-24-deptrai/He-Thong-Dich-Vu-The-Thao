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
import { BookingStatus, BookingSource } from '../src/common/enums';

describe('Changelog Item 2: Siết Chặt Logic Vé QR - Trả Tiền Mới Có Vé (e2e)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let userModel: Model<User>;

  let staffToken: string;
  let userAToken: string;
  let userAId: string;
  let userBToken: string;

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

    // Staff Token
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;

    // User A
    const phoneA = '0919191919';
    await userModel.deleteOne({ phone: phoneA });
    const regResA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneA, password: 'UserA@123456', fullName: 'Khách Hàng A' });
    userAToken = regResA.body.accessToken;
    userAId = regResA.body.user.id;

    // User B
    const phoneB = '0928282828';
    await userModel.deleteOne({ phone: phoneB });
    const regResB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneB, password: 'UserB@123456', fullName: 'Khách Hàng B' });
    userBToken = regResB.body.accessToken;

    // Setup 1 Facility & 1 Venue
    const fac = new facilityModel({
      name: 'Sân Test Vé QR',
      address: 'TP.HCM',
      location: {
        type: 'Point',
        coordinates: [106.660172, 10.762622],
      },
      sportTypes: ['FOOTBALL'],
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân 1',
      type: 'FOOTBALL_5',
      basePricePerHour: 200000,
      isActive: true,
    });
    await ven.save();
    testVenueId = ven._id.toString();
  });

  afterAll(async () => {
    if (testBookingId) {
      await bookingModel.deleteMany({ _id: new Types.ObjectId(testBookingId) });
    }
    if (testVenueId) {
      await venueModel.deleteMany({ _id: new Types.ObjectId(testVenueId) });
    }
    if (testFacilityId) {
      await facilityModel.deleteMany({ _id: new Types.ObjectId(testFacilityId) });
    }
    await userModel.deleteMany({ phone: { $in: ['0919191919', '0928282828'] } });
    await app.close();
  });

  it('1. Tạo booking ở trạng thái HELD -> Không được phép cấp mã QR (400 PAYMENT_NOT_CONFIRMED)', async () => {
    const booking = new bookingModel({
      userId: new Types.ObjectId(userAId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(),
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 200000,
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

  it('2. Khách B cố lấy vé của Khách A -> Bị từ chối quyền (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(403);

    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('3. Đơn đã thanh toán (CONFIRMED) -> Cấp mã QR token JWT động thành công', async () => {
    // Chuyển đơn sang CONFIRMED
    await bookingModel.updateOne({ _id: new Types.ObjectId(testBookingId) }, { status: BookingStatus.CONFIRMED });

    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('qrToken');
    expect(res.body.expiresInSeconds).toBe(60);
    expect(res.body.isCheckedIn).toBe(false);

    const validQrToken = res.body.qrToken;

    // Staff quét check-in mã này thành công
    const scanRes = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: validQrToken })
      .expect(200);

    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.booking.isCheckedIn).toBe(true);
  });

  it('4. Vé đã check-in vào sân (isCheckedIn = true) -> Chặn sinh mã QR mới (409 ALREADY_CHECKED_IN)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/${testBookingId}/qr`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(409);

    expect(res.body.errorCode).toBe('ALREADY_CHECKED_IN');
    expect(res.body.qrToken).toBeUndefined();
  });
});
