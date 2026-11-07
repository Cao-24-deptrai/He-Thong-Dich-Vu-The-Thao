import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { GymMembershipService } from './gym-membership.service';
import { GymQrCredential } from './schemas/gym-qr-credential.schema';
import { GymSubscription } from './schemas/gym-subscription.schema';
import { User } from '../users/schemas/user.schema';
import { GymPlanType, GymQrStatus } from './enums/gym-plan-type.enum';

describe('GymMembershipService (Unit Tests - Bước 3.1: Epic E11)', () => {
  let service: GymMembershipService;

  let qrCredentialStore: any[] = [];
  let subscriptionStore: any[] = [];

  const mockQrCredentialModel: any = jest.fn().mockImplementation((data) => {
    const doc = {
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        const existingIdx = qrCredentialStore.findIndex(
          (c) => c.userId?.toString() === this.userId?.toString(),
        );
        if (existingIdx >= 0) {
          qrCredentialStore[existingIdx] = this;
        } else {
          qrCredentialStore.push(this);
        }
        return Promise.resolve(this);
      }),
    };
    return doc;
  });

  mockQrCredentialModel.findOne = jest.fn().mockImplementation((filter) => ({
    exec: jest.fn().mockImplementation(() => {
      const found = qrCredentialStore.find((c) => {
        if (filter.userId) {
          return c.userId?.toString() === filter.userId?.toString();
        }
        return true;
      });
      if (!found) return null;
      return {
        ...found,
        save: jest.fn().mockImplementation(function () {
          const idx = qrCredentialStore.findIndex(
            (c) => c.userId?.toString() === this.userId?.toString(),
          );
          if (idx >= 0) qrCredentialStore[idx] = this;
          return Promise.resolve(this);
        }),
      };
    }),
  }));

  const mockSubscriptionModel: any = jest.fn().mockImplementation((data) => {
    const doc = {
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        subscriptionStore.push(this);
        return Promise.resolve(this);
      }),
    };
    return doc;
  });

  mockSubscriptionModel.findOne = jest.fn().mockImplementation((filter) => ({
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockImplementation(() => {
      const matches = subscriptionStore.filter((s) => {
        if (filter.userId && s.userId?.toString() !== filter.userId?.toString()) return false;
        if (filter.status && s.status !== filter.status) return false;
        return true;
      });
      return matches.length > 0 ? matches[matches.length - 1] : null;
    }),
  }));

  mockSubscriptionModel.find = jest.fn().mockImplementation((filter) => ({
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockImplementation(() => {
      return subscriptionStore.filter((s) => s.userId?.toString() === filter.userId?.toString());
    }),
  }));

  mockSubscriptionModel.updateMany = jest.fn().mockImplementation((filter, update) => {
    subscriptionStore.forEach((s) => {
      if (s.userId?.toString() === filter.userId?.toString() && s.status === filter.status) {
        if (update.$set?.status) {
          s.status = update.$set.status;
        }
      }
    });
    return Promise.resolve({ modifiedCount: 1 });
  });

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    qrCredentialStore = [];
    subscriptionStore = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymMembershipService,
        {
          provide: getModelToken(GymQrCredential.name),
          useValue: mockQrCredentialModel,
        },
        {
          provide: getModelToken(GymSubscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<GymMembershipService>(GymMembershipService);
  });

  describe('1. Cấu hình Gói tập Gym chuẩn theo BR-27', () => {
    it('Hệ thống chỉ cung cấp đúng 4 gói tập (1 ngày, 1 tháng, 3 tháng, 6 tháng) và KHÔNG có gói năm', () => {
      const plans = service.getPlans();
      expect(plans.length).toBe(4);

      const codes = plans.map((p) => p.code);
      expect(codes).toContain(GymPlanType.DAY_1);
      expect(codes).toContain(GymPlanType.MONTH_1);
      expect(codes).toContain(GymPlanType.MONTH_3);
      expect(codes).toContain(GymPlanType.MONTH_6);

      // Tuyệt đối không có gói năm theo BR-27
      expect((codes as any)).not.toContain('YEAR_1');
      expect((codes as any)).not.toContain('YEARLY_PASS');
    });

    it('Quăng BadRequestException nếu yêu cầu gói không hợp lệ', () => {
      expect(() => service.getPlanByCode('INVALID_PLAN' as any)).toThrow(BadRequestException);
    });
  });

  describe('2. Mua gói đầu tiên & Cấp Mã QR định danh duy nhất (BR-26, BR-30a)', () => {
    it('Cấp duy nhất 1 mã QR định danh cho tài khoản khi mua gói 1 tháng đầu tiên', async () => {
      const userId = new Types.ObjectId().toString();

      const res = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_1);

      expect(res.isNewCredential).toBe(true);
      expect(res.isRenewal).toBe(false);
      expect(res.isUpgrade).toBe(false);
      expect(res.paidAmount).toBe(500000);
      expect(res.creditDeducted).toBe(0);

      // Mã QR định danh duy nhất được sinh ra
      expect(res.credential.qrCode).toContain('PHANTA_GYM_');
      expect(res.credential.status).toBe(GymQrStatus.ACTIVE);
      expect(res.credential.currentPlanCode).toBe(GymPlanType.MONTH_1);

      // Hạn hiệu lực là 30 ngày
      const diffDays = Math.round(
        (res.credential.activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);

      // Kiểm tra lưu subscription
      expect(res.subscription.planCode).toBe(GymPlanType.MONTH_1);
      expect(res.subscription.durationDays).toBe(30);
      expect(res.subscription.paidAmount).toBe(500000);
      expect(res.subscription.status).toBe('ACTIVE');
    });
  });

  describe('3. Gia hạn tiếp nối cộng dồn hạn sử dụng khi còn hạn (BR-28)', () => {
    it('Gia hạn khi gói cũ còn hạn: Hạn mới được cộng dồn tiếp nối vào hạn cũ và dùng lại mã QR cũ', async () => {
      const userId = new Types.ObjectId().toString();

      // Mua lần 1: Gói 1 tháng (30 ngày)
      const firstPurchase = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_1);
      const originalQrCode = firstPurchase.credential.qrCode;
      const initialActiveUntil = new Date(firstPurchase.credential.activeUntil);

      // Gia hạn lần 2: Mua thêm gói 1 tháng (30 ngày) khi gói cũ vẫn còn hạn
      const renewal = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_1);

      expect(renewal.isNewCredential).toBe(false);
      expect(renewal.isRenewal).toBe(true);

      // Dùng lại đúng mã QR cũ, không tạo mã mới (BR-26, BR-30a)
      expect(renewal.credential.qrCode).toBe(originalQrCode);

      // Hạn mới được cộng dồn tiếp nối vào hạn cũ: 30 + 30 = 60 ngày
      const expectedEndDate = new Date(initialActiveUntil.getTime() + 30 * 86400000);
      expect(renewal.credential.activeUntil.getTime()).toBe(expectedEndDate.getTime());
    });
  });

  describe('4. Vòng đời Mã QR khi hết hạn & Kích hoạt lại (AC-70)', () => {
    it('Chuyển trạng thái EXPIRED khi hết hạn; khi gia hạn thì kích hoạt lại ACTIVE ngay trên mã cũ', async () => {
      const userId = new Types.ObjectId().toString();

      // Mua gói 1 ngày
      const purchase = await service.purchaseOrRenewPlan(userId, GymPlanType.DAY_1);
      const originalQrCode = purchase.credential.qrCode;

      // Giả lập thẻ đã hết hạn vào ngày hôm qua
      const expiredDate = new Date(Date.now() - 86400000);
      purchase.credential.activeUntil = expiredDate;
      purchase.credential.status = GymQrStatus.ACTIVE;
      qrCredentialStore[0] = purchase.credential;

      // Truy vấn mã QR: tự động nhận diện hết hạn -> chuyển EXPIRED (AC-70)
      const credAfterExpired = await service.getQrCredential(userId);
      expect(credAfterExpired?.status).toBe(GymQrStatus.EXPIRED);

      // Gia hạn gói 3 tháng sau khi đã hết hạn
      const renewAfterExpire = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_3);

      expect(renewAfterExpire.isRenewal).toBe(true);
      // Dùng lại chính xác mã QR cũ, chuyển lại ACTIVE ngay lập tức (AC-70)
      expect(renewAfterExpire.credential.qrCode).toBe(originalQrCode);
      expect(renewAfterExpire.credential.status).toBe(GymQrStatus.ACTIVE);
      expect(renewAfterExpire.credential.currentPlanCode).toBe(GymPlanType.MONTH_3);

      // Hạn mới tính từ thời điểm gia hạn: 90 ngày
      const diffDays = Math.round(
        (renewAfterExpire.credential.activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(90);
    });
  });

  describe('5. Nâng cấp Gói tập & Khấu trừ Ngày chưa dùng của gói cũ (BR-28)', () => {
    it('Nâng cấp từ gói 1 tháng lên 3 tháng: Khấu trừ tiền các ngày chưa dùng của gói cũ vào giá mua mới', async () => {
      const userId = new Types.ObjectId().toString();

      // Khách mua gói 1 tháng (500.000 VND, 30 ngày)
      const initialPurchase = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_1);
      const originalQrCode = initialPurchase.credential.qrCode;

      // Giả lập khách đã dùng được 10 ngày, CÒN LẠI 20 NGÀY
      const remainingDays = 20;
      const simulatedActiveUntil = new Date(Date.now() + remainingDays * 86400000);
      initialPurchase.credential.activeUntil = simulatedActiveUntil;
      qrCredentialStore[0] = initialPurchase.credential;

      // Tính thử số tiền khấu trừ trước khi xác nhận nâng cấp
      const calc = await service.calculateUpgradeCredit(userId, GymPlanType.MONTH_3);
      expect(calc.hasActivePlan).toBe(true);
      expect(calc.remainingDays).toBe(remainingDays);

      // Giá trị mỗi ngày = 500.000 / 30 = 16.666,67 VND
      // 20 ngày chưa dùng = 16.666,67 * 20 = 333.333 VND
      const expectedCredit = Math.round((500000 / 30) * remainingDays);
      expect(calc.creditDeducted).toBe(expectedCredit);

      // Giá gói 3 tháng: 1.350.000 VND -> Thực trả = 1.350.000 - 333.333 = 1.016.667 VND
      const expectedPay = 1350000 - expectedCredit;
      expect(calc.finalAmount).toBe(expectedPay);

      // Thực hiện nâng cấp gói
      const upgradeRes = await service.purchaseOrRenewPlan(userId, GymPlanType.MONTH_3, {
        isUpgrade: true,
      });

      expect(upgradeRes.isUpgrade).toBe(true);
      expect(upgradeRes.creditDeducted).toBe(expectedCredit);
      expect(upgradeRes.paidAmount).toBe(expectedPay);

      // Vẫn dùng tiếp mã QR cũ (BR-26, BR-30a)
      expect(upgradeRes.credential.qrCode).toBe(originalQrCode);
      expect(upgradeRes.credential.currentPlanCode).toBe(GymPlanType.MONTH_3);

      // Hạn mới tính từ ngày nâng cấp: 90 ngày
      const newDiffDays = Math.round(
        (upgradeRes.credential.activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(newDiffDays).toBe(90);

      // Gói cũ chuyển trạng thái UPGRADED
      const oldSub = subscriptionStore.find((s) => s.planCode === GymPlanType.MONTH_1);
      expect(oldSub.status).toBe('UPGRADED');
    });
  });
});
