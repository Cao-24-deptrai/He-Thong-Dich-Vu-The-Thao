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
import { VenueType, BookingStatus, BookingSource, UserRole } from '../src/common/enums';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Bước 2.3: Xây dựng Đặt sân Định kỳ (Recurring Booking - FR-04, US-027)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let bookingModel: Model<BookingDocument>;
  let bookingSlotModel: Model<BookingSlotDocument>;
  let venueModel: Model<VenueDocument>;

  let facilityId: Types.ObjectId;
  let venueF1: VenueDocument;
  let venueS11: VenueDocument;
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
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: mockUserId, role: UserRole.STAFF };
          return true;
        },
      })
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

    venueF1 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 5 số 1 (F1)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      pricingRules: { pitchCode: 'F1' },
    });

    venueS11 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 11 Mỹ Đình (S11)',
      type: VenueType.FOOTBALL_11,
      basePricePerHour: 1200000,
      pricingRules: { pitchCode: 'S11' },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Thuật toán sinh danh sách ngày định kỳ (Recurring Dates Generator)', () => {
    it('Sinh chính xác chuỗi ngày 4 tuần cố định cách nhau 7 ngày', () => {
      const dates = bookingsService.generateRecurringDates('2026-11-05', 4);
      expect(dates).toEqual([
        '2026-11-05',
        '2026-11-12',
        '2026-11-19',
        '2026-11-26',
      ]);
    });

    it('Sinh chuỗi ngày lặp lại theo thứ trong tuần (VD: Thứ 3 và Thứ 5)', () => {
      // 2026-11-05 là Thứ 5 (day 4). Chọn ngày Thứ 3 (day 2) và Thứ 5 (day 4) cho 2 tuần
      const dates = bookingsService.generateRecurringDates('2026-11-05', 2, [2, 4]);
      expect(dates).toContain('2026-11-05'); // Buổi 1: Thứ 5 tuần 1
      expect(dates).toContain('2026-11-10'); // Buổi 2: Thứ 3 tuần 2
      expect(dates).toContain('2026-11-12'); // Buổi 3: Thứ 5 tuần 2
    });
  });

  describe('2. Kiểm tra trước tính khả dụng (Dry-run: POST /bookings/recurring/check)', () => {
    it('Khi toàn bộ chuỗi 4 tuần đều trống -> hasConflict = false, conflictCount = 0', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/recurring/check')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2026-12-03',
          startTime: '18:00',
          endTime: '19:00',
          weekCount: 4,
        })
        .expect(200);

      expect(res.body.hasConflict).toBe(false);
      expect(res.body.conflictCount).toBe(0);
      expect(res.body.availableDates.length).toBe(4);
    });

    it('Khi có 1 buổi bị trùng lịch -> hasConflict = true kèm chi tiết buổi bị xung đột', async () => {
      // Khách vãng lai đặt trước buổi tuần thứ 2 (2026-12-10)
      await bookingsService.holdBooking(mockUserId, {
        venueId: venueF1._id.toString(),
        bookingDate: '2026-12-10',
        startTime: '18:00',
        endTime: '19:00',
      });

      const res = await request(app.getHttpServer())
        .post('/bookings/recurring/check')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2026-12-03',
          startTime: '18:00',
          endTime: '19:00',
          weekCount: 4,
        })
        .expect(200);

      expect(res.body.hasConflict).toBe(true);
      expect(res.body.conflictCount).toBe(1);
      expect(res.body.conflicts[0].date).toBe('2026-12-10');
      expect(res.body.availableDates.length).toBe(3);
    });
  });

  describe('3. Đặt chuỗi định kỳ Online (POST /bookings/recurring) & Bảo vệ Atomic All-or-Nothing', () => {
    it('Nếu phát hiện xung đột lịch dù chỉ 1 buổi -> Từ chối toàn bộ với HTTP 409 RECURRING_DATES_CONFLICT', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/recurring')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2026-12-03', // Ngày này có buổi 2026-12-10 bị trùng
          startTime: '18:00',
          endTime: '19:00',
          weekCount: 4,
        })
        .expect(409);

      expect(res.body.errorCode).toBe('RECURRING_DATES_CONFLICT');
      expect(res.body).toHaveProperty('conflicts');
      expect(res.body.conflicts.length).toBe(1);
    });

    it('Khi toàn bộ chuỗi khả dụng -> Khởi tạo chuỗi thành công với chung recurringGroupId', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/recurring')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2027-01-07',
          startTime: '19:00',
          endTime: '20:00',
          weekCount: 4,
        })
        .expect(201);

      expect(res.body).toHaveProperty('recurringGroupId');
      expect(res.body.weekCount).toBe(4);
      expect(res.body.totalSessions).toBe(4);
      expect(res.body.totalPrice).toBe(300000 * 4);
      expect(res.body.status).toBe(BookingStatus.HELD);
      expect(res.body.bookings.length).toBe(4);

      // Xác minh tất cả bookings đều có cờ isRecurring: true và chung recurringGroupId
      const saved = await bookingModel.find({ recurringGroupId: res.body.recurringGroupId });
      expect(saved.length).toBe(4);
      expect(saved.every((b) => b.isRecurring === true)).toBe(true);
      expect(saved.every((b) => b.recurringGroupId === res.body.recurringGroupId)).toBe(true);
    });
  });

  describe('4. Xung đột Sân Ghép trong Chuỗi Định kỳ (Composite Conflict in Recurring)', () => {
    it('Khi Sân 11 bị đặt ở tuần thứ 3 -> Chuỗi đặt định kỳ Sân 5 bị phát hiện xung đột và từ chối', async () => {
      // Đặt Sân 11 vào ngày 2027-02-18 (tuần 3)
      await bookingsService.holdBooking(mockUserId, {
        venueId: venueS11._id.toString(),
        bookingDate: '2027-02-18',
        startTime: '18:00',
        endTime: '19:00',
      });

      // Thử đặt định kỳ 4 tuần Sân 5 con F1
      const res = await request(app.getHttpServer())
        .post('/bookings/recurring')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2027-02-04',
          startTime: '18:00',
          endTime: '19:00',
          weekCount: 4,
        })
        .expect(409);

      expect(res.body.errorCode).toBe('RECURRING_DATES_CONFLICT');
      expect(res.body.conflicts[0].date).toBe('2027-02-18');
    });
  });

  describe('5. Đặt định kỳ tại quầy Lễ tân (Walk-in Recurring) & Xem chi tiết chuỗi', () => {
    let createdGroupId: string;

    it('POST /bookings/recurring/walk-in -> Khởi tạo chuỗi thành công ở trạng thái CONFIRMED', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/recurring/walk-in')
        .send({
          venueId: venueF1._id.toString(),
          startDate: '2027-03-04',
          startTime: '07:00',
          endTime: '08:00',
          weekCount: 3,
          customerName: 'Anh Tuấn FC',
          customerPhone: '0912999888',
          paymentMethod: 'CASH',
        })
        .expect(201);

      createdGroupId = res.body.recurringGroupId;
      expect(res.body.status).toBe(BookingStatus.CONFIRMED);
      expect(res.body.totalSessions).toBe(3);

      const slots = await bookingSlotModel.find({
        bookingId: { $in: res.body.bookings.map((b: any) => b._id) },
      });
      expect(slots.every((s) => s.status === BookingStatus.CONFIRMED)).toBe(true);
    });

    it('GET /bookings/recurring/:groupId -> Trả về danh sách toàn bộ các buổi trong chuỗi', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/recurring/${createdGroupId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].customerName).toBe('Anh Tuấn FC');
      expect(res.body[0].status).toBe(BookingStatus.CONFIRMED);
    });
  });
});
