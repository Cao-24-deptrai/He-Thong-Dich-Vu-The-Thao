import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VoucherService } from './voucher.service.js';
import { Voucher } from '../schemas/voucher.schema.js';
import { VoucherUsage } from '../schemas/voucher-usage.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  VoucherDiscountType,
  VoucherScope,
  PromotionChannel,
} from '@sports/shared';

describe('VoucherService', () => {
  let service: VoucherService;
  let mockVoucherModel: any;
  let mockVoucherUsageModel: any;
  let mockUserModel: any;
  let mockAuditLogService: any;

  const inMemoryVouchers: any[] = [];
  const inMemoryUsages: any[] = [];
  const customerId = new Types.ObjectId();
  const customerPhone = '0988776655';

  beforeEach(async () => {
    inMemoryVouchers.length = 0;
    inMemoryUsages.length = 0;

    mockVoucherModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryVouchers.findIndex((v) => v._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryVouchers[idx] = { ...this };
        } else {
          inMemoryVouchers.push({ ...this });
        }
        return this;
      }),
    }));

    mockVoucherModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryVouchers.find((v) => {
        if (query.code && v.code === query.code) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockVoucherModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryVouchers.find((v) => v._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryVouchers.findIndex((v) => v._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryVouchers[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockVoucherModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryVouchers),
    }));

    mockVoucherModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryVouchers.length),
    }));

    mockVoucherModel.findOneAndUpdate = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryVouchers.find((v) => {
        if (query.code && v.code !== query.code) return false;
        if (query.isActive !== undefined && v.isActive !== query.isActive) return false;
        if (v.totalUsageLimit !== undefined && v.usedCount >= v.totalUsageLimit) return false;
        return true;
      });

      if (!target) return Promise.resolve(null);

      if (update.$inc?.usedCount) {
        target.usedCount = (target.usedCount || 0) + update.$inc.usedCount;
      }
      return Promise.resolve({ ...target });
    });

    mockVoucherModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryVouchers.find((v) => v.code === query.code);
      if (target && update.$inc?.usedCount) {
        target.usedCount = (target.usedCount || 0) + update.$inc.usedCount;
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    mockVoucherUsageModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryUsages.findIndex((u) => u._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryUsages[idx] = { ...this };
        } else {
          inMemoryUsages.push({ ...this });
        }
        return this;
      }),
    }));

    mockVoucherUsageModel.countDocuments = jest.fn().mockImplementation((query) => {
      const count = inMemoryUsages.filter((u) => {
        if (query.voucherCode && u.voucherCode !== query.voucherCode) return false;
        if (query.customerId && u.customerId.toString() !== query.customerId.toString()) return false;
        if (query.isRolledBack !== undefined && u.isRolledBack !== query.isRolledBack) return false;
        return true;
      }).length;
      return Promise.resolve(count);
    });

    mockVoucherUsageModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryUsages.find((u) => {
        if (query.voucherCode && u.voucherCode !== query.voucherCode) return false;
        if (query.customerId && u.customerId.toString() !== query.customerId.toString()) return false;
        if (query.orderId && u.orderId !== query.orderId) return false;
        if (query.isRolledBack !== undefined && u.isRolledBack !== query.isRolledBack) return false;
        return true;
      });
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryUsages.findIndex((u) => u._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryUsages[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        if (query.phone === customerPhone) {
          return Promise.resolve({
            _id: customerId,
            phone: customerPhone,
            fullName: 'Nguyen Van A',
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherService,
        { provide: getModelToken(Voucher.name), useValue: mockVoucherModel },
        { provide: getModelToken(VoucherUsage.name), useValue: mockVoucherUsageModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<VoucherService>(VoucherService);
  });

  describe('createVoucher & updateVoucher', () => {
    it('Tạo voucher mới thành công với các thiết lập hợp lệ', async () => {
      const voucher = await service.createVoucher({
        code: 'SUMMER2026',
        name: 'Giảm giá hè 2026',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 20,
        maxDiscountAmount: 50000,
        minOrderAmount: 100000,
        applicableScopes: [VoucherScope.COURT],
        validFrom: new Date(Date.now() - 3600000),
        validTo: new Date(Date.now() + 86400000 * 30),
        totalUsageLimit: 100,
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
        isActive: true,
      });

      expect(voucher.code).toBe('SUMMER2026');
      expect(voucher.usedCount).toBe(0);
      expect(inMemoryVouchers).toHaveLength(1);
    });

    it('Ném lỗi ConflictException nếu mã voucher đã tồn tại', async () => {
      await service.createVoucher({
        code: 'SUMMER2026',
        name: 'Giảm giá hè 2026',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 20,
        minOrderAmount: 100000,
        applicableScopes: [VoucherScope.COURT],
        validFrom: new Date(),
        validTo: new Date(Date.now() + 86400000),
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      await expect(
        service.createVoucher({
          code: 'summer2026',
          name: 'Trùng mã',
          discountType: VoucherDiscountType.FIXED,
          discountValue: 30000,
          minOrderAmount: 0,
          applicableScopes: [VoucherScope.ALL],
          validFrom: new Date(),
          validTo: new Date(Date.now() + 86400000),
          perCustomerLimit: 1,
          channel: PromotionChannel.ALL,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Ném lỗi BadRequestException nếu validFrom > validTo', async () => {
      await expect(
        service.createVoucher({
          code: 'INVALIDTIME',
          name: 'Sai thời gian',
          discountType: VoucherDiscountType.FIXED,
          discountValue: 10000,
          minOrderAmount: 0,
          applicableScopes: [VoucherScope.ALL],
          validFrom: new Date('2026-12-31'),
          validTo: new Date('2026-01-01'),
          perCustomerLimit: 1,
          channel: PromotionChannel.ALL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Cập nhật voucher thành công và cập nhật trường hợp lệ', async () => {
      const created = await service.createVoucher({
        code: 'OLDCODE',
        name: 'Voucher Cũ',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 20000,
        minOrderAmount: 50000,
        applicableScopes: [VoucherScope.ALL],
        validFrom: new Date(),
        validTo: new Date(Date.now() + 86400000),
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      const updated = await service.updateVoucher(created._id.toString(), {
        name: 'Voucher Mới Được Đổi Tên',
        discountValue: 25000,
      });

      expect(updated.name).toBe('Voucher Mới Được Đổi Tên');
      expect(updated.discountValue).toBe(25000);
    });
  });

  describe('validateAndCalculateDiscount', () => {
    beforeEach(async () => {
      await service.createVoucher({
        code: 'VIP50',
        name: 'Giảm 50% tối đa 100k cho sân',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 50,
        maxDiscountAmount: 100000,
        minOrderAmount: 100000,
        applicableScopes: [VoucherScope.COURT],
        validFrom: new Date(Date.now() - 3600000),
        validTo: new Date(Date.now() + 86400000),
        totalUsageLimit: 50,
        perCustomerLimit: 1,
        channel: PromotionChannel.ONLINE,
        isActive: true,
      });
    });

    it('Thẩm định thất bại nếu mã voucher không tồn tại hoặc ngừng áp dụng', async () => {
      const res = await service.validateAndCalculateDiscount({
        code: 'NON_EXISTENT',
        scope: VoucherScope.COURT,
        orderAmount: 200000,
      });

      expect(res.isValid).toBe(false);
      expect(res.discountAmount).toBe(0);
      expect(res.reason).toContain('không tồn tại');
    });

    it('Thẩm định thất bại nếu chưa đến hạn hoặc đã quá hạn sử dụng', async () => {
      await service.createVoucher({
        code: 'EXPIRED10K',
        name: 'Hết hạn',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 10000,
        minOrderAmount: 0,
        applicableScopes: [VoucherScope.ALL],
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-01-02'),
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      const res = await service.validateAndCalculateDiscount({
        code: 'EXPIRED10K',
        scope: VoucherScope.ALL,
        orderAmount: 100000,
      });

      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('hết hạn');
    });

    it('Thẩm định thất bại nếu kênh áp dụng không tương thích (POS vs ONLINE)', async () => {
      const res = await service.validateAndCalculateDiscount({
        code: 'VIP50',
        scope: VoucherScope.COURT,
        orderAmount: 200000,
        channel: PromotionChannel.POS,
      });

      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('chỉ áp dụng cho kênh');
    });

    it('Thẩm định thất bại nếu phạm vi dịch vụ không tương thích (CANTEEN vs COURT)', async () => {
      const res = await service.validateAndCalculateDiscount({
        code: 'VIP50',
        scope: VoucherScope.CANTEEN,
        orderAmount: 200000,
        channel: PromotionChannel.ONLINE,
      });

      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('không áp dụng cho dịch vụ');
    });

    it('Thẩm định thất bại nếu đơn hàng chưa đạt giá trị tối thiểu', async () => {
      const res = await service.validateAndCalculateDiscount({
        code: 'VIP50',
        scope: VoucherScope.COURT,
        orderAmount: 50000, // minOrderAmount is 100000
        channel: PromotionChannel.ONLINE,
      });

      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('chưa đạt giá trị tối thiểu');
    });

    it('Tính toán giảm giá PERCENT chính xác và khống chế trần maxDiscountAmount', async () => {
      // 50% của 300,000 là 150,000 nhưng maxDiscountAmount = 100,000
      const res = await service.validateAndCalculateDiscount({
        code: 'VIP50',
        scope: VoucherScope.COURT,
        orderAmount: 300000,
        channel: PromotionChannel.ONLINE,
      });

      expect(res.isValid).toBe(true);
      expect(res.discountAmount).toBe(100000);
      expect(res.finalAmount).toBe(200000);
    });

    it('Tính toán giảm giá FIXED chính xác không vượt quá orderAmount', async () => {
      await service.createVoucher({
        code: 'FLAT30K',
        name: 'Giảm cố định 30k',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 30000,
        minOrderAmount: 20000,
        applicableScopes: [VoucherScope.ALL],
        validFrom: new Date(Date.now() - 3600000),
        validTo: new Date(Date.now() + 86400000),
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      const res = await service.validateAndCalculateDiscount({
        code: 'FLAT30K',
        scope: VoucherScope.CANTEEN,
        orderAmount: 50000,
      });

      expect(res.isValid).toBe(true);
      expect(res.discountAmount).toBe(30000);
      expect(res.finalAmount).toBe(20000);
    });
  });

  describe('consumeVoucher & rollbackVoucherUsage', () => {
    it('Tiêu voucher thành công tăng usedCount và ghi nhận bản ghi VoucherUsage', async () => {
      await service.createVoucher({
        code: 'LIMITED1',
        name: 'Voucher giới hạn',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 20000,
        minOrderAmount: 0,
        applicableScopes: [VoucherScope.ALL],
        validFrom: new Date(),
        validTo: new Date(Date.now() + 86400000),
        totalUsageLimit: 10,
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      const usage = await service.consumeVoucher(
        'LIMITED1',
        customerId.toString(),
        'BOOKING',
        'order-123',
        20000,
      );

      expect(usage.voucherCode).toBe('LIMITED1');
      expect(usage.discountAmount).toBe(20000);
      expect(inMemoryVouchers[0].usedCount).toBe(1);

      // Thẩm định lại giới hạn perCustomerLimit: khách hàng đã dùng 1 lần -> lần 2 bị từ chối
      const secondCheck = await service.validateAndCalculateDiscount({
        code: 'LIMITED1',
        customerId: customerId.toString(),
        scope: VoucherScope.ALL,
        orderAmount: 50000,
      });
      expect(secondCheck.isValid).toBe(false);
      expect(secondCheck.reason).toContain('hết lượt cho phép');
    });

    it('Hoàn trả lượt dùng voucher (rollback) khi đơn bị hủy trong hạn', async () => {
      await service.createVoucher({
        code: 'ROLLBACK_TEST',
        name: 'Voucher hoàn trả',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 15000,
        minOrderAmount: 0,
        applicableScopes: [VoucherScope.ALL],
        validFrom: new Date(),
        validTo: new Date(Date.now() + 86400000),
        totalUsageLimit: 10,
        perCustomerLimit: 1,
        channel: PromotionChannel.ALL,
      });

      await service.consumeVoucher(
        'ROLLBACK_TEST',
        customerId.toString(),
        'BOOKING',
        'order-cancel-99',
        15000,
      );

      expect(inMemoryVouchers[0].usedCount).toBe(1);

      // Rollback
      await service.rollbackVoucherUsage(
        'ROLLBACK_TEST',
        customerId.toString(),
        'order-cancel-99',
      );

      expect(inMemoryVouchers[0].usedCount).toBe(0);
      expect(inMemoryUsages[0].isRolledBack).toBe(true);

      // Sau khi rollback, khách hàng kiểm tra lại voucher thì hợp lệ trở lại
      const checkAfterRollback = await service.validateAndCalculateDiscount({
        code: 'ROLLBACK_TEST',
        customerId: customerId.toString(),
        scope: VoucherScope.ALL,
        orderAmount: 50000,
      });
      expect(checkAfterRollback.isValid).toBe(true);
    });
  });
});
