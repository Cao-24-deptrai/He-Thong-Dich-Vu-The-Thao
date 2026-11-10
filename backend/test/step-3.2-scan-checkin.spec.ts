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

describe('Bước 3.2: Soát Vé Check-in & Dự Phòng Ngoại Lệ (Backend E2E)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let userModel: Model<User>;
  let jwtService: JwtService;

  let staffToken: string;
  let staffId: string;
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
    staffId = staffLoginRes.body.user.id;

    // 2. Customer
    const phoneC = '0944556677';
    await userModel.deleteOne({ phone: phoneC });
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneC, password: 'Pass@123456', fullName: 'Lê Văn Khách' });
    customerToken = regRes.body.accessToken;
    customerId = regRes.body.user.id;

    // 3. Facility & Venue
    const fac = new facilityModel({
      name: 'Tổ hợp Thể thao Checkin 3.2',
      address: 'Hà Nội',
      location: { type: 'Point', coordinates: [105.7725, 21.0185] },
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân Checkin Số 1',
      type: 'FOOTBALL_5',
      basePricePerHour: 300000,
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
    await userModel.deleteMany({ phone: '0944556677' });
    await app.close();
  });

  it('1. Quét mã QR hợp lệ -> Check-in thành công 200 OK và cập nhật audit info', async () => {
    const booking = new bookingModel({
      bookingCode: 'BK-SCAN-01',
      ticketCode: 'TCK-SCAN-01',
      userId: new Types.ObjectId(customerId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-15'),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
      isCheckedIn: false,
    });
    await booking.save();

    // Lấy QR Token hợp lệ
    const qrRes = await request(app.getHttpServer())
      .get(`/bookings/${booking._id}/qr`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const qrToken = qrRes.body.qrToken;

    // Staff thực hiện quét QR
    const scanRes = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken })
      .expect(200);

    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.bookingId).toBe(booking._id.toString());
    expect(scanRes.body.bookingCode).toBe('BK-SCAN-01');
    expect(scanRes.body.ticketCode).toBe('TCK-SCAN-01');
    expect(scanRes.body.checkinMethod).toBe('QR');
    expect(scanRes.body.checkedInAt).toBeDefined();

    // Kiểm tra DB đã được cập nhật
    const inDb = await bookingModel.findById(booking._id);
    expect(inDb?.isCheckedIn).toBe(true);
    expect(inDb?.checkinMethod).toBe('QR');
    expect(inDb?.checkedInBy?.toString()).toBe(staffId);
  });

  it('2. Quét lại lần 2 cùng mã vé -> Chống quét trùng (409 ALREADY_CHECKED_IN)', async () => {
    const booking = await bookingModel.findOne({ bookingCode: 'BK-SCAN-01' });
    const qrToken = booking?.qrToken!;

    const scanRes = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken })
      .expect(409);

    expect(scanRes.body.errorCode).toBe('ALREADY_CHECKED_IN');
    expect(scanRes.body.checkedInAt).toBeDefined();
  });

  it('3. Mã QR hết hạn quá 60s -> Từ chối với mã lỗi 400 QR_TOKEN_EXPIRED', async () => {
    const expiredPayload = {
      bookingId: new Types.ObjectId().toString(),
      ticketCode: 'TCK-EXP-01',
      userId: customerId,
      issuedAt: Math.floor(Date.now() / 1000) - 120, // 2 phút trước
      jti: 'expired-uuid',
    };

    // Ký token hết hạn từ trước
    const expiredToken = jwtService.sign(expiredPayload, { expiresIn: '-1s' });

    const scanRes = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: expiredToken })
      .expect(400);

    expect(scanRes.body.errorCode).toBe('QR_TOKEN_EXPIRED');
  });

  it('4. Khách hàng thông thường gọi API quét QR -> Bị từ chối 403 FORBIDDEN', async () => {
    await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ qrToken: 'fake-token' })
      .expect(403);
  });

  it('5. Chống Race Condition: Mô phỏng 10 lượt quét đồng thời tại các cổng khác nhau', async () => {
    const raceBooking = new bookingModel({
      bookingCode: 'BK-RACE-01',
      ticketCode: 'TCK-RACE-01',
      userId: new Types.ObjectId(customerId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-15'),
      startTime: '20:00',
      endTime: '21:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
      isCheckedIn: false,
    });
    await raceBooking.save();

    // Sinh QR token
    const qrRes = await request(app.getHttpServer())
      .get(`/bookings/${raceBooking._id}/qr`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const token = qrRes.body.qrToken;

    // Bắn 10 request quét đồng thời
    const scanPromises = Array.from({ length: 10 }).map(() =>
      request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: token }),
    );

    const responses = await Promise.all(scanPromises);

    const successCount = responses.filter((r) => r.status === 200).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    // Chỉ duy nhất 1 request thành công, 9 request còn lại nhận 409
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);
  });

  it('6. Check-in thủ công tại quầy (POST /checkin/manual) - Thành công với lý do khách hết pin', async () => {
    const manualBooking = new bookingModel({
      bookingCode: 'BK-MANUAL-01',
      ticketCode: 'TCK-MANUAL-01',
      userId: new Types.ObjectId(customerId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-15'),
      startTime: '21:00',
      endTime: '22:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
      isCheckedIn: false,
    });
    await manualBooking.save();

    const res = await request(app.getHttpServer())
      .post('/checkin/manual')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        bookingId: manualBooking._id.toString(),
        note: 'Khách hết pin điện thoại, đã đối chiếu SĐT và CCCD',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.checkinMethod).toBe('MANUAL');
    expect(res.body.note).toContain('Khách hết pin');

    const inDb = await bookingModel.findById(manualBooking._id);
    expect(inDb?.isCheckedIn).toBe(true);
    expect(inDb?.checkinMethod).toBe('MANUAL');
    expect(inDb?.manualCheckinNote).toContain('Khách hết pin');
    expect(inDb?.checkedInBy?.toString()).toBe(staffId);
  });

  it('7. Check-in thủ công lần 2 -> Báo lỗi 409 ALREADY_CHECKED_IN', async () => {
    const booking = await bookingModel.findOne({ bookingCode: 'BK-MANUAL-01' });

    const res = await request(app.getHttpServer())
      .post('/checkin/manual')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        bookingId: booking?._id.toString(),
        note: 'Checkin lại',
      })
      .expect(409);

    expect(res.body.errorCode).toBe('ALREADY_CHECKED_IN');
  });

  it('8. Tra cứu đơn đặt chỗ tại quầy (GET /checkin/lookup) theo SĐT hoặc mã booking', async () => {
    // 8.1 Tra cứu theo SĐT của customer (0944556677)
    const phoneLookupRes = await request(app.getHttpServer())
      .get('/checkin/lookup')
      .query({ query: '0944556677' })
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(Array.isArray(phoneLookupRes.body)).toBe(true);
    expect(phoneLookupRes.body.length).toBeGreaterThanOrEqual(1);
    expect(phoneLookupRes.body[0].customerPhone).toBe('0944556677');

    // 8.2 Tra cứu theo bookingCode BK-MANUAL-01
    const codeLookupRes = await request(app.getHttpServer())
      .get('/checkin/lookup')
      .query({ query: 'BK-MANUAL-01' })
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(codeLookupRes.body.length).toBe(1);
    expect(codeLookupRes.body[0].bookingCode).toBe('BK-MANUAL-01');
    expect(codeLookupRes.body[0].isCheckedIn).toBe(true);
  });

  it('9. Khách hàng thông thường truy cập tra cứu hoặc check-in thủ công -> Bị từ chối 403 FORBIDDEN', async () => {
    await request(app.getHttpServer())
      .get('/checkin/lookup')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/checkin/manual')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: new Types.ObjectId().toString() })
      .expect(403);
  });
});
