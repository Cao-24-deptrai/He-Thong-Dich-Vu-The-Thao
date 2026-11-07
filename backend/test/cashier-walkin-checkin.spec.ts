import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Venue } from '../src/venues/schemas/venue.schema';
import { Booking } from '../src/bookings/schemas/booking.schema';

describe('Giai đoạn 3.2: Đặt Sân Walk-In & Quét Soát Vé QR Turnstile', () => {
  let app: INestApplication;
  let cashierToken: string;
  let venueModel: Model<Venue>;
  let bookingModel: Model<Booking>;
  let testVenueId: string;
  let testCheckInCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));
    bookingModel = moduleFixture.get<Model<Booking>>(getModelToken(Booking.name));

    // Dọn dẹp dữ liệu ngày test cũ nếu có
    await bookingModel.deleteMany({ bookingDate: new Date('2026-11-01T00:00:00.000Z') });

    // Tìm một sân bóng hoặc sân thể thao bất kỳ để test
    const venue = await venueModel.findOne({ isActive: true }).exec();
    testVenueId = venue?._id.toString() || '6aa7541a288743fb2966037b';

    // Login Cashier
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0900000003', password: 'Admin@123456' });

    cashierToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (bookingModel) {
      await bookingModel.deleteMany({ bookingDate: new Date('2026-11-01T00:00:00.000Z') });
    }
    await app.close();
  });

  it('1. POST /cashier/walk-in: Đặt sân vãng lai tại quầy kèm thuê bóng và tính thuế VAT 8%', async () => {
    const res = await request(app.getHttpServer())
      .post('/cashier/walk-in')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: '2026-11-01',
        startTime: '15:00',
        endTime: '16:30',
        customerName: 'Anh Long (FC Đại Dương)',
        customerPhone: '0909887766',
        paymentMethod: 'CASH',
        equipmentRentals: [
          { itemId: 'ball-1', name: 'Bóng Molten Vantaggio 5000', quantity: 1, price: 50000 },
        ],
        discountAmount: 0,
        note: 'Khách thanh toán tiền mặt đủ tại quầy',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('booking');
    expect(res.body).toHaveProperty('receipt');
    expect(res.body.booking).toHaveProperty('checkInCode');
    expect(res.body.booking.isWalkIn).toBe(true);
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.receipt.vatRate).toBe(8);
    expect(res.body.receipt.finalTotal).toBeGreaterThan(0);

    testCheckInCode = res.body.booking.checkInCode;
  });

  it('2. POST /checkin/scan: Quét mã vé check-in vào sân & mở cổng xoay Turnstile', async () => {
    expect(testCheckInCode).toBeDefined();

    const res = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        checkInCode: testCheckInCode,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Cổng xoay Turnstile đã mở');
    expect(res.body.status).toBe('CHECKED_IN');
    expect(res.body).toHaveProperty('checkedInAt');
  });

  it('3. POST /checkin/scan: Chống quét trùng vé đã check-in (Báo lỗi 409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/checkin/scan')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        checkInCode: testCheckInCode,
      })
      .expect(409);

    expect(res.body.message).toContain('đã được check-in');
  });

  it('4. POST /cashier/walk-in: Khách vào sân ngay lập tức (checkInImmediately: true)', async () => {
    const res = await request(app.getHttpServer())
      .post('/cashier/walk-in')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        venueId: testVenueId,
        bookingDate: '2026-11-01',
        startTime: '17:00',
        endTime: '18:30',
        customerName: 'Chị Mai (CLB Thể Thao)',
        customerPhone: '0912998877',
        paymentMethod: 'VIETQR',
        checkInImmediately: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.booking.status).toBe('CHECKED_IN');
    expect(res.body.booking.isCheckedIn).toBe(true);
    expect(res.body.booking.checkedInAt).toBeDefined();
  });
});
