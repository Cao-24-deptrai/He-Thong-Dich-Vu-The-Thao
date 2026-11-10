import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';
import { BookingSlot } from '../src/bookings/schemas/booking-slot.schema';
import { User } from '../src/users/schemas/user.schema';
import { BookingsService, PITCH_LEAF_UNITS } from '../src/bookings/bookings.service';
import { CheckinService } from '../src/checkin/checkin.service';
import { BookingStatus, UserRole, VenueType } from '../src/common/enums';

describe('Bước 4.3: Kiểm Thử Tải Concurrency & Tổng Nghiệm Thu Definition of Done (DoD)', () => {
  let app: INestApplication;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let bookingSlotModel: Model<BookingSlot>;
  let userModel: Model<User>;
  let jwtService: JwtService;
  let bookingsService: BookingsService;
  let checkinService: CheckinService;

  let staffToken: string;
  let staffId: string;
  let testFacilityId: string;
  let singleVenueId: string;
  let s11VenueId: string;
  let s7VenueId: string;
  let f1VenueId: string;

  const testDate = '2026-12-15';
  const customerTokens: string[] = [];
  const createdUserIds: Types.ObjectId[] = [];

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
    jwtService = moduleFixture.get<JwtService>(JwtService);
    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    checkinService = moduleFixture.get<CheckinService>(CheckinService);

    // 1. Staff Auth
    const staffLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0988888888', password: 'Staff@123456' });
    staffToken = staffLoginRes.body.accessToken;
    staffId = staffLoginRes.body.user.id;

    // 2. Khởi tạo hàng loạt 50 users giả lập để kiểm thử áp lực 50 requests đồng thời
    const userDocs: any[] = [];
    for (let i = 1; i <= 50; i++) {
      const uid = new Types.ObjectId();
      createdUserIds.push(uid);
      const phone = `09900000${i < 10 ? '0' + i : i}`;
      userDocs.push({
        _id: uid,
        phone,
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        fullName: `Stress User ${i}`,
        role: UserRole.CUSTOMER,
        isActive: true,
      });
      customerTokens.push(
        jwtService.sign({
          sub: uid.toString(),
          phone,
          role: UserRole.CUSTOMER,
        }),
      );
    }
    await userModel.deleteMany({ _id: { $in: createdUserIds } });
    await userModel.insertMany(userDocs);

    // 3. Khởi tạo Cơ sở và Các loại Sân (Sân đơn lẻ & Hệ thống Sân Ghép Composite)
    const fac = new facilityModel({
      name: 'Đại Tổ Hợp Thể Thao Concurrency DoD 4.3',
      address: 'TP. Hồ Chí Minh',
      location: { type: 'Point', coordinates: [106.6601, 10.7626] },
      isActive: true,
    });
    await fac.save();
    testFacilityId = fac._id.toString();

    // Sân đơn lẻ F1 độc lập
    const singleVen = new venueModel({
      facilityId: fac._id,
      name: 'Sân Đơn Lẻ Concurrency 50 Users',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 200000,
      isActive: true,
    });
    await singleVen.save();
    singleVenueId = singleVen._id.toString();

    // Cụm Sân Ghép: S11 (Đại tổ hợp), S7-A (Sân 7), F1 (Sân 5 con)
    const s11Ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân 11 S11 Đại Tổ Hợp',
      type: VenueType.FOOTBALL_11,
      basePricePerHour: 1000000,
      isActive: true,
      pricingRules: { pitchCode: 'S11' },
    });
    await s11Ven.save();
    s11VenueId = s11Ven._id.toString();

    const s7Ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân 7 S7-A Ghép Cụm',
      type: VenueType.FOOTBALL_7,
      basePricePerHour: 500000,
      isActive: true,
      pricingRules: { pitchCode: 'S7-A' },
    });
    await s7Ven.save();
    s7VenueId = s7Ven._id.toString();

    const f1Ven = new venueModel({
      facilityId: fac._id,
      name: 'Sân 5 F1 Sân Con',
      type: VenueType.FOOTBALL_5,
      basePricePerHour: 200000,
      isActive: true,
      pricingRules: { pitchCode: 'F1' },
    });
    await f1Ven.save();
    f1VenueId = f1Ven._id.toString();

    // Dọn dẹp dữ liệu cũ của các sân này
    const allVenIds = [singleVenueId, s11VenueId, s7VenueId, f1VenueId].map((id) => new Types.ObjectId(id));
    await bookingSlotModel.deleteMany({ venueId: { $in: allVenIds } });
    await bookingModel.deleteMany({ venueId: { $in: allVenIds } });
  });

  afterAll(async () => {
    if (testFacilityId) {
      const allVenIds = [singleVenueId, s11VenueId, s7VenueId, f1VenueId].map((id) => new Types.ObjectId(id));
      await bookingSlotModel.deleteMany({ venueId: { $in: allVenIds } });
      await bookingModel.deleteMany({ venueId: { $in: allVenIds } });
      await venueModel.deleteMany({ facilityId: new Types.ObjectId(testFacilityId) });
      await facilityModel.deleteMany({ _id: new Types.ObjectId(testFacilityId) });
    }
    await userModel.deleteMany({ _id: { $in: createdUserIds } });
    await app.close();
  });

  it('1. ÁP LỰC ĐỒNG THỜI (CONCURRENCY 50 REQUESTS): Bắn 50 request cùng lúc vào 1 slot -> DUY NHẤT 1 thành công (201), 49 bị chặn (409)', async () => {
    const targetSlot = '18:00';
    const targetEnd = '19:00';

    // Bắn 50 requests giữ chỗ đồng thời qua Promise.all
    const promises = customerTokens.map((token) =>
      request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${token}`)
        .send({
          venueId: singleVenueId,
          bookingDate: testDate,
          startTime: targetSlot,
          endTime: targetEnd,
        }),
    );

    const responses = await Promise.all(promises);

    const successRes = responses.filter((r) => r.status === 201);
    const conflictRes = responses.filter((r) => r.status === 409);

    // Tiêu chí 1: Đúng duy nhất 1 request thành công
    expect(successRes.length).toBe(1);
    expect(successRes[0].body.status).toBe(BookingStatus.HELD);
    expect(successRes[0].body.bookingCode).toBeDefined();

    // Tiêu chí 2: Đúng 49 requests còn lại nhận 409 Conflict với error code rõ ràng
    expect(conflictRes.length).toBe(49);
    conflictRes.forEach((res) => {
      expect(['SLOT_MUTEX_LOCKED', 'SLOT_ALREADY_TAKEN']).toContain(res.body.errorCode);
    });

    // Tiêu chí 3: Tuyệt đối không sinh 2 bản ghi trùng trong cơ sở dữ liệu MongoDB
    const bookingsInDb = await bookingModel
      .find({
        venueId: new Types.ObjectId(singleVenueId),
        bookingDate: new Date(`${testDate}T00:00:00.000Z`),
        startTime: targetSlot,
        status: BookingStatus.HELD,
      })
      .exec();
    expect(bookingsInDb.length).toBe(1);

    // Tiêu chí 4: Bảng booking_slots có đúng 2 slot 30 phút (18:00-18:30 và 18:30-19:00), không có duplicate key
    const slotsInDb = await bookingSlotModel
      .find({
        venueId: new Types.ObjectId(singleVenueId),
        date: testDate,
        slotIndex: { $in: [36, 37] },
      })
      .exec();
    expect(slotsInDb.length).toBe(2);
    expect(slotsInDb.every((s) => s.status === BookingStatus.HELD)).toBe(true);
  });

  it('2. SÂN GHÉP COMPOSITE CONCURRENCY: Giữ Sân 11 (S11) -> Các sân con F1 và S7-A cùng khung giờ lập tức bị chặn 409', async () => {
    const slotStart = '20:00';
    const slotEnd = '21:00';

    // Bước A: Khách hàng 1 giữ Sân 11 S11 (chiếm trọn F1..F6)
    const holdS11Res = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .send({
        venueId: s11VenueId,
        bookingDate: testDate,
        startTime: slotStart,
        endTime: slotEnd,
      })
      .expect(201);

    expect(holdS11Res.body.status).toBe(BookingStatus.HELD);

    // Bước B: Đồng thời 10 requests thử giữ Sân 7 (S7-A) và 10 requests thử giữ Sân 5 (F1)
    const s7Requests = customerTokens.slice(1, 11).map((tok) =>
      request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${tok}`)
        .send({
          venueId: s7VenueId,
          bookingDate: testDate,
          startTime: slotStart,
          endTime: slotEnd,
        }),
    );

    const f1Requests = customerTokens.slice(11, 21).map((tok) =>
      request(app.getHttpServer())
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${tok}`)
        .send({
          venueId: f1VenueId,
          bookingDate: testDate,
          startTime: slotStart,
          endTime: slotEnd,
        }),
    );

    const [s7Results, f1Results] = await Promise.all([
      Promise.all(s7Requests),
      Promise.all(f1Requests),
    ]);

    // Toàn bộ 10 request S7-A phải bị từ chối 409
    expect(s7Results.every((r) => r.status === 409)).toBe(true);
    // Toàn bộ 10 request F1 phải bị từ chối 409
    expect(f1Results.every((r) => r.status === 409)).toBe(true);

    // Bước C: Hủy đơn S11 -> S7-A lập tức có thể được giữ chỗ bình thường
    await request(app.getHttpServer())
      .post(`/bookings/${holdS11Res.body._id}/cancel`)
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .expect(200);

    const holdS7Res = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerTokens[1]}`)
      .send({
        venueId: s7VenueId,
        bookingDate: testDate,
        startTime: slotStart,
        endTime: slotEnd,
      })
      .expect(201);

    expect(holdS7Res.body.status).toBe(BookingStatus.HELD);
  });

  it('3. SOÁT VÉ CHECK-IN ĐA CỔNG (MULTI-GATE SCAN CONCURRENCY): 10 cổng soát vé quét đồng thời cùng 1 mã QR -> Chỉ DUY NHẤT 1 cổng thành công, 9 cổng báo ALREADY_CHECKED_IN', async () => {
    // Tạo 1 đơn đã thanh toán CONFIRMED
    const booking = new bookingModel({
      bookingCode: 'BK-MULTIGATE-CONCURRENCY',
      ticketCode: 'TCK-GATE-999',
      userId: createdUserIds[0],
      venueId: new Types.ObjectId(singleVenueId),
      bookingDate: new Date(`${testDate}T00:00:00.000Z`),
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 200000,
      status: BookingStatus.CONFIRMED,
      isCheckedIn: false,
    });
    await booking.save();

    // Lấy dynamic QR token
    const qrRes = await request(app.getHttpServer())
      .get(`/bookings/${booking._id}/qr`)
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .expect(200);

    const { qrToken } = qrRes.body;

    // 10 cổng soát vé gửi request check-in cùng lúc qua Promise.all
    const scanPromises = Array.from({ length: 10 }).map(() =>
      request(app.getHttpServer())
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken }),
    );

    const scanResponses = await Promise.all(scanPromises);

    const successScans = scanResponses.filter((r) => r.status === 200);
    const duplicateScans = scanResponses.filter((r) => r.status === 409);

    // Chỉ đúng 1 cổng thành công
    expect(successScans.length).toBe(1);
    expect(successScans[0].body.booking.isCheckedIn).toBe(true);

    // 9 cổng còn lại bị từ chối 409 với mã lỗi ALREADY_CHECKED_IN
    expect(duplicateScans.length).toBe(9);
    duplicateScans.forEach((r) => {
      expect(r.body.message).toMatch(/đã được check-in|ALREADY_CHECKED_IN/i);
    });

    // DB chỉ có đúng 1 bản ghi được đánh dấu checkedIn
    const refreshedBooking = await bookingModel.findById(booking._id).exec();
    expect(refreshedBooking?.isCheckedIn).toBe(true);
    expect(refreshedBooking?.checkedInAt).toBeDefined();
  });

  it('4. CỨU ĐƠN TRANH CHẤP (LATE PAYMENT RECOVERY CONCURRENCY): 2 đơn cùng tranh chấp slot đã hết hạn -> Chỉ 1 cứu thành công CONFIRMED, đơn còn lại tự động REFUND_PENDING 100%', async () => {
    const bookingDate = new Date(`${testDate}T00:00:00.000Z`);

    // Đơn A hết hạn
    const bookingA = new bookingModel({
      bookingCode: 'BK-RESCUE-A',
      userId: createdUserIds[0],
      venueId: new Types.ObjectId(singleVenueId),
      bookingDate,
      startTime: '14:00',
      endTime: '15:00',
      totalPrice: 200000,
      status: BookingStatus.EXPIRED,
    });
    await bookingA.save();

    // Đơn B cũng hết hạn cho cùng 1 khung giờ 14:00 - 15:00
    const bookingB = new bookingModel({
      bookingCode: 'BK-RESCUE-B',
      userId: createdUserIds[1],
      venueId: new Types.ObjectId(singleVenueId),
      bookingDate,
      startTime: '14:00',
      endTime: '15:00',
      totalPrice: 200000,
      status: BookingStatus.EXPIRED,
    });
    await bookingB.save();

    // Cả 2 webhook xác nhận tiền về cùng 1 tích tắc
    const [rescueA, rescueB] = await Promise.all([
      bookingsService.restoreExpiredHoldForLatePayment(bookingA._id.toString()),
      bookingsService.restoreExpiredHoldForLatePayment(bookingB._id.toString()),
    ]);

    const results = [rescueA, rescueB];
    const confirmedOne = results.find((r) => r.action === 'CONFIRMED');
    const refundedOne = results.find((r) => r.action === 'REFUND_PENDING');

    // Đúng 1 đơn thành công xác nhận CONFIRMED
    expect(confirmedOne).toBeDefined();
    expect(confirmedOne?.success).toBe(true);

    // Đơn còn lại tự động chuyển sang hoàn cọc 100%
    expect(refundedOne).toBeDefined();
    expect(refundedOne?.success).toBe(false);
    expect(refundedOne?.refundRate).toBe(1.0);
    expect(refundedOne?.refundAmount).toBe(200000);

    // Kiểm tra DB: tuyệt đối không có 2 đơn CONFIRMED cùng slot
    const confirmedInDb = await bookingModel
      .find({
        venueId: new Types.ObjectId(singleVenueId),
        bookingDate,
        startTime: '14:00',
        status: BookingStatus.CONFIRMED,
      })
      .exec();
    expect(confirmedInDb.length).toBe(1);
  });

  it('5. TỔNG THỂ DEFINITION OF DONE (DoD): Luồng khép kín E2E Hold -> Pay -> QR 60s -> Checkin -> Audit', async () => {
    // 1. Giữ chỗ
    const holdRes = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .send({
        venueId: singleVenueId,
        bookingDate: testDate,
        startTime: '21:00',
        endTime: '22:00',
      })
      .expect(201);

    const bookingId = holdRes.body._id;

    // 2. Xác nhận thanh toán qua Contract (confirmBooking)
    const confirmed = await bookingsService.confirmBooking(bookingId, { paymentMethod: 'PAYOS' });
    expect(confirmed.status).toBe(BookingStatus.CONFIRMED);

    // 3. Khách hàng lấy Dynamic QR pass 60s
    const qrRes = await request(app.getHttpServer())
      .get(`/bookings/${bookingId}/qr`)
      .set('Authorization', `Bearer ${customerTokens[0]}`)
      .expect(200);

    expect(qrRes.body.qrToken).toBeDefined();

    // 4. Lễ tân quét mã check-in
    const scanRes = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrToken: qrRes.body.qrToken })
      .expect(200);

    expect(scanRes.body.booking.isCheckedIn).toBe(true);
    expect(scanRes.body.booking.checkinMethod).toBe('QR');

    // 5. Kiểm tra audit log trong database
    const finalBooking = await bookingModel.findById(bookingId).exec();
    expect(finalBooking?.isCheckedIn).toBe(true);
    expect(finalBooking?.checkedInBy?.toString()).toBe(staffId);
    expect(finalBooking?.checkedInAt).toBeDefined();
  });
});
