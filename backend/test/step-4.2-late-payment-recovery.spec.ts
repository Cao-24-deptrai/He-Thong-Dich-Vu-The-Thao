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
import {
  BOOKING_EVENTS,
  BookingConfirmedEvent,
  BookingCancelledEvent,
} from '../src/bookings/events/booking-events';
import { BookingStatus, VenueType } from '../src/common/enums';

describe('Bước 4.2: Tích hợp Hỗ trợ Cứu Đơn & Hủy Đơn (US-013, US-046) - Backend E2E', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let bookingSlotModel: Model<BookingSlot>;
  let userModel: Model<User>;
  let bookingsService: BookingsService;
  let eventEmitter: EventEmitter2;

  let staffToken: string;
  let staffId: string;
  let customer1Token: string;
  let customer1Id: string;
  let customer2Token: string;
  let customer2Id: string;

  let testFacilityId: string;
  let testVenueId: string;
  const testDate = '2026-11-28';

  const confirmedEvents: BookingConfirmedEvent[] = [];
  const cancelledEvents: BookingCancelledEvent[] = [];

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
    eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);

    eventEmitter.on(BOOKING_EVENTS.CONFIRMED, (event: BookingConfirmedEvent) => {
      confirmedEvents.push(event);
    });

    eventEmitter.on(BOOKING_EVENTS.CANCELLED, (event: BookingCancelledEvent) => {
      cancelledEvents.push(event);
    });

    // 1. Staff Token
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;
    staffId = staffLoginRes.body.user.id;

    // 2. Customer 1 Token
    const phoneC1 = '0966778899';
    await userModel.deleteOne({ phone: phoneC1 });
    const regRes1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneC1, password: 'Pass@123456', fullName: 'Khách Hàng 1' });
    customer1Token = regRes1.body.accessToken;
    customer1Id = regRes1.body.user.id;

    // 3. Customer 2 Token
    const phoneC2 = '0977889900';
    await userModel.deleteOne({ phone: phoneC2 });
    const regRes2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: phoneC2, password: 'Pass@123456', fullName: 'Khách Hàng 2' });
    customer2Token = regRes2.body.accessToken;
    customer2Id = regRes2.body.user.id;

    // 4. Facility & Venue
    const fac = new facilityModel({
      name: 'Tổ hợp Thể thao Cứu Đơn 4.2',
      address: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.2022, 16.0544] },
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    const ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân Cứu Đơn Riêng Biệt 42',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 300000,
      isActive: true,
      cancellationPolicy: {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      },
    });
    await ven.save();
    testVenueId = ven._id.toString();

    // Dọn dẹp dữ liệu cũ của venue nếu có
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
    await userModel.deleteMany({ phone: { $in: ['0966778899', '0977889900'] } });
    await app.close();
  });

  it('1. Cứu đơn (US-013): Khung giờ còn trống -> Cứu thành công, chuyển status CONFIRMED & cấp lại slot', async () => {
    // Tạo 1 đơn ban đầu và chuyển sang trạng thái EXPIRED (mô phỏng quá 10 phút giữ chỗ)
    const bookingDate = new Date(`${testDate}T00:00:00.000Z`);
    const expiredBooking = new bookingModel({
      bookingCode: 'BK-LATE-01',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate,
      startTime: '08:00',
      endTime: '09:00',
      totalPrice: 300000,
      status: BookingStatus.EXPIRED,
      holdExpiresAt: new Date(Date.now() - 60000), // đã quá hạn
    });
    await expiredBooking.save();

    // Bản ghi slot ban đầu cũng ở trạng thái EXPIRED
    await bookingSlotModel.insertMany([
      {
        bookingId: expiredBooking._id,
        venueId: expiredBooking.venueId,
        unitId: testVenueId,
        date: testDate,
        slotIndex: 16, // 08:00
        startTime: '08:00',
        endTime: '08:30',
        status: BookingStatus.EXPIRED,
      },
      {
        bookingId: expiredBooking._id,
        venueId: expiredBooking.venueId,
        unitId: testVenueId,
        date: testDate,
        slotIndex: 17, // 08:30
        startTime: '08:30',
        endTime: '09:00',
        status: BookingStatus.EXPIRED,
      },
    ]);

    const prevConfirmedCount = confirmedEvents.length;

    // Webhook hoặc Khách 1 gọi API cứu đơn
    const res = await request(app.getHttpServer())
      .post(`/bookings/${expiredBooking._id}/restore-late-payment`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ paymentDetails: { paymentMethod: 'PAYOS' } })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('CONFIRMED');
    expect(res.body.booking.status).toBe(BookingStatus.CONFIRMED);
    expect(res.body.booking.ticketCode).toBeDefined();

    // Kiểm tra DB
    const updated = await bookingModel.findById(expiredBooking._id).exec();
    expect(updated?.status).toBe(BookingStatus.CONFIRMED);
    expect(updated?.paymentMethod).toBe('PAYOS');

    // Kiểm tra bookingSlotModel được tái kích hoạt sang CONFIRMED
    const slots = await bookingSlotModel.find({ bookingId: expiredBooking._id }).exec();
    expect(slots.length).toBe(2);
    expect(slots.every((s) => s.status === BookingStatus.CONFIRMED)).toBe(true);

    // Kiểm tra Domain Event BOOKING_CONFIRMED được bắn
    expect(confirmedEvents.length).toBe(prevConfirmedCount + 1);
    const lastEvent = confirmedEvents[confirmedEvents.length - 1];
    expect(lastEvent.bookingId).toBe(expiredBooking._id.toString());
  });

  it('2. Cứu đơn (US-013 & US-046): Slot đã bị người khác đặt mất -> Kích hoạt hoàn tiền 100% (REFUND_PENDING)', async () => {
    const bookingDate = new Date(`${testDate}T00:00:00.000Z`);

    // Bước A: Khách 1 giữ chỗ khung giờ 10:00 - 11:00 nhưng bị hết hạn (EXPIRED)
    const customer1ExpiredBooking = new bookingModel({
      bookingCode: 'BK-LATE-CONFLICT',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate,
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 300000,
      status: BookingStatus.EXPIRED,
      holdExpiresAt: new Date(Date.now() - 120000),
    });
    await customer1ExpiredBooking.save();

    // Bước B: Trong lúc Khách 1 chuyển tiền chậm, Khách 2 đã vào đặt và CONFIRMED cùng slot
    const customer2Booking = new bookingModel({
      bookingCode: 'BK-COMPETITOR-TAKEN',
      userId: new Types.ObjectId(customer2Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate,
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
    });
    await customer2Booking.save();

    await bookingSlotModel.insertMany([
      {
        bookingId: customer2Booking._id,
        venueId: customer2Booking.venueId,
        unitId: testVenueId,
        date: testDate,
        slotIndex: 20, // 10:00
        startTime: '10:00',
        endTime: '10:30',
        status: BookingStatus.CONFIRMED,
      },
      {
        bookingId: customer2Booking._id,
        venueId: customer2Booking.venueId,
        unitId: testVenueId,
        date: testDate,
        slotIndex: 21, // 10:30
        startTime: '10:30',
        endTime: '11:00',
        status: BookingStatus.CONFIRMED,
      },
    ]);

    const prevCancelledCount = cancelledEvents.length;

    // Bước C: Webhook ngân hàng đến chậm cho Khách 1 -> Gọi cứu đơn
    const res = await request(app.getHttpServer())
      .post(`/bookings/${customer1ExpiredBooking._id}/restore-late-payment`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ paymentDetails: { paymentMethod: 'VIETQR' } })
      .expect(200);

    // Hệ thống KHÔNG ĐƯỢC PHÉP ghi đè slot (chống trùng lịch tuyệt đối)
    expect(res.body.success).toBe(false);
    expect(res.body.action).toBe('REFUND_PENDING');
    expect(res.body.reason).toBe('SLOTS_TAKEN');
    expect(res.body.refundRate).toBe(1.0); // Hoàn cọc 100%
    expect(res.body.refundAmount).toBe(300000);

    // Kiểm tra DB Khách 1 chuyển sang REFUND_PENDING
    const dbCustomer1 = await bookingModel.findById(customer1ExpiredBooking._id).exec();
    expect(dbCustomer1?.status).toBe(BookingStatus.REFUND_PENDING);
    expect(dbCustomer1?.refundRate).toBe(1.0);
    expect(dbCustomer1?.refundAmount).toBe(300000);

    // Slot của Khách 2 vẫn an toàn, không bị ghi đè
    const takenSlots = await bookingSlotModel.find({ bookingId: customer2Booking._id }).exec();
    expect(takenSlots.length).toBe(2);
    expect(takenSlots.every((s) => s.status === BookingStatus.CONFIRMED)).toBe(true);

    // Kiểm tra Domain Event BOOKING_CANCELLED được phát với hoàn cọc 100%
    expect(cancelledEvents.length).toBe(prevCancelledCount + 1);
    const lastCancelled = cancelledEvents[cancelledEvents.length - 1];
    expect(lastCancelled.bookingId).toBe(customer1ExpiredBooking._id.toString());
    expect(lastCancelled.refundRate).toBe(1.0);
    expect(lastCancelled.refundAmount).toBe(300000);
  });

  it('3. Idempotency: Gọi cứu đơn trên đơn đã CONFIRMED -> Trả về ALREADY_CONFIRMED an toàn', async () => {
    // Lấy 1 đơn đã CONFIRMED
    const confirmedBooking = new bookingModel({
      bookingCode: 'BK-ALREADY-CONFIRMED',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(`${testDate}T00:00:00.000Z`),
      startTime: '14:00',
      endTime: '15:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
    });
    await confirmedBooking.save();

    const res = await request(app.getHttpServer())
      .post(`/bookings/${confirmedBooking._id}/restore-late-payment`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('ALREADY_CONFIRMED');
  });

  it('4. RBAC: Khách hàng khác không được phép cứu đơn của người khác (403 Forbidden)', async () => {
    const expiredBooking = new bookingModel({
      bookingCode: 'BK-PROTECTED-RESCUE',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(`${testDate}T00:00:00.000Z`),
      startTime: '16:00',
      endTime: '17:00',
      totalPrice: 300000,
      status: BookingStatus.EXPIRED,
    });
    await expiredBooking.save();

    // Khách 2 gọi cứu đơn của Khách 1 -> 403 Forbidden
    await request(app.getHttpServer())
      .post(`/bookings/${expiredBooking._id}/restore-late-payment`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .expect(403);

    // Nhân viên Staff hỗ trợ tại quầy -> Được phép cứu đơn (200 OK)
    const staffRes = await request(app.getHttpServer())
      .post(`/bookings/${expiredBooking._id}/restore-late-payment`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(staffRes.body.success).toBe(true);
  });

  it('5. Chính sách hủy đơn US-046: Hủy trước giờ bắt đầu > 24h -> Hoàn tiền 100% (refundRate = 1.0)', async () => {
    // Đặt đơn vào 5 ngày sau (> 24h)
    const futureDate = '2026-12-05';
    const booking = new bookingModel({
      bookingCode: 'BK-REFUND-100',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date(`${futureDate}T00:00:00.000Z`),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      policySnapshot: {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      },
    });
    await booking.save();

    const res = await request(app.getHttpServer())
      .post(`/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ reason: 'Bận đột xuất đổi lịch' })
      .expect(200);

    expect(res.body.status).toBe(BookingStatus.CANCELLED);
    expect(res.body.refundRate).toBe(1.0);
    expect(res.body.refundAmount).toBe(300000);

    const dbBooking = await bookingModel.findById(booking._id).exec();
    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(dbBooking?.refundRate).toBe(1.0);
    expect(dbBooking?.refundAmount).toBe(300000);
    expect(dbBooking?.refundNote).toBe('Bận đột xuất đổi lịch');
  });

  it('6. Chính sách hủy đơn US-046: Hủy trước giờ bắt đầu trong khoảng 2h - 24h -> Hoàn cọc 50% (refundRate = 0.5)', async () => {
    // Giả lập khung giờ: Ngày 2026-11-20 lúc 18:00
    // refDate giả lập là 2026-11-20 lúc 08:00 (cách 10 giờ, tức nằm trong 2h - 24h)
    const booking = new bookingModel({
      bookingCode: 'BK-REFUND-50',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-20T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      policySnapshot: {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      },
    });
    await booking.save();

    const refDate = new Date(2026, 10, 20, 8, 0, 0); // 2026-11-20 08:00 (cách 10 tiếng)
    const result = await bookingsService.cancelBooking(
      booking._id.toString(),
      customer1Id,
      'Hủy trước 10 tiếng',
      refDate,
    );

    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(result.refundRate).toBe(0.5);
    expect(result.refundAmount).toBe(150000); // 300k * 0.5
  });

  it('7. Chính sách hủy đơn US-046: Hủy trước giờ bắt đầu < 2h -> Không hoàn tiền (refundRate = 0.0)', async () => {
    // Giả lập khung giờ: Ngày 2026-11-20 lúc 18:00
    // refDate giả lập là 2026-11-20 lúc 17:00 (cách đúng 1 giờ, tức < 2h)
    const booking = new bookingModel({
      bookingCode: 'BK-REFUND-0',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-11-20T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      policySnapshot: {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      },
    });
    await booking.save();

    const refDate = new Date(2026, 10, 20, 17, 0, 0); // cách 1 giờ trước giờ đá
    const result = await bookingsService.cancelBooking(
      booking._id.toString(),
      customer1Id,
      'Hủy gấp trước 1 tiếng',
      refDate,
    );

    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(result.refundRate).toBe(0.0);
    expect(result.refundAmount).toBe(0);
  });

  it('8. RBAC Hủy đơn: Khách hàng không thể hủy đơn của khách khác (403 Forbidden)', async () => {
    const booking = new bookingModel({
      bookingCode: 'BK-CANCEL-PROTECTED',
      userId: new Types.ObjectId(customer1Id),
      venueId: new Types.ObjectId(testVenueId),
      bookingDate: new Date('2026-12-01T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '19:00',
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
    });
    await booking.save();

    // Khách 2 cố tình hủy đơn của Khách 1
    await request(app.getHttpServer())
      .post(`/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .expect(403);
  });
});
