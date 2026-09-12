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
import { BookingStatus, VenueType, UserRole } from '../src/common/enums';
import { RedisService } from '../src/redis/redis.service';

describe('BƯỚC 2 (MỞ RỘNG): Toàn bộ 9 Ca Kiểm Thử Biên (Edge Cases) cho Booking Engine', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let redisService: RedisService;
  let server: any;
  let venueId: string;
  let userTokenA: string;
  let userTokenB: string;
  let staffToken: string;

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

    redisService = app.get(RedisService);

    // 1. Tạo User A
    const resA = await request(server).post('/auth/register').send({
      phone: '0901111111',
      password: 'Password@123',
      fullName: 'Khách Hàng A',
    });
    userTokenA = resA.body.accessToken;

    // 2. Tạo User B
    const resB = await request(server).post('/auth/register').send({
      phone: '0902222222',
      password: 'Password@123',
      fullName: 'Khách Hàng B',
    });
    userTokenB = resB.body.accessToken;

    // 3. Tạo Staff User
    const resStaff = await request(server).post('/auth/register').send({
      phone: '0908888888',
      password: 'Password@123',
      fullName: 'Nhân viên Quầy',
      role: UserRole.STAFF,
    });
    staffToken = resStaff.body.accessToken;

    // 4. Tạo 1 Venue mẫu
    const venueModel = app.get('VenueModel');
    const venue = await venueModel.create({
      facilityId: new Types.ObjectId(),
      name: 'Sân Cầu Lông Số 1',
      type: VenueType.BADMINTON,
      basePricePerHour: 150000,
    });
    venueId = venue._id.toString();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('Edge Case 1: Tái giữ chỗ ngay sau khi slot cũ bị quá hạn HELD (Hold Expired Slot Reuse)', async () => {
    const bookingModel = app.get('BookingModel');
    // Giả lập đơn cũ của User A đã hết hạn cách đây 5 phút
    await bookingModel.create({
      userId: new Types.ObjectId(),
      venueId: new Types.ObjectId(venueId),
      bookingDate: new Date('2026-09-25T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '10:00',
      totalPrice: 150000,
      status: BookingStatus.HELD,
      holdExpiresAt: new Date(Date.now() - 300000), // Đã hết hạn
    });

    // User B vào đặt đúng slot 09:00 -> PHẢI THÀNH CÔNG (201 Created)
    const res = await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenB}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '09:00',
        endTime: '10:00',
      })
      .expect(201);

    expect(res.body.status).toBe(BookingStatus.HELD);
  });

  it('Edge Case 2: Tái giữ chỗ ngay sau khi đơn cũ bị CANCELLED (Cancelled Slot Reuse)', async () => {
    // 1. User A đặt slot 10:00
    const holdRes = await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(201);

    const bookingId = holdRes.body._id;

    // 2. User A hủy đơn slot 10:00
    await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .expect(200);

    // 3. User B lập tức vào giữ lại slot 10:00 -> PHẢI THÀNH CÔNG (201 Created)
    const reuseRes = await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenB}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(201);

    expect(reuseRes.body.status).toBe(BookingStatus.HELD);
  });

  it('Edge Case 3: Spam click / Double tap từ cùng 1 người dùng trên điện thoại', async () => {
    // Cùng User A bắn liên tiếp 3 request vào slot 11:00
    const promises = [1, 2, 3].map(() =>
      request(server)
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          venueId,
          bookingDate: '2026-09-25',
          startTime: '11:00',
          endTime: '12:00',
        }),
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    // Chỉ duy nhất 1 lần thành công, 2 lần còn lại bị chặn đứng
    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(2);
  });

  it('Edge Case 4: Hai người đặt 2 slot KHÁC NHAU cùng một lúc -> Cả hai đều thành công', async () => {
    const p1 = request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '14:00',
        endTime: '15:00',
      });

    const p2 = request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenB}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '15:00',
        endTime: '16:00',
      });

    const [res1, res2] = await Promise.all([p1, p2]);

    // Cả 2 slot khác nhau phải đều thành công độc lập
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it('Edge Case 5: Người lạ (User B) cố tình gọi API hủy đơn của User A -> Bị từ chối', async () => {
    // User A tạo đơn slot 16:00
    const holdRes = await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '16:00',
        endTime: '17:00',
      })
      .expect(201);

    const bookingId = holdRes.body._id;

    // User B cố tình gửi lệnh hủy đơn của User A -> 409 Conflict
    const attackRes = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userTokenB}`)
      .expect(409);

    expect(attackRes.body.message).toContain('Bạn không có quyền');
  });

  it('Edge Case 6: Cố tình hủy 1 đơn đã hủy lần 2 (Double Cancel) -> 400 Bad Request', async () => {
    // 1. User A đặt slot 13:00
    const holdRes = await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '13:00',
        endTime: '14:00',
      })
      .expect(201);

    const bookingId = holdRes.body._id;

    // 2. Hủy lần 1 -> 200 OK
    await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .expect(200);

    // 3. Hủy lần 2 -> 400 Bad Request
    const res = await request(server)
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .expect(400);

    expect(res.body.message).toContain('Không thể hủy đơn đang ở trạng thái CANCELLED');
  });

  it('Edge Case 7: Mutex Lock tự động giải phóng sau khi hết TTL (Crash Recovery, chống Deadlock)', async () => {
    const lockKey = `lock:test:deadlock:${Date.now()}`;
    // 1. Giả lập một tiến trình bị crash chiếm khóa với TTL cực ngắn (100ms)
    const acquired1 = await redisService.acquireLock(lockKey, 'crashed_worker', 100);
    expect(acquired1).toBe(true);

    // Ngay lúc này, người khác không lấy được
    const acquiredImmediately = await redisService.acquireLock(lockKey, 'new_worker', 1000);
    expect(acquiredImmediately).toBe(false);

    // 2. Chờ 150ms cho lock tự hết hạn (không gọi releaseLock)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 3. Khóa đã tự tan biến, worker mới lấy được bình thường
    const acquiredAfterTtl = await redisService.acquireLock(lockKey, 'new_worker', 1000);
    expect(acquiredAfterTtl).toBe(true);

    await redisService.releaseLock(lockKey, 'new_worker');
  });

  it('Edge Case 8: Walk-in tại quầy đụng độ khách đặt Online (Mục 4.3 trong Spec)', async () => {
    // 1. Khách hàng Online vừa giữ chỗ slot 17:00
    await request(server)
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '17:00',
        endTime: '18:00',
      })
      .expect(201);

    // 2. Cùng lúc, nhân viên quầy tạo Walk-in cho đúng slot 17:00
    // Bắt buộc bắt lỗi E11000 và trả về mã lỗi nghiệp vụ chuẩn SLOT_ALREADY_TAKEN_ONLINE
    const walkInRes = await request(server)
      .post('/bookings/walk-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '17:00',
        endTime: '18:00',
      })
      .expect(409);

    expect(walkInRes.body.errorCode).toBe('SLOT_ALREADY_TAKEN_ONLINE');
    expect(walkInRes.body.message).toContain('trực tuyến');
  });

  it('Edge Case 9: Khách hàng thường (CUSTOMER) cố tình gọi API Walk-in tại quầy -> 403 Forbidden', async () => {
    // Khách hàng không có vai trò STAFF/ADMIN gọi endpoint Walk-in
    const res = await request(server)
      .post('/bookings/walk-in')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        venueId,
        bookingDate: '2026-09-25',
        startTime: '20:00',
        endTime: '21:00',
      })
      .expect(403);

    expect(res.body.message).toContain('Quyền truy cập bị từ chối');
  });
});
