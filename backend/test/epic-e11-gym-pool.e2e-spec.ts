import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GymQrCredential, GymQrCredentialDocument } from '../src/gym/schemas/gym-qr-credential.schema';
import { GymSubscription, GymSubscriptionDocument } from '../src/gym/schemas/gym-subscription.schema';
import { GymAccessLog, GymAccessLogDocument } from '../src/gym/schemas/gym-access-log.schema';
import { PoolTicket, PoolTicketDocument } from '../src/pool/schemas/pool-ticket.schema';
import { GymPlanType, GymQrStatus } from '../src/gym/enums/gym-plan-type.enum';
import { PoolCode, PoolTicketStatus, PoolTicketType, POOL_PRICES } from '../src/pool/enums/pool.enum';

describe('Epic E11 - Phòng Gym & Vé Bơi Theo Lượt M10 (E2E Integration Test)', () => {
  let app: INestApplication;
  let gymQrModel: Model<GymQrCredentialDocument>;
  let gymSubModel: Model<GymSubscriptionDocument>;
  let gymLogModel: Model<GymAccessLogDocument>;
  let poolTicketModel: Model<PoolTicketDocument>;

  let adminToken: string;
  let customer1Token: string;
  let customer1Id: string;
  let customer2Token: string;
  let customer2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);

    gymQrModel = moduleFixture.get<Model<GymQrCredentialDocument>>(getModelToken(GymQrCredential.name));
    gymSubModel = moduleFixture.get<Model<GymSubscriptionDocument>>(getModelToken(GymSubscription.name));
    gymLogModel = moduleFixture.get<Model<GymAccessLogDocument>>(getModelToken(GymAccessLog.name));
    poolTicketModel = moduleFixture.get<Model<PoolTicketDocument>>(getModelToken(PoolTicket.name));

    // 1. Đăng nhập Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0999999999', password: 'Admin@123456' });

    adminToken = adminLoginRes.body.accessToken || adminLoginRes.body.access_token;

    // 2. Tạo hoặc đăng nhập Customer 1 (Khang Gym User)
    const cust1Phone = '0983334455';
    let cust1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: cust1Phone, password: 'User@123456' });

    if (cust1Login.status !== 200) {
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: cust1Phone, password: 'User@123456', fullName: 'Trần Văn Khang Gym 1' });
      customer1Token = regRes.body.accessToken || regRes.body.access_token;
      customer1Id = regRes.body.user?.id || regRes.body.user?._id;
    } else {
      customer1Token = cust1Login.body.accessToken || cust1Login.body.access_token;
      customer1Id = cust1Login.body.user?.id || cust1Login.body.user?._id;
    }

    // 3. Tạo hoặc đăng nhập Customer 2 (Khang Gym User 2)
    const cust2Phone = '0983334466';
    let cust2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: cust2Phone, password: 'User@123456' });

    if (cust2Login.status !== 200) {
      const regRes2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: cust2Phone, password: 'User@123456', fullName: 'Lê Văn Khang Gym 2' });
      customer2Token = regRes2.body.accessToken || regRes2.body.access_token;
      customer2Id = regRes2.body.user?.id || regRes2.body.user?._id;
    } else {
      customer2Token = cust2Login.body.accessToken || cust2Login.body.access_token;
      customer2Id = cust2Login.body.user?.id || cust2Login.body.user?._id;
    }

    // Dọn dẹp dữ liệu cũ của 2 users trước khi test
    await gymQrModel.deleteMany({ userId: { $in: [new Types.ObjectId(customer1Id), new Types.ObjectId(customer2Id)] } });
    await gymSubModel.deleteMany({ userId: { $in: [new Types.ObjectId(customer1Id), new Types.ObjectId(customer2Id)] } });
    await poolTicketModel.deleteMany({ customerPhone: { $in: ['0983334455', '0983334466'] } });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu sau test
    if (customer1Id && customer2Id) {
      await gymQrModel.deleteMany({ userId: { $in: [new Types.ObjectId(customer1Id), new Types.ObjectId(customer2Id)] } });
      await gymSubModel.deleteMany({ userId: { $in: [new Types.ObjectId(customer1Id), new Types.ObjectId(customer2Id)] } });
      await poolTicketModel.deleteMany({ customerPhone: { $in: ['0983334455', '0983334466'] } });
    }
    await app.close();
  });

  // =========================================================================
  // PHẦN 1: GÓI TẬP GYM CHUẨN BR-27
  // =========================================================================
  describe('1. Danh Mục Gói Tập Gym Chuẩn (BR-27)', () => {
    it('Chỉ cung cấp đúng 4 gói tập (1 ngày, 1 tháng, 3 tháng, 6 tháng); tuyệt đối không có gói năm (BR-27)', async () => {
      const res = await request(app.getHttpServer())
        .get('/gym/plans')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const planCodes = res.body.map((p: any) => p.code);
      expect(planCodes).toEqual(
        expect.arrayContaining([
          GymPlanType.DAY_1,
          GymPlanType.MONTH_1,
          GymPlanType.MONTH_3,
          GymPlanType.MONTH_6,
        ])
      );

      // Tuyệt đối không có gói năm
      expect(planCodes).not.toContain('YEARLY');
      expect(planCodes).not.toContain('YEARLY_PASS');
      expect(planCodes).not.toContain('YEAR_1');

      // Kiểm tra giá chuẩn BR-27
      const day1 = res.body.find((p: any) => p.code === GymPlanType.DAY_1);
      const month1 = res.body.find((p: any) => p.code === GymPlanType.MONTH_1);
      const month3 = res.body.find((p: any) => p.code === GymPlanType.MONTH_3);
      const month6 = res.body.find((p: any) => p.code === GymPlanType.MONTH_6);

      expect(day1.price).toBe(50000);
      expect(month1.price).toBe(500000);
      expect(month3.price).toBe(1350000);
      expect(month6.price).toBe(2400000);
    });
  });

  // =========================================================================
  // PHẦN 2: MÃ QR ĐỊNH DANH DUY NHẤT & GIA HẠN / NÂNG CẤP (BR-26, BR-28, AC-70)
  // =========================================================================
  describe('2. Mã QR Định Danh Cố Định & Gia Hạn / Nâng Cấp (BR-26, BR-28, AC-70)', () => {
    let customer1QrCode: string;
    let customer2QrCode: string;

    it('Khách mua gói tập lần đầu: Cấp duy nhất 1 chuỗi mã QR định danh cho tài khoản và chuyển ACTIVE (BR-26, BR-30a)', async () => {
      const res = await request(app.getHttpServer())
        .post('/gym/purchase')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planCode: GymPlanType.MONTH_1,
        })
        .expect(200);

      expect(res.body.credential).toBeDefined();
      expect(res.body.credential.qrCode).toBeDefined();
      customer1QrCode = res.body.credential.qrCode;

      // Tra cứu QR cá nhân qua GET /gym/my-qr
      const myQrRes = await request(app.getHttpServer())
        .get('/gym/my-qr')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(myQrRes.body.hasCredential).toBe(true);
      expect(myQrRes.body.credential.qrCode).toBe(customer1QrCode);
      expect(myQrRes.body.credential.status).toBe(GymQrStatus.ACTIVE);
      expect(new Date(myQrRes.body.credential.activeUntil).getTime()).toBeGreaterThan(Date.now());
    });

    it('Gia hạn cùng gói: Cộng dồn tiếp nối hạn cũ và GIỮ NGUYÊN mã QR cũ (BR-28, AC-70)', async () => {
      // Đọc hạn dùng trước gia hạn
      const beforeRes = await request(app.getHttpServer())
        .get('/gym/my-qr')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      const beforeEndDate = new Date(beforeRes.body.credential.activeUntil).getTime();

      // Mua gia hạn tiếp gói MONTH_1 (+30 ngày)
      const renewRes = await request(app.getHttpServer())
        .post('/gym/purchase')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          planCode: GymPlanType.MONTH_1,
        })
        .expect(200);

      expect(renewRes.body.credential).toBeDefined();
      // Mã QR tuyệt đối không thay đổi
      expect(renewRes.body.credential.qrCode).toBe(customer1QrCode);

      // Hạn mới phải cộng thêm 30 ngày
      const afterRes = await request(app.getHttpServer())
        .get('/gym/my-qr')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      const afterEndDate = new Date(afterRes.body.credential.activeUntil).getTime();
      const diffDays = Math.round((afterEndDate - beforeEndDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('Nâng cấp lên gói dài hơn: Tính toán trừ tiền ngày chưa dùng của gói cũ (BR-28)', async () => {
      // Gọi API tính toán nâng cấp từ gói hiện tại lên MONTH_3
      const calcRes = await request(app.getHttpServer())
        .post('/gym/calculate-upgrade')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          targetPlanCode: GymPlanType.MONTH_3,
        })
        .expect(200);

      expect(calcRes.body.hasActivePlan).toBe(true);
      expect(calcRes.body.targetPlanPrice).toBe(1350000);
      expect(calcRes.body.creditDeducted).toBeGreaterThan(0);
      expect(calcRes.body.finalAmount).toBeLessThan(1350000);
      expect(calcRes.body.finalAmount).toBe(
        Math.max(0, calcRes.body.targetPlanPrice - calcRes.body.creditDeducted)
      );
    });

    it('Thẻ tập khi hết hạn chuyển sang EXPIRED; gia hạn sau hết hạn kích hoạt lại chính mã QR cũ (AC-70)', async () => {
      // Giả lập Customer 2 có thẻ hết hạn trong database
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Hôm qua
      const dummyQr = `GYM_QR_EXPIRED_${Date.now()}`;

      await gymQrModel.create({
        userId: new Types.ObjectId(customer2Id),
        qrCode: dummyQr,
        status: GymQrStatus.EXPIRED,
        currentPlanCode: GymPlanType.DAY_1,
        activeUntil: expiredDate,
      });

      // Kiểm tra my-qr trả về EXPIRED
      const myQrRes = await request(app.getHttpServer())
        .get('/gym/my-qr')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(myQrRes.body.hasCredential).toBe(true);
      expect(myQrRes.body.credential.status).toBe(GymQrStatus.EXPIRED);

      // Customer 2 gia hạn mua gói MONTH_1
      const renewRes = await request(app.getHttpServer())
        .post('/gym/purchase')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          planCode: GymPlanType.MONTH_1,
        })
        .expect(200);

      // Kích hoạt lại ACTIVE trên chính mã QR cũ
      expect(renewRes.body.credential.qrCode).toBe(dummyQr);
      customer2QrCode = dummyQr;

      const afterRenewQr = await request(app.getHttpServer())
        .get('/gym/my-qr')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(afterRenewQr.body.credential.status).toBe(GymQrStatus.ACTIVE);
      expect(new Date(afterRenewQr.body.credential.activeUntil).getTime()).toBeGreaterThan(Date.now());
    });
  });

  // =========================================================================
  // PHẦN 3: BỘ ĐẾM 100 NGƯỜI, CỬA XOAY 2 CHIỀU & CHỐNG QUÉT TRÙNG (BR-29, BR-30, AC-31, AC-32)
  // =========================================================================
  describe('3. Cửa Xoay 2 Chiều & Sức Chứa 100 Người (BR-29, BR-30, AC-31, AC-32)', () => {
    let customer1Qr: string;
    let freshCustomerQr: string;

    beforeAll(async () => {
      const qrDoc = await gymQrModel.findOne({ userId: customer1Id }).exec();
      customer1Qr = qrDoc!.qrCode;

      // Tạo thêm 1 mã QR hội viên mới hoàn toàn để test sức chứa 100 người
      const freshUserDoc = await gymQrModel.findOne({ userId: customer2Id }).exec();
      freshCustomerQr = freshUserDoc!.qrCode;

      // Reset số đếm về 0 trước khi test (cần adminToken)
      await request(app.getHttpServer())
        .post('/gym/turnstile/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('Quét VÀO (IN) thành công: Mở cửa xoay, tăng bộ đếm số người trong phòng (BR-29, BR-30)', async () => {
      const res = await request(app.getHttpServer())
        .post('/gym/turnstile/scan')
        .send({
          qrCode: customer1Qr,
          direction: 'IN',
          gateId: 'GATE_01',
        })
        .expect(200);

      expect(res.body.accessGranted).toBe(true);
      expect(res.body.turnstileAction).toBe('OPEN');
      expect(res.body.insideCount).toBe(1);

      // Đọc capacity status
      const capRes = await request(app.getHttpServer()).get('/gym/capacity').expect(200);
      expect(capRes.body.insideCount).toBe(1);
      expect(capRes.body.maxCapacity).toBe(100);
      expect(capRes.body.availableSlots).toBe(99);
    });

    it('Khóa chống quét trùng 5 phút (BR-30, AC-32): Quét lại cùng chiều IN trong 5 phút bị từ chối RECENTLY_SCANNED', async () => {
      const res = await request(app.getHttpServer())
        .post('/gym/turnstile/scan')
        .send({
          qrCode: customer1Qr,
          direction: 'IN',
          gateId: 'GATE_01',
        })
        .expect(400);

      expect(res.body.errorCode === 'RECENTLY_SCANNED' || res.body.message.includes('5 phút')).toBe(true);
    });

    it('Cho phép quét chiều ngược lại ngay lập tức (OUT): Mở cửa xoay và giảm số người (BR-30)', async () => {
      const res = await request(app.getHttpServer())
        .post('/gym/turnstile/scan')
        .send({
          qrCode: customer1Qr,
          direction: 'OUT',
          gateId: 'GATE_01',
        })
        .expect(200);

      expect(res.body.accessGranted).toBe(true);
      expect(res.body.insideCount).toBe(0);
    });

    it('Khi phòng gym đã đủ 100 người: Từ chối mở cửa với lỗi GYM_CAPACITY_FULL (BR-29, AC-31)', async () => {
      // Ghi đè số đếm lên 100 bằng API override (cần adminToken và newCount)
      await request(app.getHttpServer())
        .post('/gym/turnstile/override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newCount: 100,
          reason: 'Test phòng gym chạm ngưỡng tối đa 100 người',
        })
        .expect(200);

      // Quét bằng mã của Customer 2 (chưa bị dính debounce 5 phút)
      const res = await request(app.getHttpServer())
        .post('/gym/turnstile/scan')
        .send({
          qrCode: freshCustomerQr,
          direction: 'IN',
          gateId: 'GATE_01',
        })
        .expect(409);

      expect(res.body.errorCode === 'GYM_CAPACITY_FULL' || res.body.message.includes('100 người')).toBe(true);

      // Reset lại bộ đếm sau test quá tải
      await request(app.getHttpServer())
        .post('/gym/turnstile/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // =========================================================================
  // PHẦN 4: PHÂN HỆ VÉ BƠI THEO LƯỢT (BR-31)
  // =========================================================================
  describe('4. Phân Hệ Vé Bơi Theo Lượt Trong Ngày (BR-31)', () => {
    let purchasedTickets: any[] = [];

    it('Bán vé bơi theo lượt: Người lớn 25.000 VND, Trẻ em 20.000 VND; hạn trong ngày (BR-31)', async () => {
      const res = await request(app.getHttpServer())
        .post('/pool/tickets/purchase')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          adultCount: 2,
          childCount: 1,
          customerPhone: '0983334455',
          customerName: 'Trần Văn Khang',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // 2 * 25k + 1 * 20k = 70.000 VND
      expect(res.body.totalPrice).toBe(70000);
      expect(res.body.tickets.length).toBe(3);

      purchasedTickets = res.body.tickets;

      // Mỗi vé có hạn đến hết 23:59:59 của ngày hôm nay
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const ticketValidDate = new Date(purchasedTickets[0].validDate);
      expect(ticketValidDate.getDate()).toBe(todayEnd.getDate());
      expect(purchasedTickets[0].status).toBe(PoolTicketStatus.UNUSED);
    });

    it('Quét vé vào cổng Hồ 50m: Gán vào Hồ 50m, tăng số người và đổi trạng thái USED (BR-31)', async () => {
      const adultTicket = purchasedTickets.find((t) => t.ticketType === PoolTicketType.ADULT);

      const res = await request(app.getHttpServer())
        .post('/pool/tickets/scan')
        .send({
          ticketCode: adultTicket.ticketCode,
          poolCode: PoolCode.POOL_50M,
        })
        .expect(200);

      expect(res.body.accessGranted).toBe(true);
      expect(res.body.ticket.status).toBe(PoolTicketStatus.USED);
      expect(res.body.pool.code).toBe(PoolCode.POOL_50M);
      expect(res.body.pool.currentSwimmers).toBeGreaterThanOrEqual(1);
    });

    it('Quét lại vé đã sử dụng: Bị từ chối với thông báo vé đã quét 1 lượt (BR-31)', async () => {
      const adultTicket = purchasedTickets.find((t) => t.ticketType === PoolTicketType.ADULT);

      const res = await request(app.getHttpServer())
        .post('/pool/tickets/scan')
        .send({
          ticketCode: adultTicket.ticketCode,
          poolCode: PoolCode.POOL_50M,
        })
        .expect(400);

      expect(res.body.errorCode === 'TICKET_ALREADY_USED' || res.body.message.includes('1 lượt')).toBe(true);
    });

    it('Khách rời hồ bơi: Giải phóng sức chứa giảm 1 người trong hồ', async () => {
      const res = await request(app.getHttpServer())
        .post('/pool/check-out')
        .send({
          poolCode: PoolCode.POOL_50M,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // PHẦN 5: ĐÓNG HỒ ĐỘT XUẤT & HOÀN 100% TIỀN VÉ CHƯA DÙNG (AC-87)
  // =========================================================================
  describe('5. Đóng Hồ Đột Xuất & Tự Động Hoàn 100% Vé Chưa Quét (AC-87)', () => {
    let freshTickets: any[] = [];

    beforeAll(async () => {
      // Mua thêm 2 vé mới (1 lớn 25k, 1 trẻ em 20k) = 45k
      const buyRes = await request(app.getHttpServer())
        .post('/pool/tickets/purchase')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          adultCount: 1,
          childCount: 1,
          customerPhone: '0983334466',
          customerName: 'Lê Văn Khang',
        })
        .expect(201);

      freshTickets = buyRes.body.tickets;
    });

    it('AC-87: Khi đóng hồ đột xuất, tự động hủy và hoàn 100% tiền vé cho các vé UNUSED trong ngày', async () => {
      const res = await request(app.getHttpServer())
        .post('/pool/emergency-close')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          poolCode: PoolCode.POOL_50M,
          reason: 'Bảo trì khẩn cấp hệ thống lọc nước ozone',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.refundedTicketsCount).toBeGreaterThanOrEqual(2);
      expect(res.body.totalRefundAmount).toBeGreaterThanOrEqual(45000);

      // Kiểm tra trong database các vé này đã chuyển sang REFUNDED
      const updatedTickets = await poolTicketModel.find({
        ticketCode: { $in: freshTickets.map((t) => t.ticketCode) },
      });

      for (const t of updatedTickets) {
        expect(t.status).toBe(PoolTicketStatus.REFUNDED);
      }
    });

    it('Khi hồ đang đóng đột xuất: Từ chối soát vé với thông báo tạm đóng (AC-87)', async () => {
      // Mua 1 vé mới
      const newTicketRes = await request(app.getHttpServer())
        .post('/pool/tickets/purchase')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          adultCount: 1,
          childCount: 0,
          customerPhone: '0983334466',
          customerName: 'Lê Văn Khang',
        })
        .expect(201);

      const ticket = newTicketRes.body.tickets[0];

      // Thử quét vào Hồ 50m đang đóng
      const scanRes = await request(app.getHttpServer())
        .post('/pool/tickets/scan')
        .send({
          ticketCode: ticket.ticketCode,
          poolCode: PoolCode.POOL_50M,
        })
        .expect(400);

      expect(scanRes.body.message).toContain('tạm đóng');
    });

    it('Mở lại hồ bơi sau sự cố: Phục hồi hoạt động đón khách bình thường', async () => {
      const reopenRes = await request(app.getHttpServer())
        .post('/pool/reopen')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          poolCode: PoolCode.POOL_50M,
        })
        .expect(200);

      expect(reopenRes.body.success).toBe(true);
      expect(reopenRes.body.message).toContain('mở cửa đón khách trở lại');

      // Kiểm tra trạng thái hồ trên GET /pool/status (danh sách pools là array)
      const statusRes = await request(app.getHttpServer())
        .get('/pool/status')
        .expect(200);

      const pool50 = statusRes.body.pools.find((p: any) => p.code === PoolCode.POOL_50M);
      expect(pool50.isClosed).toBe(false);
    });
  });
});
