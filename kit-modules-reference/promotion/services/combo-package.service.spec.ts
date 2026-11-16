import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ComboPackageService } from './combo-package.service.js';
import { ComboPackage } from '../schemas/combo-package.schema.js';
import { UserPackage } from '../schemas/user-package.schema.js';
import { Voucher } from '../schemas/voucher.schema.js';
import { VoucherUsage } from '../schemas/voucher-usage.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  ComboItemType,
  UserPackageStatus,
  PaymentMethod,
  PromotionChannel,
} from '@sports/shared';

describe('ComboPackageService', () => {
  let service: ComboPackageService;
  let mockComboModel: any;
  let mockUserPackageModel: any;
  let mockVoucherModel: any;
  let mockVoucherUsageModel: any;
  let mockUserModel: any;
  let mockWalletService: any;
  let mockCashierShiftService: any;
  let mockAuditLogService: any;

  const inMemoryCombos: any[] = [];
  const inMemoryUserPackages: any[] = [];
  const customerId = new Types.ObjectId();
  const customerPhone = '0912345678';

  beforeEach(async () => {
    inMemoryCombos.length = 0;
    inMemoryUserPackages.length = 0;

    mockComboModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryCombos.findIndex((c) => c._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryCombos[idx] = { ...this };
        else inMemoryCombos.push({ ...this });
        return this;
      }),
    }));

    mockComboModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryCombos.find((c) => {
        if (query.code && c.code === query.code) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockComboModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryCombos.find((c) => c._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryCombos.findIndex((c) => c._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryCombos[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockComboModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryCombos),
    }));

    mockComboModel.countDocuments = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(
        query?.isActive ? inMemoryCombos.filter((c) => c.isActive).length : inMemoryCombos.length,
      ),
    }));

    mockUserPackageModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryUserPackages.findIndex((p) => p._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryUserPackages[idx] = { ...this };
        else inMemoryUserPackages.push({ ...this });
        return this;
      }),
    }));

    mockUserPackageModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryUserPackages.find((p) => {
        if (query.idempotencyKey && p.idempotencyKey === query.idempotencyKey) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockUserPackageModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryUserPackages.find((p) => p._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryUserPackages.findIndex((p) => p._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryUserPackages[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockUserPackageModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryUserPackages),
    }));

    mockVoucherModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(query?.isActive ? 5 : 10),
      })),
    };

    mockVoucherUsageModel = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([
          { discountAmount: 20000, isRolledBack: false },
          { discountAmount: 30000, isRolledBack: false },
        ]),
      })),
    };

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        if (query.phone === customerPhone) {
          return Promise.resolve({
            _id: customerId,
            phone: customerPhone,
            fullName: 'Tran Van B',
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockWalletService = {
      pay: jest.fn().mockResolvedValue({ success: true }),
    };

    mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      recordOrderSales: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComboPackageService,
        { provide: getModelToken(ComboPackage.name), useValue: mockComboModel },
        { provide: getModelToken(UserPackage.name), useValue: mockUserPackageModel },
        { provide: getModelToken(Voucher.name), useValue: mockVoucherModel },
        { provide: getModelToken(VoucherUsage.name), useValue: mockVoucherUsageModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: WalletService, useValue: mockWalletService },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ComboPackageService>(ComboPackageService);
  });

  describe('createComboPackage & updateComboPackage', () => {
    it('Tạo gói combo mới thành công', async () => {
      const combo = await service.createComboPackage({
        code: 'COMBO_BADMINTON_10H',
        name: 'Gói 10 Giờ Sân Cầu Lông',
        price: 800000,
        items: [
          {
            itemType: ComboItemType.COURT_HOURS,
            quantity: 10,
            unit: 'giờ',
            courtType: 'BADMINTON',
          },
        ],
        validDays: 60,
        channel: PromotionChannel.ALL,
        isActive: true,
      });

      expect(combo.code).toBe('COMBO_BADMINTON_10H');
      expect(combo.price).toBe(800000);
      expect(inMemoryCombos).toHaveLength(1);
    });

    it('Ném lỗi ConflictException nếu mã gói combo đã tồn tại', async () => {
      await service.createComboPackage({
        code: 'COMBO_DUP',
        name: 'Gói Trùng',
        price: 500000,
        items: [{ itemType: ComboItemType.COURT_HOURS, quantity: 5, unit: 'giờ' }],
        validDays: 30,
        channel: PromotionChannel.ALL,
      });

      await expect(
        service.createComboPackage({
          code: 'combo_dup',
          name: 'Gói Trùng 2',
          price: 500000,
          items: [{ itemType: ComboItemType.COURT_HOURS, quantity: 5, unit: 'giờ' }],
          validDays: 30,
          channel: PromotionChannel.ALL,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('purchaseComboPackage & SPEC Invariants', () => {
    it('Bất biến SPEC Rule 3: Từ chối thanh toán bằng Ví nội bộ nếu combo chứa thành phần Gym hoặc PT (WALLET_PAYMENT_FORBIDDEN_FOR_COMBO)', async () => {
      const hybridCombo = await service.createComboPackage({
        code: 'COMBO_HYBRID_GYM_COURT',
        name: 'Gói Thể Thao Đa Năng (Sân + Gym)',
        price: 1500000,
        items: [
          { itemType: ComboItemType.COURT_HOURS, quantity: 10, unit: 'giờ' },
          { itemType: ComboItemType.GYM_DAYS, quantity: 30, unit: 'ngày' },
        ],
        validDays: 60,
        channel: PromotionChannel.ALL,
      });

      await expect(
        service.purchaseComboPackage('customer-1', {
          comboPackageId: hybridCombo._id.toString(),
          customerPhone,
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          idempotencyKey: 'idemp-combo-wallet-fail',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockWalletService.pay).not.toHaveBeenCalled();
    });

    it('Cho phép thanh toán bằng Ví nội bộ nếu combo CHỈ chứa dịch vụ nằm trong danh mục ví (sân thể thao)', async () => {
      const courtOnlyCombo = await service.createComboPackage({
        code: 'COMBO_COURT_ONLY',
        name: 'Gói Sân Thể Thao Thuần Túy',
        price: 1000000,
        items: [{ itemType: ComboItemType.COURT_HOURS, quantity: 12, unit: 'giờ' }],
        validDays: 45,
        channel: PromotionChannel.ALL,
      });

      const pkg = await service.purchaseComboPackage('customer-1', {
        comboPackageId: courtOnlyCombo._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.INTERNAL_WALLET,
        idempotencyKey: 'idemp-combo-wallet-success',
      });

      expect(pkg).toBeDefined();
      expect(pkg.packageCode).toContain('PKG-');
      expect(pkg.status).toBe(UserPackageStatus.ACTIVE);
      expect(pkg.remainingItems![0]!.remainingQuantity).toBe(12);
      expect(mockWalletService.pay).toHaveBeenCalled();
    });

    it('Thanh toán bằng Tiền mặt tại quầy thu ngân thành công và cập nhật doanh thu ca thu ngân', async () => {
      const combo = await service.createComboPackage({
        code: 'COMBO_CASH',
        name: 'Gói Tiền Mặt',
        price: 600000,
        items: [{ itemType: ComboItemType.GAMING_HOURS, quantity: 40, unit: 'giờ' }],
        validDays: 30,
        channel: PromotionChannel.POS,
      });

      const pkg = await service.purchaseComboPackage('cashier-user', {
        comboPackageId: combo._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-combo-cash-success',
      });

      expect(pkg.paymentMethod).toBe(PaymentMethod.CASH);
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        expect.any(String),
        600000,
        PaymentMethod.CASH,
      );
    });

    it('Xử lý Idempotency Replay không trừ tiền 2 lần khi gửi trùng idempotencyKey', async () => {
      const combo = await service.createComboPackage({
        code: 'COMBO_REPLAY',
        name: 'Gói Test Replay',
        price: 500000,
        items: [{ itemType: ComboItemType.COURT_HOURS, quantity: 5, unit: 'giờ' }],
        validDays: 30,
        channel: PromotionChannel.ALL,
      });

      const first = await service.purchaseComboPackage('cashier-user', {
        comboPackageId: combo._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-replay-key-1',
      });

      const second = await service.purchaseComboPackage('cashier-user', {
        comboPackageId: combo._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-replay-key-1',
      });

      expect(first._id.toString()).toBe(second._id.toString());
      // Chỉ ghi nhận doanh thu ca đúng 1 lần
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledTimes(1);
    });
  });

  describe('deductPackageItem & auto-deplete', () => {
    let activePackage: any;

    beforeEach(async () => {
      const combo = await service.createComboPackage({
        code: 'COMBO_DEDUCT_TEST',
        name: 'Gói Thử Nghiệm Khấu Trừ',
        price: 1200000,
        items: [
          { itemType: ComboItemType.COURT_HOURS, quantity: 5, unit: 'giờ', courtType: 'TENNIS' },
          { itemType: ComboItemType.GAMING_HOURS, quantity: 10, unit: 'giờ' },
        ],
        validDays: 30,
        channel: PromotionChannel.ALL,
      });

      activePackage = await service.purchaseComboPackage('customer-1', {
        comboPackageId: combo._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-deduct-test',
      });
    });

    it('Khấu trừ thành công số lượng giờ sân tương ứng', async () => {
      const updated = await service.deductPackageItem({
        userPackageId: activePackage._id.toString(),
        itemType: ComboItemType.COURT_HOURS,
        quantity: 2,
        courtType: 'TENNIS',
      });

      const courtItem = updated.remainingItems.find((i) => i.itemType === ComboItemType.COURT_HOURS);
      expect(courtItem?.remainingQuantity).toBe(3);
      expect(updated.status).toBe(UserPackageStatus.ACTIVE);
    });

    it('Từ chối khấu trừ nếu số dư thành phần trong gói không đủ', async () => {
      await expect(
        service.deductPackageItem({
          userPackageId: activePackage._id.toString(),
          itemType: ComboItemType.COURT_HOURS,
          quantity: 10, // Chỉ có 5 giờ
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Từ chối khấu trừ nếu gói đã hết hạn sử dụng và tự động cập nhật trạng thái EXPIRED', async () => {
      // Ép thời gian hết hạn về quá khứ
      const pkgInMem = inMemoryUserPackages.find((p) => p._id.toString() === activePackage._id.toString());
      pkgInMem.expiresAt = new Date(Date.now() - 3600000);

      await expect(
        service.deductPackageItem({
          userPackageId: activePackage._id.toString(),
          itemType: ComboItemType.COURT_HOURS,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshedPkg = inMemoryUserPackages.find((p) => p._id.toString() === activePackage._id.toString());
      expect(refreshedPkg?.status).toBe(UserPackageStatus.EXPIRED);
    });

    it('Tự động chuyển trạng thái DEPLETED khi tất cả các thành phần trong gói đều đã khấu trừ hết về 0', async () => {
      // Khấu trừ hết 5 giờ sân
      await service.deductPackageItem({
        userPackageId: activePackage._id.toString(),
        itemType: ComboItemType.COURT_HOURS,
        quantity: 5,
        courtType: 'TENNIS',
      });

      // Khấu trừ nốt 10 giờ gaming
      const finalPkg = await service.deductPackageItem({
        userPackageId: activePackage._id.toString(),
        itemType: ComboItemType.GAMING_HOURS,
        quantity: 10,
      });

      expect(finalPkg.status).toBe(UserPackageStatus.DEPLETED);
    });
  });

  describe('getPromotionReport', () => {
    it('Tổng hợp báo cáo khuyến mãi chính xác', async () => {
      const report = await service.getPromotionReport();

      expect(report.totalVouchers).toBe(10);
      expect(report.activeVouchers).toBe(5);
      expect(report.totalVoucherUsages).toBe(2);
      expect(report.totalDiscountAmount).toBe(50000);
    });
  });
});
