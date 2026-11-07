import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../src/vouchers/schemas/voucher.schema';
import { VoucherUsage, VoucherUsageDocument } from '../src/vouchers/schemas/voucher-usage.schema';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { Booking, BookingDocument } from '../src/bookings/schemas/booking.schema';
import { Facility } from '../src/facilities/schemas/facility.schema';
import { Venue } from '../src/venues/schemas/venue.schema';
import { DiscountType, MembershipTier, BookingStatus, UserRole } from '../src/common/enums';

describe('Epic E13 - Khuyến Mãi Voucher & Phân Hạng Khách Hàng M15 (E2E Integration Test)', () => {
  let app: INestApplication;
  let voucherModel: Model<VoucherDocument>;
  let voucherUsageModel: Model<VoucherUsageDocument>;
  let userModel: Model<UserDocument>;
  let bookingModel: Model<BookingDocument>;
  let facilityModel: Model<Facility>;
  let venueModel: Model<Venue>;

  let adminToken: string;
  let customer1Token: string;
  let customer1Id: string;
  let customer2Token: string;
  let customer2Id: string;

  let testVenueId: string;
  let createdVoucherIds: string[] = [];
  let createdBookingIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    voucherModel = moduleFixture.get<Model<VoucherDocument>>(getModelToken(Voucher.name));
    voucherUsageModel = moduleFixture.get<Model<VoucherUsageDocument>>(getModelToken(VoucherUsage.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    bookingModel = moduleFixture.get<Model<BookingDocument>>(getModelToken(Booking.name));
    facilityModel = moduleFixture.get<Model<Facility>>(getModelToken(Facility.name));
    venueModel = moduleFixture.get<Model<Venue>>(getModelToken(Venue.name));

    // 1. Đăng nhập Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });

    adminToken = adminLoginRes.body.accessToken || adminLoginRes.body.access_token;

    // 2. Tạo hoặc đăng nhập Customer 1
    const cust1Phone = '0981112233';
    let cust1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: cust1Phone, password: 'User@123456' });

    if (cust1Login.status !== 200) {
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: cust1Phone, password: 'User@123456', fullName: 'Trần Văn Khang 1' });
      customer1Token = regRes.body.accessToken || regRes.body.access_token;
      customer1Id = regRes.body.user?.id || regRes.body.user?._id;
    } else {
      customer1Token = cust1Login.body.accessToken || cust1Login.body.access_token;
      customer1Id = cust1Login.body.user?.id || cust1Login.body.user?._id;
    }

    // 3. Tạo hoặc đăng nhập Customer 2
    const cust2Phone = '0981112235';
    let cust2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: cust2Phone, password: 'User@123456' });

    if (cust2Login.status !== 200) {
      const regRes2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: cust2Phone, password: 'User@123456', fullName: 'Lê Văn Khách 2' });
      customer2Token = regRes2.body.accessToken || regRes2.body.access_token;
      customer2Id = regRes2.body.user?.id || regRes2.body.user?._id;
    } else {
      customer2Token = cust2Login.body.accessToken || cust2Login.body.access_token;
      customer2Id = cust2Login.body.user?.id || cust2Login.body.user?._id;
    }

    // Đảm bảo Customer 2 bắt đầu từ hạng MEMBER, 0 chi tiêu
    await userModel.findByIdAndUpdate(customer2Id, {
      $set: {
        membershipTier: MembershipTier.MEMBER,
        rolling12MonthSpend: 0,
        totalLifetimeSpend: 0,
        loyaltyPoints: 0,
      },
    });

    // 4. Lấy 1 venue test
    let venue = await venueModel.findOne({ isActive: true }).exec();
    if (!venue) {
      let facility = await facilityModel.findOne({ isActive: true }).exec();
      if (!facility) {
        facility = await facilityModel.create({
          name: 'Cụm Sân Test E13',
          address: '456 Test E13, TP.HCM',
          sportTypes: ['FOOTBALL'],
          operatingHours: { openTime: '06:00', closeTime: '23:00' },
          isActive: true,
        });
      }
      venue = await venueModel.create({
        facilityId: facility._id,
        name: 'Sân Test E13-A',
        courtCode: 'E13-A',
        basePricePerHour: 200000,
        isActive: true,
      });
    }
    testVenueId = venue._id.toString();
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    if (createdVoucherIds.length > 0) {
      await voucherModel.deleteMany({ _id: { $in: createdVoucherIds } });
    }
    await voucherModel.deleteMany({ code: { $in: ['E13_PERCENT', 'E13_FIXED', 'E13_RACE', 'E13_TIER_GOLD'] } });
    if (createdBookingIds.length > 0) {
      await bookingModel.deleteMany({ _id: { $in: createdBookingIds } });
    }
    await voucherUsageModel.deleteMany({ voucherCode: { $in: ['E13_PERCENT', 'E13_FIXED', 'E13_RACE', 'E13_TIER_GOLD'] } });
    await app.close();
  });

  describe('1. Quản lý Chương trình Khuyến mãi Voucher & Ngân sách (BR-13, BR-15)', () => {
    it('Tạo voucher chiết khấu phần trăm có trần tối đa và ngân sách phát hành', async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'E13_PERCENT',
          title: 'Giảm 10% Tối Đa 50k',
          discountType: DiscountType.PERCENT,
          discountValue: 10,
          maxDiscountAmount: 50000,
          minOrderValue: 200000,
          totalBudget: 500000,
          perUserLimit: 2,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
          isActive: true,
        })
        .expect(201);

      expect(res.body.code).toBe('E13_PERCENT');
      expect(res.body.totalBudget).toBe(500000);
      expect(res.body.usedBudget).toBe(0);
      expect(res.body.perUserLimit).toBe(2);
      createdVoucherIds.push(res.body._id);
    });

    it('Tạo voucher giảm giá cố định (FIXED) có ngân sách phát hành BR-13', async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'E13_FIXED',
          title: 'Giảm Ngay 30.000 đ',
          discountType: DiscountType.FIXED,
          discountValue: 30000,
          minOrderValue: 100000,
          totalBudget: 60000, // Chỉ đủ cho đúng 2 lượt dùng (2 x 30.000)
          perUserLimit: 1,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
          isActive: true,
        })
        .expect(201);

      expect(res.body.code).toBe('E13_FIXED');
      expect(res.body.totalBudget).toBe(60000);
      createdVoucherIds.push(res.body._id);
    });

    it('Truy vấn danh sách GET /vouchers và GET /vouchers/:code', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/vouchers?onlyActive=true')
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      const found = listRes.body.find((v: any) => v.code === 'E13_PERCENT');
      expect(found).toBeDefined();

      const detailRes = await request(app.getHttpServer())
        .get('/vouchers/E13_PERCENT')
        .expect(200);

      expect(detailRes.body.code).toBe('E13_PERCENT');
      expect(detailRes.body.discountType).toBe(DiscountType.PERCENT);
    });
  });

  describe('2. Xác thực Voucher & Tính giá trước khi đặt (POST /vouchers/validate)', () => {
    it('Báo lỗi 400 nếu đơn chưa đạt giá trị tối thiểu (minOrderValue)', async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers/validate')
        .send({
          code: 'E13_PERCENT',
          orderAmount: 150000, // Nhỏ hơn minOrderValue 200.000
        })
        .expect(400);

      expect(res.body.message).toContain('tối thiểu');
    });

    it('Tính chiết khấu phần trăm chuẩn xác khi chưa chạm trần tối đa', async () => {
      // Đơn 400.000 đ -> 10% = 40.000 đ (nhỏ hơn trần 50.000 đ)
      const res = await request(app.getHttpServer())
        .post('/vouchers/validate')
        .send({
          code: 'E13_PERCENT',
          orderAmount: 400000,
        })
        .expect(200);

      expect(res.body.isValid).toBe(true);
      expect(res.body.discountAmount).toBe(40000);
      expect(res.body.finalAmount).toBe(360000);
    });

    it('Giới hạn mức giảm đúng theo trần tối đa (maxDiscountAmount)', async () => {
      // Đơn 800.000 đ -> 10% = 80.000 đ > trần 50.000 đ -> lấy 50.000 đ
      const res = await request(app.getHttpServer())
        .post('/vouchers/validate')
        .send({
          code: 'E13_PERCENT',
          orderAmount: 800000,
        })
        .expect(200);

      expect(res.body.isValid).toBe(true);
      expect(res.body.discountAmount).toBe(50000);
      expect(res.body.finalAmount).toBe(750000);
    });
  });

  describe('3. Áp dụng Nguyên tử & Phòng chống Race Condition (AC-13, BR-13)', () => {
    let raceVoucherCode = 'E13_RACE';

    beforeAll(async () => {
      // Tạo voucher flash sale chỉ có ĐÚNG 1 lượt dùng (hoặc ngân sách chỉ đủ 1 lần 50k)
      const v = await voucherModel.create({
        code: raceVoucherCode,
        title: 'Flash Sale Chớp Nhoáng Đúng 1 Suất',
        discountType: DiscountType.FIXED,
        discountValue: 50000,
        minOrderValue: 100000,
        totalBudget: 50000,
        usedBudget: 0,
        usageLimit: 1,
        usedCount: 0,
        perUserLimit: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isActive: true,
      });
      createdVoucherIds.push(v._id.toString());
    });

    it('AC-13: 20 requests đồng thời áp voucher còn đúng 1 suất: chính xác 1 request thành công, 19 request nhận 409 Conflict', async () => {
      const concurrentRequests = 20;

      // Chuẩn bị 20 request đồng thời từ các user/đơn khác nhau
      const promises = Array.from({ length: concurrentRequests }).map((_, idx) => {
        const dummyBookingId = new Types.ObjectId().toString();
        return request(app.getHttpServer())
          .post('/vouchers/apply')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send({
            code: raceVoucherCode,
            bookingId: dummyBookingId,
            orderAmount: 200000,
          });
      });

      const responses = await Promise.all(promises);

      const successResponses = responses.filter((r) => r.status === 200);
      const conflictResponses = responses.filter((r) => r.status === 409);

      // Nghiệm thu AC-13: Duy nhất 1 request thành công nguyên tử!
      expect(successResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(concurrentRequests - 1);

      // Kiểm tra trong database: usedCount = 1 và usedBudget = 50000 không bao giờ bị vượt trần
      const updatedVoucher = await voucherModel.findOne({ code: raceVoucherCode });
      expect(updatedVoucher?.usedCount).toBe(1);
      expect(updatedVoucher?.usedBudget).toBe(50000);
    });
  });

  describe('4. Giới Hạn Số Lượt Mỗi User & Vòng Đời Rollback (BR-15, AC-15, AC-79)', () => {
    let usageIdToRollback: string;
    const testBookingId = new Types.ObjectId().toString();

    it('Khách hàng 1 áp dụng thành công lượt thứ nhất của mã E13_FIXED (perUserLimit: 1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers/apply')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          code: 'E13_FIXED',
          bookingId: testBookingId,
          orderAmount: 200000,
        })
        .expect(200);

      expect(res.body.voucherCode).toBe('E13_FIXED');
      expect(res.body.discountAmount).toBe(30000);
      expect(res.body.success).toBe(true);
      usageIdToRollback = res.body.usageId;
    });

    it('AC-15 & AC-79: Khách hàng 1 mở đơn thứ hai song song cố áp tiếp mã E13_FIXED -> Bị từ chối 409 Conflict', async () => {
      const parallelBookingId = new Types.ObjectId().toString();

      const res = await request(app.getHttpServer())
        .post('/vouchers/apply')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          code: 'E13_FIXED',
          bookingId: parallelBookingId,
          orderAmount: 200000,
        })
        .expect(409);

      expect(res.body.message).toContain('giới hạn');
    });

    it('Khi đơn bị hủy / hết hạn giữ chỗ: Rollback hoàn trả ngân sách và lượt dùng thành công', async () => {
      const rollbackRes = await request(app.getHttpServer())
        .post(`/vouchers/${usageIdToRollback}/rollback`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(rollbackRes.body.status).toBe('ROLLED_BACK');
      const rolledBackVoucher = await voucherModel.findOne({ code: 'E13_FIXED' });
      expect(rolledBackVoucher?.usedCount).toBe(0);
      expect(rolledBackVoucher?.usedBudget).toBe(0);
    });

    it('Sau khi rollback, khách hàng 1 được quyền áp dụng lại mã này bình thường', async () => {
      const reapplyBookingId = new Types.ObjectId().toString();

      const res = await request(app.getHttpServer())
        .post('/vouchers/apply')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          code: 'E13_FIXED',
          bookingId: reapplyBookingId,
          orderAmount: 200000,
        })
        .expect(200);

      expect(res.body.voucherCode).toBe('E13_FIXED');
      expect(res.body.discountAmount).toBe(30000);
    });
  });

  describe('5. Phân Hạng Thành Viên & 12 Tháng Trượt (BR-16, BR-17, BR-18, AC-16, AC-17)', () => {
    it('Lấy thông tin ban đầu: User mới có hạng MEMBER, chi tiêu 0đ, quyền lợi giảm 0%', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/tier-info')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(res.body.currentTier).toBe(MembershipTier.MEMBER);
      expect(res.body.currentBenefits.discountPercent).toBe(0);
      expect(res.body.currentBenefits.pointMultiplier).toBe(1.0);
      expect(res.body.nextTier).toBe(MembershipTier.SILVER);
      expect(res.body.spendNeededForNextTier).toBe(5000000);
    });

    it('Tự động thăng hạng SILVER khi chi tiêu 12 tháng trượt đạt 5.000.000 đ (AC-16)', async () => {
      // Giả lập 1 đơn đặt sân CONFIRMED trị giá 6.000.000 đ trong 30 ngày gần đây
      const booking = await bookingModel.create({
        userId: new Types.ObjectId(customer2Id),
        venueId: new Types.ObjectId(testVenueId),
        bookingDate: new Date(Date.now() - 86400000 * 5), // 5 ngày trước
        startTime: '18:00',
        endTime: '20:00',
        totalPrice: 6000000,
        status: BookingStatus.CONFIRMED,
        isCheckedIn: true,
      });
      createdBookingIds.push(booking._id.toString());

      // Kích hoạt tính toán lại phân hạng
      const res = await request(app.getHttpServer())
        .post('/users/recalculate-tier')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(res.body.currentTier).toBe(MembershipTier.SILVER);
      expect(res.body.rolling12MonthSpend).toBe(6000000);
      expect(res.body.tierBenefits.discountPercent).toBe(5);
      expect(res.body.tierBenefits.pointMultiplier).toBe(1.2);
    });

    it('Tự động thăng hạng GOLD khi chi tiêu 12 tháng trượt đạt 15.000.000 đ', async () => {
      // Giả lập thêm 1 đơn đặt sân COMPLETED trị giá 10.000.000 đ (tổng 16.000.000 đ)
      const booking2 = await bookingModel.create({
        userId: new Types.ObjectId(customer2Id),
        venueId: new Types.ObjectId(testVenueId),
        bookingDate: new Date(Date.now() - 86400000 * 20),
        startTime: '08:00',
        endTime: '10:00',
        totalPrice: 10000000,
        status: BookingStatus.COMPLETED,
        isCheckedIn: true,
      });
      createdBookingIds.push(booking2._id.toString());

      const res = await request(app.getHttpServer())
        .post('/users/recalculate-tier')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(res.body.currentTier).toBe(MembershipTier.GOLD);
      expect(res.body.rolling12MonthSpend).toBe(16000000);
      expect(res.body.tierBenefits.discountPercent).toBe(10);
      expect(res.body.tierBenefits.pointMultiplier).toBe(1.5);
    });

    it('BR-17: Đơn đặt sân quá 365 ngày (ngoài cửa sổ 12 tháng trượt) KHÔNG được tính vào xét hạng', async () => {
      // Tạo 1 đơn cũ cách đây 400 ngày trị giá 20.000.000 đ
      const oldBooking = await bookingModel.create({
        userId: new Types.ObjectId(customer2Id),
        venueId: new Types.ObjectId(testVenueId),
        bookingDate: new Date(Date.now() - 86400000 * 400),
        startTime: '10:00',
        endTime: '12:00',
        totalPrice: 20000000,
        status: BookingStatus.COMPLETED,
        isCheckedIn: true,
      });
      createdBookingIds.push(oldBooking._id.toString());

      const res = await request(app.getHttpServer())
        .post('/users/recalculate-tier')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      // rolling12MonthSpend vẫn giữ 16.000.000 đ, không được cộng thêm 20tr đơn cũ
      expect(res.body.rolling12MonthSpend).toBe(16000000);
      expect(res.body.currentTier).toBe(MembershipTier.GOLD);
    });
  });

  describe('6. Tích Điểm Thưởng & Quy Đổi Giảm Giá (BR-16, BR-18, AC-16)', () => {
    beforeAll(async () => {
      // Gán điểm thưởng cho Customer 2
      await userModel.findByIdAndUpdate(customer2Id, {
        $set: { loyaltyPoints: 1000 },
      });
    });

    it('Quy đổi điểm thưởng hợp lệ: 300 điểm = 30.000 VND (1 điểm = 100 VND theo BR-16)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/redeem-points')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          pointsToRedeem: 300,
          orderAmount: 300000,
        })
        .expect(200);

      expect(res.body.pointsRedeemed).toBe(300);
      expect(res.body.discountAmount).toBe(30000); // 300 x 100 = 30.000
      expect(res.body.remainingPoints).toBe(700);
    });

    it('Từ chối quy đổi điểm thưởng nếu số điểm yêu cầu vượt quá số dư hiện có', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/redeem-points')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          pointsToRedeem: 5000, // Chỉ có 700 điểm
          orderAmount: 300000,
        })
        .expect(400);

      expect(res.body.message).toContain('Không đủ điểm thưởng');
    });
  });
});
