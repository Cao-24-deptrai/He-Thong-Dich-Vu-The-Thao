import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Booking, BookingSchema, BookingDocument } from '../src/bookings/schemas/booking.schema';
import { BookingSlot, BookingSlotSchema, BookingSlotDocument } from '../src/bookings/schemas/booking-slot.schema';
import { Venue, VenueSchema, VenueDocument } from '../src/venues/schemas/venue.schema';
import { BookingsService } from '../src/bookings/bookings.service';
import { BookingsController } from '../src/bookings/bookings.controller';
import { RedisService } from '../src/redis/redis.service';
import { EventsGateway } from '../src/events/events.gateway';
import { VenueType, BookingStatus } from '../src/common/enums';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Bước 2.4: Nâng cấp Ma trận Tình trạng Trống 48 Slot (Availability Query - US-004)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let bookingModel: Model<BookingDocument>;
  let bookingSlotModel: Model<BookingSlotDocument>;
  let venueModel: Model<VenueDocument>;

  let facilityId: Types.ObjectId;
  let normalVenue: VenueDocument;
  let inactiveVenue: VenueDocument;
  const mockUserId = new Types.ObjectId().toString();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Booking.name, schema: BookingSchema },
          { name: BookingSlot.name, schema: BookingSlotSchema },
          { name: Venue.name, schema: VenueSchema },
        ]),
      ],
      controllers: [BookingsController],
      providers: [
        BookingsService,
        {
          provide: RedisService,
          useValue: {
            acquireLock: jest.fn().mockResolvedValue(true),
            releaseLock: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            broadcastSlotStatusChanged: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    bookingModel = moduleFixture.get<Model<BookingDocument>>(getModelToken(Booking.name));
    bookingSlotModel = moduleFixture.get<Model<BookingSlotDocument>>(getModelToken(BookingSlot.name));
    venueModel = moduleFixture.get<Model<VenueDocument>>(getModelToken(Venue.name));

    await bookingModel.init();
    await bookingSlotModel.init();

    facilityId = new Types.ObjectId();

    // Sân bóng hoạt động bình thường từ 06:00 đến 22:00, có giờ vàng 17:00-20:00
    normalVenue = await venueModel.create({
      facilityId,
      name: 'Sân bóng Mỹ Đình số 1',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      operatingHours: { openTime: '06:00', closeTime: '22:00' },
      pricingRules: {
        peakHours: [{ startTime: '17:00', endTime: '20:00', price: 400000 }],
      },
      isActive: true,
    });

    // Sân bảo trì (isActive = false)
    inactiveVenue = await venueModel.create({
      facilityId,
      name: 'Sân bóng đang sửa chữa',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      isActive: false,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Chuẩn hóa Cấu trúc Ma trận 48 Slot 30 phút (matrix48) - US-004', () => {
    it('GET /bookings/availability trả về đầy đủ 48 slot từ 00:00 đến 23:30', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=2026-11-25`)
        .expect(200);

      expect(res.body).toHaveProperty('matrix48');
      expect(res.body.matrix48.length).toBe(48);

      // Slot 0 bắt đầu từ 00:00
      expect(res.body.matrix48[0].slotIndex).toBe(0);
      expect(res.body.matrix48[0].startTime).toBe('00:00');
      expect(res.body.matrix48[0].endTime).toBe('00:30');

      // Slot 47 bắt đầu từ 23:30
      expect(res.body.matrix48[47].slotIndex).toBe(47);
      expect(res.body.matrix48[47].startTime).toBe('23:30');
      expect(res.body.matrix48[47].endTime).toBe('00:00');

      // Kiểm tra cấu trúc summary tổng kết
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary.total48).toBe(48);
      expect(res.body.summary.availableCount).toBeGreaterThan(0);
    });

    it('Tương thích ngược: Vẫn trả về mảng slots theo khung giờ hoạt động (16 slot)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=2026-11-25`)
        .expect(200);

      expect(res.body).toHaveProperty('slots');
      expect(res.body.slots.length).toBe(16); // 06:00 đến 22:00
    });
  });

  describe('2. Phân định 4 Trạng thái Chuẩn: AVAILABLE, HELD, CONFIRMED, MAINTENANCE', () => {
    const testDate = '2026-11-26';

    it('Trạng thái MAINTENANCE: Ngoài khung giờ mở cửa (trước 06:00 và sau 22:00)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=${testDate}`)
        .expect(200);

      // Slot 0 (00:00 - 00:30) ngoài giờ mở cửa -> MAINTENANCE
      expect(res.body.matrix48[0].status).toBe('MAINTENANCE');
      expect(res.body.matrix48[0].isOperating).toBe(false);

      // Slot 11 (05:30 - 06:00) ngoài giờ mở cửa -> MAINTENANCE
      expect(res.body.matrix48[11].status).toBe('MAINTENANCE');

      // Slot 44 (22:00 - 22:30) ngoài giờ mở cửa -> MAINTENANCE
      expect(res.body.matrix48[44].status).toBe('MAINTENANCE');
    });

    it('Trạng thái MAINTENANCE: Khi sân bị đóng (isActive = false) -> Toàn bộ 48 slot đều là MAINTENANCE', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${inactiveVenue._id}&date=${testDate}`)
        .expect(200);

      expect(res.body.summary.maintenanceCount).toBe(48);
      expect(res.body.matrix48.every((s: any) => s.status === 'MAINTENANCE')).toBe(true);
    });

    it('Trạng thái AVAILABLE: Trong giờ mở cửa (06:00 - 22:00) khi chưa có ai đặt', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=${testDate}`)
        .expect(200);

      // Slot 12 (06:00 - 06:30) -> AVAILABLE
      expect(res.body.matrix48[12].status).toBe('AVAILABLE');
      expect(res.body.matrix48[12].isOperating).toBe(true);
    });

    it('Trạng thái HELD: Khi có khách giữ chỗ -> Chuyển sang HELD kèm countdownSeconds', async () => {
      // Giữ chỗ lúc 08:00 - 09:00 (slot 16 & 17)
      await bookingsService.holdBooking(mockUserId, {
        venueId: normalVenue._id.toString(),
        bookingDate: testDate,
        startTime: '08:00',
        endTime: '09:00',
      });

      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=${testDate}`)
        .expect(200);

      // Slot 16 (08:00 - 08:30) và Slot 17 (08:30 - 09:00)
      expect(res.body.matrix48[16].status).toBe('HELD');
      expect(res.body.matrix48[16].holdExpiresAt).toBeDefined();
      expect(res.body.matrix48[16].countdownSeconds).toBeGreaterThan(0);

      expect(res.body.matrix48[17].status).toBe('HELD');
    });

    it('Trạng thái CONFIRMED: Khi đặt tại quầy hoặc thanh toán xong -> Chuyển sang CONFIRMED', async () => {
      // Đặt walk-in tại quầy lúc 14:00 - 15:00 (slot 28 & 29)
      await bookingsService.createWalkInBooking({
        venueId: normalVenue._id.toString(),
        bookingDate: testDate,
        startTime: '14:00',
        endTime: '15:00',
        customerName: 'Khách Chiều',
        paymentMethod: 'CASH',
      });

      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=${testDate}`)
        .expect(200);

      expect(res.body.matrix48[28].status).toBe('CONFIRMED');
      expect(res.body.matrix48[29].status).toBe('CONFIRMED');
    });
  });

  describe('3. Tự động Lọc bỏ & Giải phóng HELD quá hạn (Auto-purge Expired Holds)', () => {
    it('Đơn HELD đã quá hạn tự động giải phóng về AVAILABLE ngay trong truy vấn getAvailability', async () => {
      const purgeDate = '2026-11-28';
      // Tạo một đơn HELD lúc 10:00 - 11:00
      const expiredHold = await bookingsService.holdBooking(mockUserId, {
        venueId: normalVenue._id.toString(),
        bookingDate: purgeDate,
        startTime: '10:00',
        endTime: '11:00',
      });

      // Giả lập tua thời gian holdExpiresAt về 1 phút trước
      await bookingModel.updateOne(
        { _id: expiredHold._id },
        { $set: { holdExpiresAt: new Date(Date.now() - 60000) } },
      );
      await bookingSlotModel.updateMany(
        { bookingId: expiredHold._id },
        { $set: { holdExpiresAt: new Date(Date.now() - 60000) } },
      );

      // Gọi getAvailability -> Slot 10:00 (slot 20 & 21) phải tự động giải phóng về AVAILABLE
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=${purgeDate}`)
        .expect(200);

      expect(res.body.matrix48[20].status).toBe('AVAILABLE');
      expect(res.body.matrix48[21].status).toBe('AVAILABLE');
    });
  });

  describe('4. Tính giá linh hoạt theo block 30 phút & Giờ Vàng (Peak Hours)', () => {
    it('Block thường tính giá bằng 50% giá giờ cơ bản (150,000đ/30p)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=2026-11-29`)
        .expect(200);

      // Slot 12 (06:00 - 06:30) giờ thường: 300,000 / 2 = 150,000
      expect(res.body.matrix48[12].price).toBe(150000);
    });

    it('Block giờ vàng (17:00 - 20:00) tính giá bằng 50% giá giờ vàng (200,000đ/30p)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/availability?venueId=${normalVenue._id}&date=2026-11-29`)
        .expect(200);

      // Slot 34 (17:00 - 17:30) nằm trong khung peak 17:00-20:00 (400,000đ/h) -> 200,000đ
      expect(res.body.matrix48[34].price).toBe(200000);
    });
  });
});
