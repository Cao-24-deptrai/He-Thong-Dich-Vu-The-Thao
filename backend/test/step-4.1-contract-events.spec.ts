import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { BookingSlot } from '../src/bookings/schemas/booking-slot.schema';
import { User } from '../src/users/schemas/user.schema';
import { BookingsService } from '../src/bookings/bookings.service';
import { CheckinService } from '../src/checkin/checkin.service';
import {
  BOOKING_EVENTS,
  BookingHeldEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  BookingCheckedInEvent,
} from '../src/bookings/events/booking-events';
import { BookingStatus, VenueType } from '../src/common/enums';

describe('Bước 4.1: Thiết lập Contract & Event Emitter Độc Lập (Backend E2E)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let bookingSlotModel: Model<BookingSlot>;
  let userModel: Model<User>;
  let bookingsService: BookingsService;
  let checkinService: CheckinService;
  let eventEmitter: EventEmitter2;

  let staffToken: string;
  let staffId: string;
  let customerToken: string;
  let customerId: string;

  let testFacilityId: string;
  let testVenueId: string;
  const testDate = '2026-11-25';

  // Mock event capture arrays
  const heldEvents: BookingHeldEvent[] = [];
  const confirmedEvents: BookingConfirmedEvent[] = [];
  const cancelledEvents: BookingCancelledEvent[] = [];
  const checkedInEvents: BookingCheckedInEvent[] = [];

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
    bookingSlotModel = moduleFixture.get<Model<BookingSlot>>(getModelToken(BookingSlot.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    checkinService = moduleFixture.get<CheckinService>(CheckinService);
    eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);

    // Đăng ký Event Listeners mô phỏng các module độc lập (Payments của Huyền, Notifications của Ngọc)
    eventEmitter.on(BOOKING_EVENTS.HELD, (event: BookingHeldEvent) => {
      heldEvents.push(event);
    });

    eventEmitter.on(BOOKING_EVENTS.CONFIRMED, (event: BookingConfirmedEvent) => {
      confirmedEvents.push(event);
    });

    eventEmitter.on(BOOKING_EVENTS.CANCELLED, (event: BookingCancelledEvent) => {
      cancelledEvents.push(event);
    });

    eventEmitter.on(BOOKING_EVENTS.CHECKED_IN, (event: BookingCheckedInEvent) => {
      checkedInEvents.push(event);
    });

    // 1. Staff Token
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;
    staffId = staffLoginRes.body.user.id;

    // 2. Customer
    const phoneC = '0955667788';
    await userModel.deleteOne({ phone: phoneC });
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneC, password: 'Pass@123456', fullName: 'Đặng Văn Lâm' });
    customerToken = regRes.body.accessToken;
    customerId = regRes.body.user.id;

    // 3. Facility & Venue
    const fac = new facilityModel({
      name: 'Tổ hợp Contract Event 4.1',
      address: 'Hà Nội',
      location: { type: 'Point', coordinates: [105.7725, 21.0185] },
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân Riêng Biệt Event 41',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 200000,
      isActive: true,
    });
    await ven.save();
    testVenueId = ven._id.toString();

    // Dọn dẹp dữ liệu cũ nếu có
    await bookingSlotModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
    await bookingModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
  });

  afterAll(async () => {
    if (testFacilityId) {
      await bookingSlotModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
      await bookingModel.deleteMany({ venueId: new Types.ObjectId(testVenueId) });
      await venueModel.deleteMany({ facilityId: new Types.ObjectId(testFacilityId) });
      await facilityModel.deleteMany({ _id: new Types.ObjectId(testFacilityId) });
    }
    await userModel.deleteMany({ phone: '0955667788' });
    await app.close();
  });

  it('1. Giữ chỗ (holdBooking) -> Bắn sự kiện booking.held qua EventEmitter2 với payload chuẩn', async () => {
    const holdRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '08:00',
        endTime: '09:00',
      })
      .expect(201);

    expect(heldEvents.length).toBeGreaterThanOrEqual(1);
    const lastHeld = heldEvents[heldEvents.length - 1];
    expect(lastHeld.bookingId).toBe(holdRes.body._id);
    expect(lastHeld.venueId).toBe(testVenueId);
    expect(lastHeld.startTime).toBe('08:00');
    expect(lastHeld.endTime).toBe('09:00');
    expect(lastHeld.userId).toBe(customerId);
    expect(lastHeld.holdExpiresAt).toBeDefined();
  });

  it('2. Đặt tại quầy Walk-in CASH -> Bắn sự kiện booking.confirmed qua EventEmitter2', async () => {
    const walkInRes = await request(app.getHttpServer())
      .post('/bookings/walk-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '09:00',
        endTime: '10:00',
        customerName: 'Nguyễn Walkin',
        customerPhone: '0911222333',
        paymentMethod: 'CASH',
      })
      .expect(201);

    expect(confirmedEvents.length).toBeGreaterThanOrEqual(1);
    const lastConfirmed = confirmedEvents[confirmedEvents.length - 1];
    expect(lastConfirmed.bookingId).toBe(walkInRes.body._id);
    expect(lastConfirmed.paymentMethod).toBe('CASH');
    expect(lastConfirmed.customerName).toBe('Nguyễn Walkin');
    expect(lastConfirmed.bookingCode).toBeDefined();
    expect(lastConfirmed.isRecurring).toBe(false);
  });

  it('3. Hàm confirmBooking chuyển trạng thái -> Bắn sự kiện booking.confirmed độc lập', async () => {
    // Tạo 1 đơn HELD
    const holdRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(201);

    const prevCount = confirmedEvents.length;

    // Gọi confirmBooking (mô phỏng Webhook của Huyền hoặc Admin xác nhận)
    const confirmed = await bookingsService.confirmBooking(holdRes.body._id, {
      paymentMethod: 'PAYOS',
    });

    expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
    expect(confirmedEvents.length).toBe(prevCount + 1);

    const last = confirmedEvents[confirmedEvents.length - 1];
    expect(last.bookingId).toBe(holdRes.body._id);
    expect(last.paymentMethod).toBe('PAYOS');
  });

  it('4. Hủy đơn (cancelBooking) -> Bắn sự kiện booking.cancelled', async () => {
    // Lấy 1 đơn để hủy
    const holdRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: testDate,
        startTime: '11:00',
        endTime: '12:00',
      })
      .expect(201);

    const prevCount = cancelledEvents.length;

    await request(app.getHttpServer())
      .post(`/bookings/${holdRes.body._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(cancelledEvents.length).toBe(prevCount + 1);
    const lastCancelled = cancelledEvents[cancelledEvents.length - 1];
    expect(lastCancelled.bookingId).toBe(holdRes.body._id);
    expect(lastCancelled.venueId).toBe(testVenueId);
  });

  it('5. Quét QR Check-in (scanCheckin) -> Bắn sự kiện booking.checked_in', async () => {
    // Tạo đơn CONFIRMED
    const booking = new bookingModel({
      bookingCode: 'BK-EVT-CHECKIN',
      ticketCode: 'TCK-EVT-01',
      userId: new Types.ObjectId(customerId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(testDate),
      startTime: '14:00',
      endTime: '15:00',
      totalPrice: 200000,
      status: BookingStatus.CONFIRMED,
      isCheckedIn: false,
    });
    await booking.save();

    // Lấy QR
    const qrRes = await request(app.getHttpServer())
      .get(`/bookings/${booking._id}/qr`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const prevCount = checkedInEvents.length;

    // Staff quét
    await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: qrRes.body.qrToken })
      .expect(200);

    expect(checkedInEvents.length).toBe(prevCount + 1);
    const lastCheckedIn = checkedInEvents[checkedInEvents.length - 1];
    expect(lastCheckedIn.bookingId).toBe(booking._id.toString());
    expect(lastCheckedIn.checkinMethod).toBe('QR');
    expect(lastCheckedIn.checkedInBy).toBe(staffId);
  });

  it('6. Check-in thủ công (manualCheckin) -> Bắn sự kiện booking.checked_in với checkinMethod: MANUAL', async () => {
    const booking = new bookingModel({
      bookingCode: 'BK-EVT-MANUAL',
      ticketCode: 'TCK-EVT-02',
      userId: new Types.ObjectId(customerId),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(testDate),
      startTime: '15:00',
      endTime: '16:00',
      totalPrice: 200000,
      status: BookingStatus.CONFIRMED,
      isCheckedIn: false,
    });
    await booking.save();

    const prevCount = checkedInEvents.length;

    await request(app.getHttpServer())
      .post('/checkin/manual')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        bookingId: booking._id.toString(),
        note: 'Khách quên điện thoại, xác minh tên và SĐT tại quầy',
      })
      .expect(200);

    expect(checkedInEvents.length).toBe(prevCount + 1);
    const lastCheckedIn = checkedInEvents[checkedInEvents.length - 1];
    expect(lastCheckedIn.bookingId).toBe(booking._id.toString());
    expect(lastCheckedIn.checkinMethod).toBe('MANUAL');
  });

  it('7. Đặt định kỳ (createWalkInRecurringBooking) -> Bắn sự kiện booking.confirmed cho tất cả các buổi trong chuỗi', async () => {
    const prevCount = confirmedEvents.length;

    const recurringRes = await request(app.getHttpServer())
      .post('/bookings/recurring/walk-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        venueId: testVenueId,
        startDate: '2026-12-05',
        weekCount: 3,
        dayOfWeek: 6, // Thứ 7
        startTime: '16:00',
        endTime: '17:00',
        customerName: 'Khách Đặt Định Kỳ',
        customerPhone: '0988776655',
        paymentMethod: 'CASH',
      })
      .expect(201);

    expect(recurringRes.body.totalSessions).toBe(3);
    // Đúng 3 sự kiện CONFIRMED được phát ra cho 3 buổi
    expect(confirmedEvents.length).toBe(prevCount + 3);

    const recurringEvents = confirmedEvents.slice(prevCount);
    for (const evt of recurringEvents) {
      expect(evt.isRecurring).toBe(true);
      expect(evt.recurringGroupId).toBe(recurringRes.body.recurringGroupId);
      expect(evt.paymentMethod).toBe('CASH');
    }
  });
});
