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
import { VenueType, BookingStatus, UserRole } from '../src/common/enums';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Bước 2.5: Luồng Đặt Sân Quầy Walk-in, Sân Ghép & Bảng Lịch Timeline Gantt (Web Admin)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let bookingModel: Model<BookingDocument>;
  let bookingSlotModel: Model<BookingSlotDocument>;
  let venueModel: Model<VenueDocument>;
  let eventsGateway: EventsGateway;

  let facilityId: Types.ObjectId;
  let venueF1: VenueDocument;
  let venueF2: VenueDocument;
  let venueS7A: VenueDocument;
  let venueS11: VenueDocument;
  const mockStaffId = new Types.ObjectId().toString();

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
          req.user = { userId: mockStaffId, role: UserRole.STAFF };
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
    eventsGateway = moduleFixture.get<EventsGateway>(EventsGateway);

    await bookingModel.init();
    await bookingSlotModel.init();

    facilityId = new Types.ObjectId();

    // Khởi tạo cụm sân bóng composite: F1, F2 -> ghép thành S7-A -> ghép thành S11
    venueF1 = await venueModel.create({
      facilityId,
      name: 'Sân 5 số 1 (F1)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 200000,
      operatingHours: { openTime: '06:00', closeTime: '23:00' },
      isActive: true,
    });

    venueF2 = await venueModel.create({
      facilityId,
      name: 'Sân 5 số 2 (F2)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 200000,
      operatingHours: { openTime: '06:00', closeTime: '23:00' },
      isActive: true,
    });

    venueS7A = await venueModel.create({
      facilityId,
      name: 'Sân 7 Ghép A (S7-A)',
      type: VenueType.FOOTBALL_7,
      basePricePerHour: 350000,
      operatingHours: { openTime: '06:00', closeTime: '23:00' },
      isActive: true,
    });

    venueS11 = await venueModel.create({
      facilityId,
      name: 'Sân 11 Tổ hợp Chuẩn (S11)',
      type: VenueType.FOOTBALL_11,
      basePricePerHour: 700000,
      operatingHours: { openTime: '06:00', closeTime: '23:00' },
      isActive: true,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Đặt nhanh tại quầy Lễ tân (Walk-in Booking with CASH)', () => {
    it('POST /bookings/walk-in tạo đơn ở trạng thái CONFIRMED ngay lập tức, không có holdExpiresAt', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .send({
          venueId: venueF1._id.toString(),
          bookingDate: '2026-12-01',
          startTime: '08:00',
          endTime: '09:00',
          customerName: 'Khách Lẻ Chơi Sáng',
          customerPhone: '0912345678',
          paymentMethod: 'CASH',
          note: 'Khách thanh toán tiền mặt trực tiếp',
        })
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.status).toBe(BookingStatus.CONFIRMED);
      expect(res.body.isWalkIn).toBe(true);
      expect(res.body.customerName).toBe('Khách Lẻ Chơi Sáng');
      expect(res.body.paymentMethod).toBe('CASH');
      expect(res.body.holdExpiresAt).toBeUndefined();

      // Kiểm tra broadcast WebSocket sự kiện slot_status_changed
      expect(eventsGateway.broadcastSlotStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          venueId: venueF1._id.toString(),
          status: BookingStatus.CONFIRMED,
        }),
      );
    });
  });

  describe('2. Khóa chéo Sân ghép tự động khi Đặt Quầy (Composite Pitch Lock)', () => {
    const testDate = '2026-12-02';

    it('Khi F1 được đặt tại quầy lúc 16:00 - 17:00 -> S7-A và S11 bị khóa tự động trong khung giờ đó', async () => {
      // 1. Lễ tân đặt quầy F1
      await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .send({
          venueId: venueF1._id.toString(),
          bookingDate: testDate,
          startTime: '16:00',
          endTime: '17:00',
          customerName: 'Khách Đá Chiều F1',
          customerPhone: '0988888888',
          paymentMethod: 'CASH',
        })
        .expect(201);

      // 2. Cố gắng đặt Sân 7 Ghép A (S7-A) ở cùng khung giờ -> Bị từ chối 409
      const resS7 = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .send({
          venueId: venueS7A._id.toString(),
          bookingDate: testDate,
          startTime: '16:00',
          endTime: '17:00',
          customerName: 'Khách S7',
          paymentMethod: 'CASH',
        })
        .expect(409);

      expect(resS7.body.message).toContain('Xung đột sân ghép');

      // 3. Cố gắng đặt Sân 11 (S11) ở cùng khung giờ -> Bị từ chối 409
      const resS11 = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .send({
          venueId: venueS11._id.toString(),
          bookingDate: testDate,
          startTime: '16:00',
          endTime: '17:00',
          customerName: 'Khách S11',
          paymentMethod: 'CASH',
        })
        .expect(409);

      expect(resS11.body.message).toContain('Xung đột sân ghép');

      // 4. Sân 5 số 2 (F2) không dùng chung mặt sân với F1 -> Vẫn đặt được bình thường
      const resF2 = await request(app.getHttpServer())
        .post('/bookings/walk-in')
        .send({
          venueId: venueF2._id.toString(),
          bookingDate: testDate,
          startTime: '16:00',
          endTime: '17:00',
          customerName: 'Khách Đá Chiều F2',
          paymentMethod: 'CASH',
        })
        .expect(201);

      expect(resF2.body.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('3. Đặt Lịch Định Kỳ Tại Quầy (Walk-in Recurring Booking)', () => {
    it('Kiểm tra Dry-run lịch trống và Khởi tạo chuỗi định kỳ tại quầy thành công', async () => {
      // 1. Dry-run precheck
      const checkRes = await request(app.getHttpServer())
        .post('/bookings/recurring/check')
        .send({
          venueId: venueF2._id.toString(),
          startDate: '2026-12-10',
          weekCount: 4,
          daysOfWeek: [4], // Thứ 5
          startTime: '19:00',
          endTime: '20:30',
        })
        .expect(200);

      expect(checkRes.body.hasConflict).toBe(false);
      expect(checkRes.body.conflictCount).toBe(0);
      expect(checkRes.body.totalSessions).toBe(4);

      // 2. Đặt chuỗi định kỳ tại quầy
      const createRes = await request(app.getHttpServer())
        .post('/bookings/recurring/walk-in')
        .send({
          venueId: venueF2._id.toString(),
          startDate: '2026-12-10',
          weekCount: 4,
          daysOfWeek: [4],
          startTime: '19:00',
          endTime: '20:30',
          customerName: 'FC Văn Phòng',
          customerPhone: '0901234567',
          paymentMethod: 'CASH',
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('recurringGroupId');
      expect(createRes.body.totalSessions).toBe(4);
      expect(createRes.body.bookings.every((b: any) => b.status === BookingStatus.CONFIRMED)).toBe(true);

      // 3. Tra cứu toàn bộ các buổi trong chuỗi theo recurringGroupId
      const listRes = await request(app.getHttpServer())
        .get(`/bookings/recurring/${createRes.body.recurringGroupId}`)
        .expect(200);

      expect(listRes.body.length).toBe(4);
    });
  });
});
