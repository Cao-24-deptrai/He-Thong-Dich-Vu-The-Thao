import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { VenueType, SportCategory, BookingStatus } from '../src/common/enums';

describe('Bước 2.1: Quản lý Cơ sở, Cụm sân, Bảng giá & Ma trận khung giờ 30 phút (e2e)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;

  let customerToken: string;
  let testFacilityId: string;
  let testVenueId: string;
  const testDate = '2026-12-15';

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

    // Đăng ký/đăng nhập customer
    const phone = `098${Math.floor(Math.random() * 8000000) + 1000000}`;
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone,
        password: 'Pass@123456',
        fullName: 'Nguyễn Văn Test 2.1',
      });
    customerToken = registerRes.body.accessToken;

    // Tạo cơ sở test
    const facility = await facilityModel.create({
      name: 'Phanta Athletic Arena Mỹ Đình',
      address: 'Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
      location: { type: 'Point', coordinates: [105.7725, 21.0185] },
      sportTypes: ['SOCCER', 'BADMINTON', 'TENNIS'],
      isActive: true,
    });
    testFacilityId = facility._id.toString();

    // Tạo sân bóng đá mini F1
    const venue = await venueModel.create({
      facilityId: facility._id,
      name: 'Sân Bóng Mini F1 (5 người)',
      courtCode: 'F1',
      type: VenueType.FOOTBALL_5,
      sportCategory: SportCategory.SOCCER,
      basePricePerHour: 250000,
      operatingHours: { openTime: '06:00', closeTime: '22:00' },
      pricingRules: {
        peakHours: [{ startTime: '17:00', endTime: '21:00', price: 300000 }],
      },
      isActive: true,
    });
    testVenueId = venue._id.toString();
  });

  afterAll(async () => {
    if (testVenueId) {
      await bookingModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
      await venueModel.findByIdAndDelete(testVenueId);
    }
    if (testFacilityId) {
      await facilityModel.findByIdAndDelete(testFacilityId);
    }
    await app.close();
  });

  it('1. GET /facilities - Trích xuất danh mục cơ sở thể thao hoạt động', async () => {
    const res = await request(app.getHttpServer())
      .get('/facilities')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((f: any) => f._id === testFacilityId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Phanta Athletic Arena Mỹ Đình');
    expect(found.sportTypes).toContain('SOCCER');
  });

  it('2. GET /venues - Trích xuất danh mục sân thi đấu theo cơ sở', async () => {
    const res = await request(app.getHttpServer())
      .get(`/venues?facilityId=${testFacilityId}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((v: any) => v._id === testVenueId);
    expect(found).toBeDefined();
    expect(found.courtCode).toBe('F1');
    expect(found.basePricePerHour).toBe(250000);
    expect(found.operatingHours.openTime).toBe('06:00');
    expect(found.operatingHours.closeTime).toBe('22:00');
  });

  it('3. GET /bookings/slots - Trả về ma trận khung giờ 30 phút theo ngày thi đấu', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/slots?venueId=${testVenueId}&date=${testDate}&granularity=30`)
      .expect(200);

    expect(res.body.venueId).toBe(testVenueId);
    expect(res.body.date).toBe(testDate);
    expect(res.body.granularityMinutes).toBe(30);
    expect(Array.isArray(res.body.slots)).toBe(true);

    // 06:00 đến 22:00 là 16 tiếng = 32 slot 30 phút
    expect(res.body.slots.length).toBe(32);

    // Ban đầu tất cả slots đều AVAILABLE (TRỐNG)
    const slot0600 = res.body.slots.find((s: any) => s.startTime === '06:00');
    expect(slot0600).toBeDefined();
    expect(slot0600.endTime).toBe('06:30');
    expect(slot0600.status).toBe('AVAILABLE');
    expect(slot0600.statusLabel).toBe('TRỐNG');
    expect(slot0600.price).toBe(125000); // 250k / 2
    expect(slot0600.isPeak).toBe(false);

    // Kiểm tra slot giờ vàng (17:00 - 17:30)
    const slot1700 = res.body.slots.find((s: any) => s.startTime === '17:00');
    expect(slot1700).toBeDefined();
    expect(slot1700.isPeak).toBe(true);
    expect(slot1700.price).toBe(150000); // 300k peak / 2
  });

  it('4. POST /bookings/hold - Khóa giữ chỗ 10 phút (In-Memory Mutex Lock & 600s expiration)', async () => {
    const holdRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '17:30',
        endTime: '18:00',
      })
      .expect(201);

    expect(holdRes.body).toHaveProperty('_id');
    expect(holdRes.body.status).toBe(BookingStatus.HELD);
    expect(holdRes.body.startTime).toBe('17:30');
    expect(holdRes.body.endTime).toBe('18:00');
    expect(holdRes.body.totalPrice).toBe(150000); // peak 300k * 0.5h
    expect(holdRes.body.holdExpiresAt).toBeDefined();

    // Kiểm tra thời gian hết hạn xấp xỉ 10 phút (600s)
    const expiresAt = new Date(holdRes.body.holdExpiresAt).getTime();
    const now = Date.now();
    const diffSeconds = Math.round((expiresAt - now) / 1000);
    expect(diffSeconds).toBeGreaterThanOrEqual(590);
    expect(diffSeconds).toBeLessThanOrEqual(610);
  });

  it('5. GET /bookings/slots - Ma trận 30 phút hiển thị đúng trạng thái HELD (ĐANG GIỮ CHỖ)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/bookings/slots?venueId=${testVenueId}&date=${testDate}`)
      .expect(200);

    const slot1730 = res.body.slots.find((s: any) => s.startTime === '17:30');
    expect(slot1730).toBeDefined();
    expect(slot1730.status).toBe('HELD');
    expect(slot1730.statusLabel).toBe('ĐANG GIỮ CHỖ');
    expect(slot1730.holdExpiresAt).toBeDefined();
  });

  it('6. POST /bookings/hold - Xung đột đặt chỗ (Race Condition) bị chặn chuẩn mã 409 Conflict', async () => {
    // Cố tình đặt trùng khung giờ 17:30 - 18:00 đã bị HELD
    const conflictRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '17:30',
        endTime: '18:00',
      })
      .expect(409);

    expect(['SLOT_ALREADY_TAKEN', 'SLOT_MUTEX_LOCKED']).toContain(conflictRes.body.errorCode);
  });
});
