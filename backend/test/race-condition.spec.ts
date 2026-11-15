import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import configuration from '../src/config/configuration';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { BookingStatus, VenueType } from '../src/common/enums';
import { BookingsService } from '../src/bookings/bookings.service';

describe('BƯỚC 2: Booking Engine & Race Condition Stress Test (Mục 2.5 Spec)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let server: any;
  let venueId: string;
  let customerTokens: string[] = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    await app.listen(0);
    server = app.getHttpServer();

    bookingsService = app.get(BookingsService);

    // 1. Tạo 30 users giả lập để thực hiện 30 requests đồng thời
    for (let i = 1; i <= 30; i++) {
      const phone = `09100000${i < 10 ? '0' + i : i}`;
      const res = await request(server)
        .post('/auth/register')
        .send({
          phone,
          password: 'Password@123',
          fullName: `Người dùng ${i}`,
        });
      customerTokens.push(res.body.accessToken);
    }

    // 2. Tạo một Venue mẫu
    const venueModel = app.get('VenueModel');
    const venue = await venueModel.create({
      facilityId: new Types.ObjectId(),
      name: 'Sân bóng Mỹ Đình sân 5 số 1',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
    });
    venueId = venue._id.toString();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('1. Xem lịch trống ban đầu (GET /venues/:id/availability) -> toàn bộ 16 slots là AVAILABLE', async () => {
    const res = await request(server)
      .get(`/venues/${venueId}/availability?date=2026-09-20`)
      .expect(200);

    expect(res.body.venueId).toBe(venueId);
    expect(res.body.date).toBe('2026-09-20');
    expect(res.body.slots.length).toBe(16); // 06:00 đến 22:00
    expect(res.body.slots.every((s: any) => s.status === 'AVAILABLE')).toBe(true);
  });

  it('2. BẮT BUỘC (Mục 2.5): Gửi 30 request ĐỒNG THỜI (Race Condition) vào cùng 1 slot -> Chỉ ĐÚNG 1 thành công', async () => {
    const targetDate = '2026-09-20';
    const targetSlot = '18:00';
    const targetEnd = '19:00';

    // Bắn 30 requests đồng thời
    const sendHold = (token: string) =>
      request(server)
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${token}`)
        .send({
          venueId,
          bookingDate: targetDate,
          startTime: targetSlot,
          endTime: targetEnd,
        });

    const results = await Promise.all(customerTokens.map((t) => sendHold(t)));

    const successfulRequests = results.filter((res) => res.status === 201);
    const conflictRequests = results.filter((res) => res.status === 409);

    // Tiêu chuẩn nghiệm thu 1: Đúng duy nhất 1 request thành công (201 Created)
    expect(successfulRequests.length).toBe(1);

    // Tiêu chuẩn nghiệm thu 2: Toàn bộ 29 requests còn lại bị chặn (409 Conflict)
    expect(conflictRequests.length).toBe(29);

    // Kiểm tra mã lỗi rõ ràng
    conflictRequests.forEach((res) => {
      expect(['SLOT_MUTEX_LOCKED', 'SLOT_ALREADY_TAKEN']).toContain(
        res.body.errorCode,
      );
    });

    // Tiêu chuẩn nghiệm thu 3: Kiểm tra trực tiếp DB chỉ có đúng 1 document cho slot này
    const bookingModel = app.get('BookingModel');
    const bookingsInDb = await bookingModel.find({
      venueId: new Types.ObjectId(venueId),
      startTime: targetSlot,
      status: BookingStatus.HELD,
    });
    expect(bookingsInDb.length).toBe(1);
    expect(bookingsInDb[0].status).toBe(BookingStatus.HELD);
  });

  it('3. Lịch trống sau khi giữ chỗ (GET /venues/:id/availability) -> slot 18:00 chuyển thành HELD', async () => {
    const res = await request(server)
      .get(`/venues/${venueId}/availability?date=2026-09-20`)
      .expect(200);

    const slot18 = res.body.slots.find((s: any) => s.startTime === '18:00');
    expect(slot18).toBeDefined();
    expect(slot18.status).toBe(BookingStatus.HELD);
    expect(slot18.holdExpiresAt).toBeDefined();
  });

  it('4. Khách hàng xem lịch sử đặt chỗ (GET /bookings/me)', async () => {
    const res = await request(server)
      .get('/bookings/me')
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('5. Hủy đơn giữ chỗ (POST /bookings/:id/cancel) -> Đúng chủ nhân được phép hủy thành công', async () => {
    const bookingModel = app.get('BookingModel');
    const userModel = app.get('UserModel');

    const activeBooking = await bookingModel.findOne({
      venueId: new Types.ObjectId(venueId),
      startTime: '18:00',
      status: BookingStatus.HELD,
    });

    expect(activeBooking).toBeDefined();

    // Tìm thông tin người dùng thực sự sở hữu booking thắng race condition
    const ownerUser = await userModel.findById(activeBooking.userId);
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ phone: ownerUser.phone, password: 'Password@123' });
    const ownerToken = loginRes.body.accessToken;

    // Thực hiện hủy đơn bởi đúng chủ nhân -> 200 OK
    const cancelRes = await request(server)
      .post(`/bookings/${activeBooking._id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(cancelRes.body.status).toBe(BookingStatus.CANCELLED);

    // Slot 18:00 giờ phải được giải phóng trở lại thành AVAILABLE
    const availRes = await request(server)
      .get(`/venues/${venueId}/availability?date=2026-09-20`)
      .expect(200);
    const slot18 = availRes.body.slots.find((s: any) => s.startTime === '18:00');
    expect(slot18.status).toBe('AVAILABLE');
  });

  it('6. Cron dọn dẹp đơn HELD quá hạn tự động chuyển sang EXPIRED (Mục 2.3 & 4.1)', async () => {
    const bookingModel = app.get('BookingModel');
    // Tạo 1 booking giả lập đã hết hạn 1 phút trước
    const expiredBooking = await bookingModel.create({
      userId: new Types.ObjectId(),
      venueId: new Types.ObjectId(venueId),
      bookingDate: new Date('2026-09-21T00:00:00.000Z'),
      startTime: '07:00',
      endTime: '08:00',
      totalPrice: 200000,
      status: BookingStatus.HELD,
      holdExpiresAt: new Date(Date.now() - 60000), // Đã hết hạn
    });

    // Kích hoạt dọn dẹp
    const cleanedCount = await bookingsService.cleanExpiredBookings();
    expect(cleanedCount).toBeGreaterThanOrEqual(1);

    const refreshed = await bookingModel.findById(expiredBooking._id);
    expect(refreshed.status).toBe(BookingStatus.EXPIRED);
  });
});
