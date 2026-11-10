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
import { VenueType, BookingStatus } from '../src/common/enums';

describe('Bước 2.2: Thuật toán giải quyết xung đột Sân Ghép (Composite Pitches Engine)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let bookingsService: BookingsService;
  let bookingModel: Model<BookingDocument>;
  let bookingSlotModel: Model<BookingSlotDocument>;
  let venueModel: Model<VenueDocument>;

  let facilityId: Types.ObjectId;
  let venueS11: VenueDocument;
  let venueS7A: VenueDocument;
  let venueS7B: VenueDocument;
  let venueF1: VenueDocument;
  let venueF2: VenueDocument;
  let venueF3: VenueDocument;

  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const userC = new Types.ObjectId().toString();

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

    await bookingModel.init();
    await bookingSlotModel.init();

    facilityId = new Types.ObjectId();

    // Khởi tạo cụm sân bóng đá tổ hợp:
    // 1 Sân 11 (S11)
    venueS11 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 11 người Mỹ Đình (S11)',
      type: VenueType.FOOTBALL_11,
      basePricePerHour: 1200000,
      pricingRules: { pitchCode: 'S11' },
    });

    // 2 Sân 7 (S7-A ghép F1+F2, S7-B ghép F3+F4)
    venueS7A = await venueModel.create({
      facilityId,
      name: 'Sân bóng 7 người A (S7-A)',
      type: VenueType.FOOTBALL_7,
      basePricePerHour: 600000,
      pricingRules: { pitchCode: 'S7-A' },
    });

    venueS7B = await venueModel.create({
      facilityId,
      name: 'Sân bóng 7 người B (S7-B)',
      type: VenueType.FOOTBALL_7,
      basePricePerHour: 600000,
      pricingRules: { pitchCode: 'S7-B' },
    });

    // Các sân 5 cơ sở (F1, F2, F3)
    venueF1 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 5 số 1 (F1)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      pricingRules: { pitchCode: 'F1' },
    });

    venueF2 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 5 số 2 (F2)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      pricingRules: { pitchCode: 'F2' },
    });

    venueF3 = await venueModel.create({
      facilityId,
      name: 'Sân bóng 5 số 3 (F3)',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      pricingRules: { pitchCode: 'F3' },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  describe('1. Phân rã liên đới tài nguyên cơ sở (Hierarchy Decomposition)', () => {
    it('Sân 11 liên đới toàn bộ 6 sân 5 cơ sở [F1, F2, F3, F4, F5, F6]', () => {
      const units = bookingsService.resolveLeafUnits(venueS11);
      expect(units).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    });

    it('Sân 7-A liên đới đúng 2 sân cơ sở [F1, F2]', () => {
      const units = bookingsService.resolveLeafUnits(venueS7A);
      expect(units).toEqual(['F1', 'F2']);
    });

    it('Sân 7-B liên đới đúng 2 sân cơ sở [F3, F4]', () => {
      const units = bookingsService.resolveLeafUnits(venueS7B);
      expect(units).toEqual(['F3', 'F4']);
    });

    it('Sân 5 số 1 (F1) liên đới đúng duy nhất sân cơ sở [F1]', () => {
      const units = bookingsService.resolveLeafUnits(venueF1);
      expect(units).toEqual(['F1']);
    });
  });

  describe('2. Khóa liên hoàn từ Sân Cha xuống Sân Con (Top-down Conflict)', () => {
    const testDate = '2026-11-20';
    const startTime = '18:00';
    const endTime = '19:00';

    it('Khách A đặt Sân 11 (S11) thành công', async () => {
      const booking = await bookingsService.holdBooking(userA, {
        venueId: venueS11._id.toString(),
        bookingDate: testDate,
        startTime,
        endTime,
      });

      expect(booking).toBeDefined();
      expect(booking.status).toBe(BookingStatus.HELD);
    });

    it('Khách B đặt Sân 5 con (F1) cùng giờ -> BỊ CHẶN do F1 là thành phần của S11 đã chiếm', async () => {
      await expect(
        bookingsService.holdBooking(userB, {
          venueId: venueF1._id.toString(),
          bookingDate: testDate,
          startTime,
          endTime,
        }),
      ).rejects.toThrow(/Xung đột sân ghép/);
    });

    it('Khách C đặt Sân 7 con (S7-A) cùng giờ -> BỊ CHẶN do S7-A chứa F1+F2 thuộc S11 đã chiếm', async () => {
      await expect(
        bookingsService.holdBooking(userC, {
          venueId: venueS7A._id.toString(),
          bookingDate: testDate,
          startTime,
          endTime,
        }),
      ).rejects.toThrow(/Xung đột sân ghép/);
    });
  });

  describe('3. Khóa liên hoàn từ Sân Con lên Sân Cha (Bottom-up Conflict)', () => {
    const testDate = '2026-11-21';
    const startTime = '08:00';
    const endTime = '09:00';

    it('Khách A đặt Sân 5 (F1) thành công', async () => {
      const booking = await bookingsService.holdBooking(userA, {
        venueId: venueF1._id.toString(),
        bookingDate: testDate,
        startTime,
        endTime,
      });

      expect(booking).toBeDefined();
      expect(booking.status).toBe(BookingStatus.HELD);
    });

    it('Khách B đặt Sân 7-A (chứa F1) cùng giờ -> BỊ CHẶN do F1 đã bị chiếm', async () => {
      await expect(
        bookingsService.holdBooking(userB, {
          venueId: venueS7A._id.toString(),
          bookingDate: testDate,
          startTime,
          endTime,
        }),
      ).rejects.toThrow(/Xung đột sân ghép/);
    });

    it('Khách C đặt Sân 11 (chứa F1) cùng giờ -> BỊ CHẶN do F1 đã bị chiếm', async () => {
      await expect(
        bookingsService.holdBooking(userC, {
          venueId: venueS11._id.toString(),
          bookingDate: testDate,
          startTime,
          endTime,
        }),
      ).rejects.toThrow(/Xung đột sân ghép/);
    });

    it('Khách D đặt Sân 5 số 2 (F2) cùng giờ -> THÀNH CÔNG (F2 độc lập với F1)', async () => {
      const bookingF2 = await bookingsService.holdBooking(userB, {
        venueId: venueF2._id.toString(),
        bookingDate: testDate,
        startTime,
        endTime,
      });

      expect(bookingF2).toBeDefined();
      expect(bookingF2.status).toBe(BookingStatus.HELD);
    });

    it('Khách E đặt Sân 7-B (ghép F3+F4) cùng giờ -> THÀNH CÔNG (không liên quan đến F1, F2)', async () => {
      const bookingS7B = await bookingsService.holdBooking(userC, {
        venueId: venueS7B._id.toString(),
        bookingDate: testDate,
        startTime,
        endTime,
      });

      expect(bookingS7B).toBeDefined();
      expect(bookingS7B.status).toBe(BookingStatus.HELD);
    });
  });

  describe('4. Hiển thị Lịch trống (Availability) đồng bộ cho Sân Ghép', () => {
    it('Lịch trống của Sân 11 tại 08:00 (ngày 2026-11-21) tự động chuyển sang HELD do F1 đã chiếm', async () => {
      const availS11 = await bookingsService.getAvailability(venueS11._id.toString(), '2026-11-21');
      const slot08 = availS11.slots.find((s) => s.startTime === '08:00');
      expect(slot08).toBeDefined();
      expect(slot08?.status).toBe(BookingStatus.HELD);
    });

    it('Lịch trống của Sân 7-A tại 08:00 tự động chuyển sang HELD do F1 đã chiếm', async () => {
      const availS7A = await bookingsService.getAvailability(venueS7A._id.toString(), '2026-11-21');
      const slot08 = availS7A.slots.find((s) => s.startTime === '08:00');
      expect(slot08).toBeDefined();
      expect(slot08?.status).toBe(BookingStatus.HELD);
    });

    it('Lịch trống của Sân 5 số 3 (F3) tại 08:00 tự động chuyển sang HELD (do Khách E đã đặt S7-B bao hàm F3)', async () => {
      const availF3 = await bookingsService.getAvailability(venueF3._id.toString(), '2026-11-21');
      const slot08 = availF3.slots.find((s) => s.startTime === '08:00');
      expect(slot08).toBeDefined();
      expect(slot08?.status).toBe(BookingStatus.HELD);
    });

    it('Lịch trống của Sân 5 số 3 (F3) tại 10:00 vẫn là AVAILABLE (chưa ai đặt khung giờ 10:00)', async () => {
      const availF3 = await bookingsService.getAvailability(venueF3._id.toString(), '2026-11-21');
      const slot10 = availF3.slots.find((s) => s.startTime === '10:00');
      expect(slot10).toBeDefined();
      expect(slot10?.status).toBe('AVAILABLE');
    });
  });
});
