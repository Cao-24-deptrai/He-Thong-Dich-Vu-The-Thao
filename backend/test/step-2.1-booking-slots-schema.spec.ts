import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Booking, BookingSchema, BookingDocument } from '../src/bookings/schemas/booking.schema';
import { BookingSlot, BookingSlotSchema, BookingSlotDocument } from '../src/bookings/schemas/booking-slot.schema';
import { Venue, VenueSchema, VenueDocument } from '../src/venues/schemas/venue.schema';
import { BookingsService } from '../src/bookings/bookings.service';
import { RedisService } from '../src/redis/redis.service';
import { EventsGateway } from '../src/events/events.gateway';
import { BookingStatus, VenueType, BookingSource } from '../src/common/enums';

describe('Bước 2.1: Hoàn thiện Schema Booking & Bảng BookingSlots chống trùng lịch 3 lớp', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let bookingModel: Model<BookingDocument>;
  let bookingSlotModel: Model<BookingSlotDocument>;
  let venueModel: Model<VenueDocument>;
  let venueId: string;
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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    bookingModel = moduleFixture.get<Model<BookingDocument>>(getModelToken(Booking.name));
    bookingSlotModel = moduleFixture.get<Model<BookingSlotDocument>>(getModelToken(BookingSlot.name));
    venueModel = moduleFixture.get<Model<VenueDocument>>(getModelToken(Venue.name));

    // Khởi tạo index trên MongoDB Memory Server
    await bookingModel.init();
    await bookingSlotModel.init();

    // Tạo sân mẫu
    const venue = await venueModel.create({
      facilityId: new Types.ObjectId(),
      name: 'Sân bóng Mỹ Đình số 1',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      cancellationPolicy: {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      },
    });
    venueId = venue._id.toString();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Cấu trúc trường mới của Booking Schema & Bất biến BR-05', () => {
    it('Mã đặt chỗ tự sinh chuẩn định dạng BK-YYYYMMDD-XXXX', () => {
      const code = bookingsService.generateBookingCode('2026-11-01');
      expect(code).toMatch(/^BK-20261101-[A-Z0-9]{4}$/);
    });

    it('Chuyển đổi linh hoạt giữa giờ HH:mm và chỉ số slot 30 phút (0..47)', () => {
      expect(bookingsService.timeToSlotIndex('00:00')).toBe(0);
      expect(bookingsService.timeToSlotIndex('00:30')).toBe(1);
      expect(bookingsService.timeToSlotIndex('06:00')).toBe(12);
      expect(bookingsService.timeToSlotIndex('18:00')).toBe(36);
      expect(bookingsService.timeToSlotIndex('18:30')).toBe(37);
      expect(bookingsService.timeToSlotIndex('19:00')).toBe(38);

      expect(bookingsService.slotIndexToTime(0)).toBe('00:00');
      expect(bookingsService.slotIndexToTime(12)).toBe('06:00');
      expect(bookingsService.slotIndexToTime(36)).toBe('18:00');
      expect(bookingsService.slotIndexToTime(37)).toBe('18:30');

      const blocks = bookingsService.getSlotsForRange('18:00', '19:00');
      expect(blocks.length).toBe(2);
      expect(blocks[0]).toEqual({ slotIndex: 36, startTime: '18:00', endTime: '18:30' });
      expect(blocks[1]).toEqual({ slotIndex: 37, startTime: '18:30', endTime: '19:00' });
    });
  });

  describe('2. LỚP 3 BẢO VỆ: Unique Compound Index trên Bảng BookingSlot', () => {
    const dummyBookingId1 = new Types.ObjectId();
    const dummyBookingId2 = new Types.ObjectId();

    it('Tạo BookingSlot đầu tiên thành công với status=HELD', async () => {
      const slot = await bookingSlotModel.create({
        bookingId: dummyBookingId1,
        venueId: new Types.ObjectId(venueId),
        unitId: 'F1',
        date: '2026-11-05',
        slotIndex: 36,
        startTime: '18:00',
        endTime: '18:30',
        status: BookingStatus.HELD,
      });

      expect(slot).toBeDefined();
      expect(slot.unitId).toBe('F1');
      expect(slot.slotIndex).toBe(36);
    });

    it('Tạo BookingSlot trùng lặp { unitId, date, slotIndex } với status=CONFIRMED -> Bị từ chối bởi Mongo E11000 Unique Index', async () => {
      let duplicateError: any;
      try {
        await bookingSlotModel.create({
          bookingId: dummyBookingId2,
          venueId: new Types.ObjectId(venueId),
          unitId: 'F1', // Trùng F1
          date: '2026-11-05', // Trùng ngày
          slotIndex: 36, // Trùng slot 18:00-18:30
          startTime: '18:00',
          endTime: '18:30',
          status: BookingStatus.CONFIRMED,
        });
      } catch (err: any) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000);
    });

    it('Khi slot cũ chuyển sang CANCELLED hoặc EXPIRED -> Cho phép đặt lại chính slot đó (Partial Index filter)', async () => {
      // Cập nhật slot cũ sang CANCELLED
      await bookingSlotModel.updateOne(
        { unitId: 'F1', date: '2026-11-05', slotIndex: 36 },
        { $set: { status: BookingStatus.CANCELLED } },
      );

      // Đặt lại chính slot 36 cho khách hàng mới -> Phải thành công
      const rebookedSlot = await bookingSlotModel.create({
        bookingId: dummyBookingId2,
        venueId: new Types.ObjectId(venueId),
        unitId: 'F1',
        date: '2026-11-05',
        slotIndex: 36,
        startTime: '18:00',
        endTime: '18:30',
        status: BookingStatus.HELD,
      });

      expect(rebookedSlot).toBeDefined();
      expect(rebookedSlot.status).toBe(BookingStatus.HELD);
    });
  });

  describe('3. Tích hợp BookingsService: Tạo Booking kèm BookingSlots & Snapshot BR-05', () => {
    let createdBooking: BookingDocument;

    it('holdBooking tạo cả Booking và các block BookingSlot 30 phút tương ứng', async () => {
      createdBooking = await bookingsService.holdBooking(mockUserId, {
        venueId,
        bookingDate: '2026-11-10',
        startTime: '19:00',
        endTime: '20:00',
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.bookingCode).toMatch(/^BK-20261110-[A-Z0-9]{4}$/);
      expect(createdBooking.priceSnapshot).toBeDefined();
      expect(createdBooking.priceSnapshot?.basePricePerHour).toBe(300000);
      expect(createdBooking.policySnapshot).toBeDefined();
      expect(createdBooking.policySnapshot?.hoursBeforeForFullRefund).toBe(24);

      // Kiểm tra 2 block 30p được tạo trong bookingSlotModel (19:00-19:30 và 19:30-20:00)
      const slots = await bookingSlotModel.find({ bookingId: createdBooking._id });
      expect(slots.length).toBe(2);
      expect(slots.map((s) => s.slotIndex)).toEqual([38, 39]);
      expect(slots.every((s) => s.status === BookingStatus.HELD)).toBe(true);
    });

    it('cancelBooking giải phóng cả Booking và các block BookingSlot sang CANCELLED', async () => {
      const cancelResult = await bookingsService.cancelBooking(
        createdBooking._id.toString(),
        mockUserId,
      );

      expect(cancelResult.status).toBe(BookingStatus.CANCELLED);

      // Xác minh slots đã cập nhật sang CANCELLED
      const slots = await bookingSlotModel.find({ bookingId: createdBooking._id });
      expect(slots.every((s) => s.status === BookingStatus.CANCELLED)).toBe(true);
    });

    it('createWalkInBooking tại quầy ghi nhận Booking và BookingSlots ở trạng thái CONFIRMED', async () => {
      const walkIn = await bookingsService.createWalkInBooking({
        venueId,
        bookingDate: '2026-11-12',
        startTime: '14:00',
        endTime: '15:00',
        customerName: 'Khách Vãng Lai',
        customerPhone: '0901234567',
        paymentMethod: 'CASH',
      });

      expect(walkIn.status).toBe(BookingStatus.CONFIRMED);
      expect(walkIn.bookingSource).toBe(BookingSource.WALK_IN);
      expect(walkIn.bookingCode).toMatch(/^BK-20261112-[A-Z0-9]{4}$/);

      const slots = await bookingSlotModel.find({ bookingId: walkIn._id });
      expect(slots.length).toBe(2);
      expect(slots.every((s) => s.status === BookingStatus.CONFIRMED)).toBe(true);
    });

    it('cleanExpiredBookings chuyển các Booking và BookingSlot hết hạn sang EXPIRED', async () => {
      // Giả lập 1 booking hết hạn
      const expiredHold = await bookingsService.holdBooking(mockUserId, {
        venueId,
        bookingDate: '2026-11-15',
        startTime: '10:00',
        endTime: '11:00',
      });

      // Tua thời gian holdExpiresAt về quá khứ
      await bookingModel.updateOne(
        { _id: expiredHold._id },
        { $set: { holdExpiresAt: new Date(Date.now() - 60000) } },
      );

      const cleanedCount = await bookingsService.cleanExpiredBookings();
      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      const refreshedSlots = await bookingSlotModel.find({ bookingId: expiredHold._id });
      expect(refreshedSlots.every((s) => s.status === BookingStatus.EXPIRED)).toBe(true);
    });
  });
});
