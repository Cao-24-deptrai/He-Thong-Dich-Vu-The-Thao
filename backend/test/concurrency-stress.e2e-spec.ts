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
import { VenueType, BookingStatus } from '../src/common/enums';

describe('Milestone 7: Concurrency & High Load Stress Test (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;

  let testVenueId: string;
  const targetDate = '2026-11-20';
  const targetSlot = '18:00';
  const targetEnd = '19:00';

  const CONCURRENT_USERS_COUNT = 50;
  const userTokens: string[] = [];

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

    // Tạo sân bóng đá để test stress
    const facility = await facilityModel.create({
      name: 'Tổ Hợp Thể Thao Cao Cấp Olympic',
      address: 'Đường Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
      location: {
        type: 'Point',
        coordinates: [105.77, 21.03],
      },
      sportTypes: ['FOOTBALL'],
    });

    const venue = await venueModel.create({
      facilityId: facility._id,
      name: 'Sân 7 Olympic Số 1 (Tranh Chấp Stress Test)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 350000,
    });
    testVenueId = venue._id.toString();

    // Khởi tạo các user đồng thời để lấy JWT
    const basePhone = Math.floor(Math.random() * 800000) + 100000;
    const registerPromises = [];
    for (let i = 0; i < CONCURRENT_USERS_COUNT; i++) {
      const phone = `097${basePhone + i}`;
      registerPromises.push(
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            phone,
            password: 'Pass@123456',
            fullName: `Stress Tester #${i + 1}`,
          })
          .then((res) => {
            const token = res.body.accessToken || res.body.access_token;
            if (token) {
              userTokens.push(token);
            }
          }),
      );
    }
    await Promise.all(registerPromises);
    expect(userTokens.length).toBe(CONCURRENT_USERS_COUNT);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it(`Mô phỏng ${CONCURRENT_USERS_COUNT} Virtual Users đồng thời tranh chấp 1 slot duy nhất -> Chỉ đúng 1 user thành công (HTTP 201), còn lại 409 Conflict`, async () => {
    const startTimeMs = Date.now();

    // Bắn đồng thời 50 request cùng lúc tại cùng 1 mili-giây
    const promises = userTokens.map((token) => {
      return request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${token}`)
        .send({
          venueId: testVenueId,
          bookingDate: targetDate,
          startTime: targetSlot,
          endTime: targetEnd,
        });
    });

    const results = await Promise.all(promises);
    const totalDurationMs = Date.now() - startTimeMs;

    const successResponses = results.filter((r) => r.status === 201);
    const conflictResponses = results.filter((r) => r.status === 409);
    const error500Responses = results.filter((r) => r.status >= 500);

    console.log(`\n================ STRESS TEST KẾT QUẢ ================`);
    console.log(`Tổng số request đồng thời: ${results.length}`);
    console.log(`Số request thành công (201 Created): ${successResponses.length}`);
    console.log(`Số request bị chặn hợp lệ (409 Conflict): ${conflictResponses.length}`);
    console.log(`Số lỗi hệ thống 500: ${error500Responses.length}`);
    console.log(`Tổng thời gian xử lý: ${totalDurationMs} ms`);
    console.log(`Thời gian trung bình mỗi request: ${(totalDurationMs / results.length).toFixed(1)} ms`);
    console.log(`=====================================================\n`);

    // 1. Chỉ duy nhất 1 request thành công
    expect(successResponses.length).toBe(1);

    // 2. Toàn bộ các request còn lại bị chặn bởi 409 Conflict (Redis lock hoặc Unique Index)
    expect(conflictResponses.length).toBe(CONCURRENT_USERS_COUNT - 1);

    // 3. Không có lỗi 500
    expect(error500Responses.length).toBe(0);

    // 4. Kiểm tra trong MongoDB Atlas: Chỉ tồn tại ĐÚNG 1 bản ghi
    const bookingsInDb = await bookingModel
      .find({
        venueId: testVenueId,
        bookingDate: new Date(`${targetDate}T00:00:00.000Z`),
        startTime: targetSlot,
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
      })
      .exec();

    expect(bookingsInDb.length).toBe(1);
    expect(bookingsInDb[0].status).toBe(BookingStatus.HELD);
  }, 30000);
});
