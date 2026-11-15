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

describe('Changelog Item 3: Operating Hours, Cancellation Policy & User APIs (e2e)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let userModel: Model<User>;

  let userToken: string;
  let userId: string;
  let otherUserToken: string;

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

    facilityModel = moduleFixture.get<Model<Facility>>(getModelToken(Facility.name));
    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));
    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));

    // Register User
    const phone = '0933333333';
    await userModel.deleteOne({ phone });
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone, password: 'User@123456', fullName: 'Khách Hàng Chính' });
    userToken = regRes.body.accessToken;
    userId = regRes.body.user.id;

    // Register Other User
    const otherPhone = '0944444444';
    await userModel.deleteOne({ phone: otherPhone });
    const otherRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: otherPhone, password: 'Other@123456', fullName: 'Khách Hàng Khác' });
    otherUserToken = otherRegRes.body.accessToken;

    // Setup Facility
    const fac = new facilityModel({
      name: 'Tổ Hợp Policy Test',
      address: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.66, 10.76] },
      sportTypes: ['FOOTBALL'],
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    // Setup Venue with custom operatingHours (08:00 - 20:00) and cancellationPolicy (24h full, 2h no)
    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân Giờ Hoạt Động Riêng',
      type: 'FOOTBALL_5',
      basePricePerHour: 300000,
      operatingHours: { openTime: '08:00', closeTime: '20:00' },
      slotDurationMinutes: 60,
      cancellationPolicy: { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 },
      isActive: true,
    });
    await ven.save();
    testVenueId = ven._id.toString();
  });

  afterAll(async () => {
    if (testVenueId) {
      await bookingModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
      await venueModel.deleteMany({ _id: new Types.ObjectId(testVenueId) });
    }
    if (testFacilityId) {
      await facilityModel.deleteMany({ _id: new Types.ObjectId(testFacilityId) });
    }
    await userModel.deleteMany({ phone: { $in: ['0933333333', '0944444444'] } });
    await app.close();
  });

  it('1. PATCH /users/fcm-token - Lưu fcmToken cho push notifications', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/fcm-token')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ fcmToken: 'fcm_mock_device_token_xyz987' })
      .expect(200);

    expect(res.body.fcmToken).toBe('fcm_mock_device_token_xyz987');

    const dbUser = await userModel.findById(userId);
    expect(dbUser?.fcmToken).toBe('fcm_mock_device_token_xyz987');
  });

  it('2. PATCH /users/me - Cập nhật thông tin cá nhân (fullName, email)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fullName: 'Nguyễn Văn Đã Cập Nhật',
        email: 'nguyenvandacapnhat@example.com',
      })
      .expect(200);

    expect(res.body.fullName).toBe('Nguyễn Văn Đã Cập Nhật');
    expect(res.body.email).toBe('nguyenvandacapnhat@example.com');
  });

  it('3. GET /venues/:id/availability - Lưới giờ sinh động theo operatingHours (08:00 - 20:00)', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const res = await request(app.getHttpServer())
      .get(`/venues/${testVenueId}/availability?date=${todayStr}`)
      .expect(200);

    expect(res.body.slots).toBeDefined();
    // 08:00 đến 20:00 có đúng 12 slots (8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)
    expect(res.body.slots.length).toBe(12);
    expect(res.body.slots[0].startTime).toBe('08:00');
    expect(res.body.slots[res.body.slots.length - 1].startTime).toBe('19:00');
  });

  it('4. POST /bookings/:id/cancel - Chặn người dùng khác hủy đơn (403 Forbidden)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const booking = new bookingModel({
      userId: new Types.ObjectId(userId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
    });
    await booking.save();

    // Khách khác cố hủy đơn -> 403 Forbidden
    const res = await request(app.getHttpServer())
      .post(`/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);

    expect(res.body.errorCode).toBe('FORBIDDEN');

    // Dọn dẹp
    await bookingModel.deleteOne({ _id: booking._id });
  });

  it('5. POST /bookings/:id/cancel - Hoàn tiền 100% khi hủy trước >= 24h', async () => {
    // Booking 3 ngày tới (chắc chắn > 24h)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const booking = new bookingModel({
      userId: new Types.ObjectId(userId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: futureDate,
      startTime: '14:00',
      endTime: '15:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
    });
    await booking.save();

    const res = await request(app.getHttpServer())
      .post(`/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.status).toBe(BookingStatus.CANCELLED);
    expect(res.body.refundRate).toBe(1.0);
    expect(res.body.refundAmount).toBe(300000);

    await bookingModel.deleteOne({ _id: booking._id });
  });

  it('6. POST /bookings/:id/cancel - Không hoàn tiền (0%) khi hủy sát giờ <= 2h', async () => {
    // Booking hôm nay, cách thời điểm hiện tại 30 phút
    const today = new Date();
    const nowHour = today.getHours();
    const startHourStr = (nowHour >= 23 ? 23 : nowHour + 1).toString().padStart(2, '0');
    const endHourStr = (nowHour >= 23 ? 23 : nowHour + 2).toString().padStart(2, '0');

    const booking = new bookingModel({
      userId: new Types.ObjectId(userId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: today,
      startTime: `${startHourStr}:00`,
      endTime: `${endHourStr}:00`,
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
    });
    await booking.save();

    const res = await request(app.getHttpServer())
      .post(`/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.status).toBe(BookingStatus.CANCELLED);
    expect(res.body.refundRate).toBe(0.0);
    expect(res.body.refundAmount).toBe(0);

    await bookingModel.deleteOne({ _id: booking._id });
  });
});
