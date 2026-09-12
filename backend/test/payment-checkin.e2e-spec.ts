import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import configuration from '../src/config/configuration';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { BookingStatus, PaymentStatus, VenueType, UserRole } from '../src/common/enums';

describe('BƯỚC 3: Thanh Toán, Webhook Idempotency, Late Webhook & QR Check-in Động', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let server: any;
  let venueId: string;
  let customerToken: string;
  let customerId: string;
  let staffToken: string;
  let adminToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    await app.listen(0);
    server = app.getHttpServer();

    // 1. Tạo Customer
    const resCustomer = await request(server).post('/auth/register').send({
      phone: '0933333333',
      password: 'Password@123',
      fullName: 'Khách Hàng Thanh Toán',
    });
    customerToken = resCustomer.body.accessToken;
    customerId = resCustomer.body.user.id;

    // 2. Tạo Staff
    const resStaff = await request(server).post('/auth/register').send({
      phone: '0977777777',
      password: 'Password@123',
      fullName: 'Nhân Viên Quét Vé',
      role: UserRole.STAFF,
    });
    staffToken = resStaff.body.accessToken;

    // 3. Tạo Admin
    const resAdmin = await request(server).post('/auth/register').send({
      phone: '0989999999',
      password: 'Password@123',
      fullName: 'Quản Trị Hoàn Tiền',
      role: UserRole.ADMIN,
    });
    adminToken = resAdmin.body.accessToken;

    // 4. Tạo Venue mẫu
    const venueModel = app.get('VenueModel');
    const venue = await venueModel.create({
      facilityId: new Types.ObjectId(),
      name: 'Sân Tennis Số 1',
      type: VenueType.TENNIS,
      basePricePerHour: 200000,
    });
    venueId = venue._id.toString();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('3.1. Tạo link thanh toán (POST /payments/create-link)', () => {
    let heldBookingId: string;

    beforeEach(async () => {
      const res = await request(server)
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId,
          bookingDate: '2026-09-30',
          startTime: '10:00',
          endTime: '11:00',
        });
      heldBookingId = res.body._id;
    });

    it('Tạo link thanh toán thành công cho đơn HELD -> Trả về checkoutUrl và QR', async () => {
      const res = await request(server)
        .post('/payments/create-link')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId: heldBookingId,
          returnUrl: 'https://mysports.vn/success',
        })
        .expect(201);

      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body).toHaveProperty('qrCode');
      expect(res.body.amount).toBe(200000);
      expect(res.body.status).toBe('PENDING');
    });

    it('Từ chối tạo link thanh toán khi người gọi không phải chủ nhân đơn đặt', async () => {
      // Đăng ký user khác
      const otherRes = await request(server).post('/auth/register').send({
        phone: '0944444444',
        password: 'Password@123',
        fullName: 'Người Lạ',
      });
      const otherToken = otherRes.body.accessToken;

      await request(server)
        .post('/payments/create-link')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ bookingId: heldBookingId })
        .expect(400);
    });
  });

  describe('3.2. Webhook Thanh Toán Đúng Hạn & Idempotency (Mục 4.2)', () => {
    let validBookingId: string;
    const testOrderCode = 888123;
    const testTransactionId = 'TXN_PAYOS_888123';

    beforeAll(async () => {
      const res = await request(server)
        .post('/bookings/hold')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          venueId,
          bookingDate: '2026-10-01',
          startTime: '14:00',
          endTime: '15:00',
        });
      validBookingId = res.body._id;
    });

    it('Xử lý webhook đúng hạn: Booking -> CONFIRMED, Payment -> SUCCESS, sinh qrToken', async () => {
      const webhookPayload = {
        code: '00',
        desc: 'success',
        data: {
          orderCode: testOrderCode,
          amount: 200000,
          description: `BOOKING_${validBookingId}`,
          bookingId: validBookingId,
          reference: testTransactionId,
        },
        transactionId: testTransactionId,
        idempotencyKey: `IDEM_${testTransactionId}`,
      };

      const res = await request(server)
        .post('/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(res.body.bookingStatus).toBe(BookingStatus.CONFIRMED);
      expect(res.body).toHaveProperty('qrToken');

      // Kiểm tra DB
      const bookingModel = app.get('BookingModel');
      const updatedBooking = await bookingModel.findById(validBookingId);
      expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);

      const paymentModel = app.get('PaymentModel');
      const payment = await paymentModel.findOne({ bookingId: validBookingId });
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.rawPayload).toBeDefined(); // Đối soát
    });

    it('IDEMPOTENCY: Gửi lại webhook y hệt lần 2 -> Trả về HTTP 200 ngay, không xử lý lại', async () => {
      const webhookPayload = {
        code: '00',
        desc: 'success',
        data: {
          orderCode: testOrderCode,
          amount: 200000,
          bookingId: validBookingId,
          reference: testTransactionId,
        },
        transactionId: testTransactionId,
        idempotencyKey: `IDEM_${testTransactionId}`,
      };

      const res = await request(server)
        .post('/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(res.body.message).toContain('Idempotent');

      // Đảm bảo không tạo thêm payment record trùng lặp
      const paymentModel = app.get('PaymentModel');
      const count = await paymentModel.countDocuments({ bookingId: validBookingId });
      expect(count).toBe(1);
    });
  });

  describe('3.3. Late Webhook (Thanh toán muộn) & Hoàn tiền thủ công (Mục 4.2 & 4.4)', () => {
    let lateBookingId: string;
    const lateTxnId = 'TXN_LATE_999999';

    beforeAll(async () => {
      const bookingModel = app.get('BookingModel');
      // Tạo 1 booking đã bị quá hạn (EXPIRED)
      const lateBooking = await bookingModel.create({
        userId: new Types.ObjectId(customerId),
        venueId: new Types.ObjectId(venueId),
        bookingDate: new Date('2026-10-02T00:00:00.000Z'),
        startTime: '16:00',
        endTime: '17:00',
        totalPrice: 200000,
        status: BookingStatus.EXPIRED,
      });
      lateBookingId = lateBooking._id.toString();
    });

    it('LATE WEBHOOK: Khách thanh toán sau khi đơn đã EXPIRED -> Chuyển sang REFUND_PENDING', async () => {
      const webhookPayload = {
        code: '00',
        data: {
          orderCode: 999999,
          amount: 200000,
          bookingId: lateBookingId,
          reference: lateTxnId,
        },
        transactionId: lateTxnId,
        idempotencyKey: `IDEM_${lateTxnId}`,
      };

      const res = await request(server)
        .post('/payments/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(res.body.bookingStatus).toBe(BookingStatus.REFUND_PENDING);

      // Kiểm tra DB
      const bookingModel = app.get('BookingModel');
      const booking = await bookingModel.findById(lateBookingId);
      expect(booking.status).toBe(BookingStatus.REFUND_PENDING);

      const paymentModel = app.get('PaymentModel');
      const payment = await paymentModel.findOne({ bookingId: lateBookingId });
      expect(payment.status).toBe(PaymentStatus.REFUND_PENDING);
    });

    it('Admin xem danh sách đơn chờ hoàn tiền (GET /admin/refund-pending)', async () => {
      const res = await request(server)
        .get('/admin/refund-pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((item: any) => item.bookingId === lateBookingId);
      expect(found).toBeDefined();
      expect(found.customerPhone).toBe('0933333333');
      expect(found.amount).toBe(200000);
    });

    it('Admin xác nhận đã hoàn tiền thủ công (PATCH /admin/refund/:id) -> Chuyển sang REFUNDED', async () => {
      const res = await request(server)
        .patch(`/admin/refund/${lateBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.bookingStatus).toBe(BookingStatus.REFUNDED);
      expect(res.body.paymentStatus).toBe(PaymentStatus.REFUNDED);

      // Kiểm tra DB
      const bookingModel = app.get('BookingModel');
      const booking = await bookingModel.findById(lateBookingId);
      expect(booking.status).toBe(BookingStatus.REFUNDED);
    });
  });

  describe('3.4. QR Check-in Động (Mục 4.5)', () => {
    let confirmedBookingId: string;
    let validQrToken: string;

    beforeAll(async () => {
      const bookingModel = app.get('BookingModel');
      // Tạo một đơn đã thanh toán thành công (CONFIRMED)
      const confirmedBooking = await bookingModel.create({
        userId: new Types.ObjectId(customerId),
        venueId: new Types.ObjectId(venueId),
        bookingDate: new Date('2026-10-03T00:00:00.000Z'),
        startTime: '18:00',
        endTime: '19:00',
        totalPrice: 200000,
        status: BookingStatus.CONFIRMED,
        isCheckedIn: false,
      });
      confirmedBookingId = confirmedBooking._id.toString();
    });

    it('Khách lấy mã QR động (GET /bookings/:id/qr) -> Trả về JWT 60 giây', async () => {
      const res = await request(server)
        .get(`/bookings/${confirmedBookingId}/qr`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('qrToken');
      expect(res.body.expiresInSeconds).toBe(60);
      expect(res.body.isCheckedIn).toBe(false);

      validQrToken = res.body.qrToken;
    });

    it('Nhân viên quét check-in (POST /checkin/scan) -> isCheckedIn chuyển thành true', async () => {
      const res = await request(server)
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: validQrToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.bookingId).toBe(confirmedBookingId);

      // Kiểm tra DB
      const bookingModel = app.get('BookingModel');
      const booking = await bookingModel.findById(confirmedBookingId);
      expect(booking.isCheckedIn).toBe(true);
      expect(booking.checkedInAt).toBeDefined();
    });

    it('Chống quét trùng: Quét lại mã vé đã check-in -> 409 Conflict (ALREADY_CHECKED_IN)', async () => {
      const res = await request(server)
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: validQrToken })
        .expect(409);

      expect(res.body.errorCode).toBe('ALREADY_CHECKED_IN');
      expect(res.body.message).toContain('đã được check-in');
    });

    it('Quét mã token giả mạo hoặc sai định dạng -> 400 Bad Request (QR_TOKEN_EXPIRED)', async () => {
      const res = await request(server)
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ qrToken: 'fake.invalid.jwt.token' })
        .expect(400);

      expect(res.body.errorCode).toBe('QR_TOKEN_EXPIRED');
    });

    it('Khách hàng thường (CUSTOMER) quét vé -> 403 Forbidden (Chỉ Staff/Admin)', async () => {
      await request(server)
        .post('/checkin/scan')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ qrToken: validQrToken })
        .expect(403);
    });
  });
});
