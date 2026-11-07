import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { PriceRule, PriceBand } from '../src/facilities/schemas/price-rule.schema';
import { Closure, ClosureReason } from '../src/facilities/schemas/closure.schema';
import { Booking, BookingDocument } from '../src/bookings/schemas/booking.schema';

describe('Epic E02 - Danh Mục Sân & Bảng Giá Động M03 (E2E Integration Test)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let priceRuleModel: Model<PriceRule>;
  let closureModel: Model<Closure>;
  let bookingModel: Model<BookingDocument>;
  let createdBookingIds: string[] = [];

  let adminToken: string;
  let defaultFacilityId: string;
  let testVenueId: string;
  let createdVenueIds: string[] = [];
  let createdPriceRuleIds: string[] = [];
  let createdClosureIds: string[] = [];

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
    priceRuleModel = moduleFixture.get<Model<PriceRule>>(getModelToken(PriceRule.name));
    closureModel = moduleFixture.get<Model<Closure>>(getModelToken(Closure.name));
    bookingModel = moduleFixture.get<Model<BookingDocument>>(getModelToken(Booking.name));

    // Đăng nhập tài khoản Admin mặc định
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });

    adminToken = adminLoginRes.body.accessToken || adminLoginRes.body.access_token;

    // Lấy Facility mặc định
    let facility = await facilityModel.findOne({ isActive: true }).exec();
    if (!facility) {
      facility = await facilityModel.create({
        name: 'Tổ Hợp Thể Thao Phanta Test',
        address: '123 Đường Test, Quận 7, TP.HCM',
        sportTypes: ['FOOTBALL'],
        openHour: '06:00',
        closeHour: '23:00',
        operatingHours: { openTime: '06:00', closeTime: '23:00' },
        isActive: true,
      });
    }
    defaultFacilityId = facility._id.toString();

    // Lấy hoặc tạo 1 Venue để test calculate-price
    let venue = await venueModel.findOne({ facilityId: new Types.ObjectId(defaultFacilityId) }).exec();
    if (!venue) {
      venue = await venueModel.create({
        facilityId: new Types.ObjectId(defaultFacilityId),
        name: 'Sân 1 (Sân 5)',
        courtCode: 'F1',
        isComposite: false,
        baseUnitCodes: [],
        defaultPrice: 200000,
        basePricePerHour: 200000,
        isActive: true,
      });
      createdVenueIds.push(venue._id.toString());
    } else {
      // Đảm bảo venue có base price chuẩn 200.000 VND / giờ
      venue.basePricePerHour = 200000;
      await venue.save();
    }
    testVenueId = venue._id.toString();
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu đã tạo trong quá trình test
    if (createdVenueIds.length > 0) {
      await venueModel.deleteMany({ _id: { $in: createdVenueIds.map((id) => new Types.ObjectId(id)) } });
    }
    if (createdPriceRuleIds.length > 0) {
      await priceRuleModel.deleteMany({ _id: { $in: createdPriceRuleIds.map((id) => new Types.ObjectId(id)) } });
    }
    if (createdBookingIds.length > 0) {
      await bookingModel.deleteMany({ _id: { $in: createdBookingIds.map((id) => new Types.ObjectId(id)) } });
    }
    if (createdClosureIds.length > 0) {
      await closureModel.deleteMany({ _id: { $in: createdClosureIds.map((id) => new Types.ObjectId(id)) } });
    }
    await app.close();
  });

  // ==========================================
  // 1. KIỂM THỬ THÔNG TIN FACILITY (BR-01)
  // ==========================================
  describe('1. GET /facilities/info - Thông tin tổ hợp & khung giờ mở cửa (BR-01)', () => {
    it('Phải trả về thông tin cơ sở và khung giờ 06:00 - 23:00 theo BR-01', async () => {
      const res = await request(app.getHttpServer())
        .get('/facilities/info')
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.name).toBeDefined();
      expect(res.body.openHour).toBe('06:00');
      expect(res.body.closeHour).toBe('23:00');
      expect(res.body.operatingHours.openTime).toBe('06:00');
      expect(res.body.operatingHours.closeTime).toBe('23:00');
    });
  });

  // ==========================================
  // 2. KIỂM THỬ BẢNG GIÁ ĐỘNG (BR-04)
  // ==========================================
  describe('2. POST /facilities/calculate-price - Công thức tính giá động (BR-04)', () => {
    it('Trường hợp 1: Thứ Hai 08:00 - 09:30 (Giờ thường) -> 3 blocks x 100k = 300k, phụ thu 0k', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities/calculate-price')
        .send({
          venueId: testVenueId,
          date: '2026-11-02', // Thứ Hai
          startTime: '08:00',
          endTime: '09:30',
        })
        .expect(200);

      expect(res.body.totalBlocks).toBe(3);
      expect(res.body.isPeakIncluded).toBe(false);
      expect(res.body.blocks.filter((b: any) => b.isPeak).length).toBe(0);
      expect(res.body.totalPriceBeforeVat).toBe(300000);
      expect(res.body.totalPrice).toBe(324000); // 300k + 8% VAT
    });

    it('Trường hợp 2: Thứ Hai 17:30 - 19:30 (Giờ cao điểm) -> 4 blocks x (100k + 25k) = 500k', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities/calculate-price')
        .send({
          venueId: testVenueId,
          date: '2026-11-02', // Thứ Hai
          startTime: '17:30',
          endTime: '19:30',
        })
        .expect(200);

      expect(res.body.totalBlocks).toBe(4);
      expect(res.body.isPeakIncluded).toBe(true);
      expect(res.body.blocks.filter((b: any) => b.isPeak).length).toBe(4);
      expect(res.body.totalPriceBeforeVat).toBe(500000);
      expect(res.body.totalPrice).toBe(540000); // 500k + 8% VAT
    });

    it('Trường hợp 3: Thứ Hai 17:00 - 18:30 (Giao thoa: 1 block thường + 2 blocks cao điểm) -> 350k', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities/calculate-price')
        .send({
          venueId: testVenueId,
          date: '2026-11-02', // Thứ Hai
          startTime: '17:00',
          endTime: '18:30',
        })
        .expect(200);

      expect(res.body.totalBlocks).toBe(3);
      expect(res.body.isPeakIncluded).toBe(true);
      expect(res.body.blocks.filter((b: any) => !b.isPeak).length).toBe(1);
      expect(res.body.blocks.filter((b: any) => b.isPeak).length).toBe(2);
      expect(res.body.totalPriceBeforeVat).toBe(350000);
      expect(res.body.totalPrice).toBe(378000); // 350k + 8% VAT
    });

    it('Trường hợp 4: Thứ Bảy (Cuối tuần) 09:00 - 10:30 -> Toàn bộ là giờ cao điểm -> 375k', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities/calculate-price')
        .send({
          venueId: testVenueId,
          date: '2026-11-07', // Thứ Bảy
          startTime: '09:00',
          endTime: '10:30',
        })
        .expect(200);

      expect(res.body.totalBlocks).toBe(3);
      expect(res.body.isPeakIncluded).toBe(true);
      expect(res.body.blocks.filter((b: any) => b.isPeak).length).toBe(3);
      expect(res.body.totalPriceBeforeVat).toBe(375000);
      expect(res.body.totalPrice).toBe(405000); // 375k + 8% VAT
    });

    it('Trường hợp 5: Báo lỗi BadRequest (400) nếu thời lượng không phải bội số của 30 phút', async () => {
      const res = await request(app.getHttpServer())
        .post('/facilities/calculate-price')
        .send({
          venueId: testVenueId,
          date: '2026-11-02',
          startTime: '08:00',
          endTime: '08:45', // 45 phút -> không hợp lệ
        })
        .expect(400);

      expect(res.body.message).toContain('bội số');
    });
  });

  // ==========================================
  // 3. KIỂM THỬ QUẢN LÝ GIÁ ĐỘNG (PRICE RULES)
  // ==========================================
  describe('3. Price Rules CRUD (/facilities/price-rules)', () => {
    it('Tạo PriceRule mới và truy vấn danh sách', async () => {
      // 1. Tạo rule
      const createRes = await request(app.getHttpServer())
        .post('/facilities/price-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appliesTo: 'FOOTBALL_5',
          band: PriceBand.PEAK,
          startTime: '17:30',
          endTime: '21:00',
          pricePerHour: 300000,
          surchargePerHour: 50000,
          dayOfWeek: [1, 2, 3, 4, 5],
        })
        .expect(201);

      expect(createRes.body._id).toBeDefined();
      expect(createRes.body.appliesTo).toBe('FOOTBALL_5');
      expect(createRes.body.pricePerHour).toBe(300000);
      createdPriceRuleIds.push(createRes.body._id);

      // 2. Lấy danh sách
      const listRes = await request(app.getHttpServer())
        .get('/facilities/price-rules')
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.some((r: any) => r._id === createRes.body._id)).toBe(true);
    });
  });

  // ==========================================
  // 4. KIỂM THỬ QUẢN LÝ LỊCH ĐÓNG SÂN (CLOSURES)
  // ==========================================
  describe('4. Closures CRUD (/facilities/closures)', () => {
    it('Tạo lịch đóng sân bảo trì và truy vấn danh sách', async () => {
      // 1. Tạo closure
      const createRes = await request(app.getHttpServer())
        .post('/facilities/closures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          resourceIds: ['F1', 'F2'],
          fromAt: '2026-11-20T08:00:00.000Z',
          toAt: '2026-11-20T18:00:00.000Z',
          reason: ClosureReason.MAINTENANCE,
          notes: 'Bảo trì thay cỏ nhân tạo định kỳ',
        })
        .expect(201);

      expect(createRes.body._id).toBeDefined();
      expect(createRes.body.facilityId.toString()).toBe(defaultFacilityId);
      createdClosureIds.push(createRes.body._id);

      // 2. Lấy danh sách
      const listRes = await request(app.getHttpServer())
        .get(`/facilities/closures?facilityId=${defaultFacilityId}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.some((c: any) => c._id === createRes.body._id)).toBe(true);
    });
  });

  // ==========================================
  // 5. KIỂM THỬ SÂN ĐƠN & SÂN GHÉP LINH HOẠT (BR-02, BR-03)
  // ==========================================
  describe('5. Venues CRUD & Sân ghép linh hoạt (BR-02, BR-03)', () => {
    it('Tạo sân 5 đơn chuẩn (isComposite = false, courtCode = TEST-F1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          name: 'Sân 5 Người Thử Nghiệm 1',
          courtCode: 'TEST-F1',
          isComposite: false,
          baseUnitCodes: [],
          venueType: 'Sân 5',
          defaultPrice: 200000,
        })
        .expect(201);

      expect(res.body._id).toBeDefined();
      expect(res.body.courtCode).toBe('TEST-F1');
      expect(res.body.isComposite).toBe(false);
      expect(res.body.baseUnitCodes).toEqual([]);
      createdVenueIds.push(res.body._id);
    });

    it('Tạo sân ghép 7 người (isComposite = true, baseUnitCodes = [TEST-F1, TEST-F2])', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          name: 'Sân 7 Ghép Thử Nghiệm A',
          courtCode: 'TEST-S7-A',
          isComposite: true,
          baseUnitCodes: ['TEST-F1', 'TEST-F2'],
          venueType: 'Sân 7',
          defaultPrice: 350000,
        })
        .expect(201);

      expect(res.body._id).toBeDefined();
      expect(res.body.courtCode).toBe('TEST-S7-A');
      expect(res.body.isComposite).toBe(true);
      expect(res.body.baseUnitCodes).toEqual(['TEST-F1', 'TEST-F2']);
      createdVenueIds.push(res.body._id);
    });

    it('Cập nhật sân ghép: Thêm mã sân con thành phần', async () => {
      const s7Id = createdVenueIds[createdVenueIds.length - 1];
      const updateRes = await request(app.getHttpServer())
        .patch(`/venues/${s7Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sân 7 Ghép A (Đã cập nhật)',
          baseUnitCodes: ['TEST-F1', 'TEST-F2', 'TEST-EXTRA'],
        })
        .expect(200);

      expect(updateRes.body.name).toBe('Sân 7 Ghép A (Đã cập nhật)');
      expect(updateRes.body.baseUnitCodes).toEqual(['TEST-F1', 'TEST-F2', 'TEST-EXTRA']);
    });

    it('Lấy danh sách Venues qua GET /venues và kiểm tra tính nhất quán', async () => {
      const listRes = await request(app.getHttpServer())
        .get(`/venues?facilityId=${defaultFacilityId}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      const testF1 = listRes.body.find((v: any) => v.courtCode === 'TEST-F1');
      const testS7 = listRes.body.find((v: any) => v.courtCode === 'TEST-S7-A');

      expect(testF1).toBeDefined();
      expect(testF1.isComposite).toBe(false);

      expect(testS7).toBeDefined();
      expect(testS7.isComposite).toBe(true);
    });
  });

  // ==========================================
  // 6. KIỂM THỬ SÂN GHÉP & SÂN CON CƠ SỞ (AC-23)
  // ==========================================
  describe('6. Sân Ghép & Sân Con Cơ Sở (AC-23: Đặt Sân 7A tự động chiếm và khóa F1 và F2)', () => {
    let venueF1Id: string;
    let venueF2Id: string;
    let venueS7AId: string;
    let testBookingDate: string;

    beforeAll(async () => {
      testBookingDate = '2026-11-20';

      // 1. Tạo 2 Sân con F1 và F2
      const f1Res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          name: 'Sân 5 Con F1 (AC23)',
          courtCode: 'AC23-F1',
          isComposite: false,
          baseUnitCodes: [],
          venueType: 'Sân 5',
          defaultPrice: 200000,
          basePricePerHour: 200000,
        })
        .expect(201);
      venueF1Id = f1Res.body._id;
      createdVenueIds.push(venueF1Id);

      const f2Res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          name: 'Sân 5 Con F2 (AC23)',
          courtCode: 'AC23-F2',
          isComposite: false,
          baseUnitCodes: [],
          venueType: 'Sân 5',
          defaultPrice: 200000,
          basePricePerHour: 200000,
        })
        .expect(201);
      venueF2Id = f2Res.body._id;
      createdVenueIds.push(venueF2Id);

      // 2. Tạo Sân ghép S7A gồm F1 và F2
      const s7Res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: defaultFacilityId,
          name: 'Sân 7 Ghép A (AC23)',
          courtCode: 'AC23-S7A',
          isComposite: true,
          baseUnitCodes: ['AC23-F1', 'AC23-F2'],
          venueType: 'Sân 7',
          defaultPrice: 350000,
          basePricePerHour: 350000,
        })
        .expect(201);
      venueS7AId = s7Res.body._id;
      createdVenueIds.push(venueS7AId);
    });

    it('Trường hợp 1: Đặt Sân ghép 7A -> Tự động chiếm và khóa các sân con F1 và F2 (AC-23)', async () => {
      // 1. Khách đặt giữ chỗ Sân 7A khung giờ 18:00 - 19:00
      const hold7ARes = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          venueId: venueS7AId,
          bookingDate: testBookingDate,
          startTime: '18:00',
          endTime: '19:00',
        })
        .expect(201);

      expect(hold7ARes.body._id).toBeDefined();
      expect(hold7ARes.body.status).toBe('HELD');
      createdBookingIds.push(hold7ARes.body._id);

      // 2. Thử đặt Sân con F1 ở cùng khung giờ 18:00 - 19:00 -> Phải bị từ chối 409 Conflict
      const holdF1Res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          venueId: venueF1Id,
          bookingDate: testBookingDate,
          startTime: '18:00',
          endTime: '19:00',
        })
        .expect(409);

      expect(holdF1Res.body.errorCode).toBe('SLOT_ALREADY_TAKEN');

      // 3. Thử đặt Sân con F2 ở cùng khung giờ 18:00 - 19:00 -> Phải bị từ chối 409 Conflict
      const holdF2Res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          venueId: venueF2Id,
          bookingDate: testBookingDate,
          startTime: '18:00',
          endTime: '19:00',
        })
        .expect(409);

      expect(holdF2Res.body.errorCode).toBe('SLOT_ALREADY_TAKEN');
    });

    it('Trường hợp 2: Đặt Sân con F1 -> Tự động chiếm và khóa Sân ghép 7A (AC-23 Chiều ngược lại)', async () => {
      // 1. Khách đặt giữ chỗ Sân con F1 khung giờ 20:00 - 21:00
      const holdF1Res = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          venueId: venueF1Id,
          bookingDate: testBookingDate,
          startTime: '20:00',
          endTime: '21:00',
        })
        .expect(201);

      expect(holdF1Res.body._id).toBeDefined();
      expect(holdF1Res.body.status).toBe('HELD');
      createdBookingIds.push(holdF1Res.body._id);

      // 2. Thử đặt Sân ghép 7A ở cùng khung giờ 20:00 - 21:00 -> Phải bị từ chối 409 Conflict vì con F1 đã bị chiếm
      const hold7ARes = await request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          venueId: venueS7AId,
          bookingDate: testBookingDate,
          startTime: '20:00',
          endTime: '21:00',
        })
        .expect(409);

      expect(hold7ARes.body.errorCode).toBe('SLOT_ALREADY_TAKEN');
    });

    it('Trường hợp 3: Slots Matrix phản ánh đúng slot bị chiếm bởi sân ghép/sân con', async () => {
      // 1. Kiểm tra Slots Matrix của Sân F1 tại ngày testBookingDate
      const f1MatrixRes = await request(app.getHttpServer())
        .get(`/bookings/slots?venueId=${venueF1Id}&date=${testBookingDate}`)
        .expect(200);

      const f1Slots = f1MatrixRes.body.slots || f1MatrixRes.body;
      const slot18_00 = f1Slots.find((s: any) => s.startTime === '18:00');
      expect(slot18_00).toBeDefined();
      expect(slot18_00.status).not.toBe('AVAILABLE');

      // 2. Kiểm tra Slots Matrix của Sân ghép S7A tại khung giờ 20:00 (F1 chiếm)
      const s7MatrixRes = await request(app.getHttpServer())
        .get(`/bookings/slots?venueId=${venueS7AId}&date=${testBookingDate}`)
        .expect(200);

      const s7Slots = s7MatrixRes.body.slots || s7MatrixRes.body;
      const slot20_00 = s7Slots.find((s: any) => s.startTime === '20:00');
      expect(slot20_00).toBeDefined();
      expect(slot20_00.status).not.toBe('AVAILABLE');
    });
  });

});
