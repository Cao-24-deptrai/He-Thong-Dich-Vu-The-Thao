import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { BookingStatus, BookingSource } from '../src/common/enums';

describe('Changelog Item 1: CRUD Facilities & Venues, Soft Delete & Ràng Buộc (e2e)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;

  let adminToken: string;
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

    // Lấy token Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });
    adminToken = adminLoginRes.body.accessToken;
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

  it('1. POST /facilities - Tạo cơ sở thể thao mới có isActive: true', async () => {
    const res = await request(app.getHttpServer())
      .post('/facilities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tổ hợp Thể thao Thử nghiệm CRUD',
        address: '123 Đường Test, Quận 1, TP.HCM',
        sportTypes: ['FOOTBALL'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.isActive).toBe(true);
    testFacilityId = res.body._id;
  });

  it('2. PATCH /facilities/:id - Cập nhật thông tin cơ sở', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/facilities/${testFacilityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tổ hợp Thể thao Đã Đổi Tên',
        address: '456 Đường Mới, Quận 1, TP.HCM',
      })
      .expect(200);

    expect(res.body.name).toBe('Tổ hợp Thể thao Đã Đổi Tên');
    expect(res.body.address).toBe('456 Đường Mới, Quận 1, TP.HCM');
  });

  it('3. POST /venues - Tạo sân con bên trong cơ sở có isActive: true', async () => {
    const res = await request(app.getHttpServer())
      .post('/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        facilityId: testFacilityId,
        name: 'Sân bóng mini A1',
        venueType: 'FOOTBALL_5',
        defaultPrice: 200000,
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.isActive).toBe(true);
    testVenueId = res.body._id;
  });

  it('4. PATCH /venues/:id - Cập nhật thông tin sân con', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/venues/${testVenueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sân bóng mini A1 Vip',
        defaultPrice: 250000,
      })
      .expect(200);

    expect(res.body.name).toBe('Sân bóng mini A1 Vip');
    expect(res.body.defaultPrice).toBe(250000);
  });

  it('5. DELETE /venues/:id - Bị chặn khi sân có booking tương lai (VENUE_HAS_ACTIVE_BOOKINGS)', async () => {
    // Tạo 1 booking ngày mai ở trạng thái CONFIRMED
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const testBooking = new bookingModel({
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: tomorrow,
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 250000,
      status: BookingStatus.CONFIRMED,
      bookingSource: BookingSource.APP,
    });
    await testBooking.save();

    // Thử vô hiệu hóa sân con -> Phải bị chặn 400 Bad Request
    const res = await request(app.getHttpServer())
      .delete(`/venues/${testVenueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.errorCode).toBe('VENUE_HAS_ACTIVE_BOOKINGS');
    expect(res.body.activeBookingCount).toBeGreaterThanOrEqual(1);

    // Dọn dẹp booking để test tiếp
    await bookingModel.deleteOne({ _id: testBooking._id });
  });

  it('6. DELETE /facilities/:id - Bị chặn khi còn sân con active (FACILITY_HAS_ACTIVE_VENUES)', async () => {
    // Sân con testVenueId vẫn đang isActive = true
    const res = await request(app.getHttpServer())
      .delete(`/facilities/${testFacilityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.errorCode).toBe('FACILITY_HAS_ACTIVE_VENUES');
    expect(res.body.activeVenuesCount).toBeGreaterThanOrEqual(1);
  });

  it('7. DELETE /venues/:id - Vô hiệu hóa thành công khi không còn booking tương lai (Soft Delete)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/venues/${testVenueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.isActive).toBe(false);

    // Kiểm tra GET /venues không còn thấy sân này nếu không có includeInactive
    const getActiveRes = await request(app.getHttpServer())
      .get(`/venues?facilityId=${testFacilityId}`)
      .expect(200);

    const foundInActive = getActiveRes.body.some((v: any) => v._id === testVenueId);
    expect(foundInActive).toBe(false);

    // Kiểm tra GET /venues?includeInactive=true thì thấy sân này với isActive: false
    const getAllRes = await request(app.getHttpServer())
      .get(`/venues?facilityId=${testFacilityId}&includeInactive=true`)
      .expect(200);

    const foundInAll = getAllRes.body.find((v: any) => v._id === testVenueId);
    expect(foundInAll).toBeDefined();
    expect(foundInAll.isActive).toBe(false);
  });

  it('8. DELETE /facilities/:id - Vô hiệu hóa cơ sở thành công sau khi toàn bộ sân con đã vô hiệu hóa', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/facilities/${testFacilityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.isActive).toBe(false);

    // Kiểm tra GET /facilities mặc định không còn cơ sở này
    const getActiveFacilitiesRes = await request(app.getHttpServer())
      .get('/facilities')
      .expect(200);

    const foundInActiveFac = getActiveFacilitiesRes.body.some((f: any) => f._id === testFacilityId);
    expect(foundInActiveFac).toBe(false);

    // Kiểm tra GET /facilities?includeInactive=true thì có cơ sở này
    const getAllFacilitiesRes = await request(app.getHttpServer())
      .get('/facilities?includeInactive=true')
      .expect(200);

    const foundInAllFac = getAllFacilitiesRes.body.find((f: any) => f._id === testFacilityId);
    expect(foundInAllFac).toBeDefined();
    expect(foundInAllFac.isActive).toBe(false);
  });
});
