import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VouchersService } from './vouchers.service';
import { Voucher } from './schemas/voucher.schema';
import { VoucherUsage, VoucherUsageStatus } from './schemas/voucher-usage.schema';
import { DiscountType } from '../common/enums';

describe('VouchersService (Epic E13 - Voucher Schema & Atomic Counter)', () => {
  let service: VouchersService;
  let mockVoucherModel: any;
  let mockVoucherUsageModel: any;

  const mockVoucherDoc: any = {
    _id: new Types.ObjectId(),
    code: 'PHANTA50K',
    title: 'Giảm 50K cho đơn từ 200K',
    discountType: DiscountType.FIXED,
    discountValue: 50000,
    minOrderValue: 200000,
    maxDiscountAmount: undefined,
    totalBudget: 1000000, // 1 triệu
    usedBudget: 900000,   // đã dùng 900k -> còn 100k
    usageLimit: 100,
    usedCount: 10,
    perUserLimit: 1,
    startDate: new Date(Date.now() - 86400000), // hôm qua
    endDate: new Date(Date.now() + 86400000),   // ngày mai
    isActive: true,
    applicableSports: ['FOOTBALL'],
  };

  beforeEach(async () => {
    mockVoucherModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    mockVoucherUsageModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        {
          provide: getModelToken(Voucher.name),
          useValue: mockVoucherModel,
        },
        {
          provide: getModelToken(VoucherUsage.name),
          useValue: mockVoucherUsageModel,
        },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. calculateDiscount - Tính mức chiết khấu', () => {
    it('Tính chiết khấu số tiền cố định (FIXED)', () => {
      const voucher = {
        discountType: DiscountType.FIXED,
        discountValue: 50000,
      } as any;

      expect(service.calculateDiscount(voucher, 200000)).toBe(50000);
      expect(service.calculateDiscount(voucher, 30000)).toBe(30000); // Không vượt quá giá trị đơn
    });

    it('Tính chiết khấu phần trăm (PERCENT) không trần', () => {
      const voucher = {
        discountType: DiscountType.PERCENT,
        discountValue: 10, // 10%
      } as any;

      expect(service.calculateDiscount(voucher, 300000)).toBe(30000);
    });

    it('Tính chiết khấu phần trăm (PERCENT) có chặn trần maxDiscountAmount', () => {
      const voucher = {
        discountType: DiscountType.PERCENT,
        discountValue: 20, // 20% của 1.000.000 = 200.000
        maxDiscountAmount: 50000, // nhưng trần là 50.000
      } as any;

      expect(service.calculateDiscount(voucher, 1000000)).toBe(50000);
    });
  });

  describe('2. validateVoucher - Kiểm tra điều kiện áp dụng', () => {
    it('Ném BadRequestException nếu đơn hàng chưa đạt minOrderValue', async () => {
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVoucherDoc),
      });

      await expect(
        service.validateVoucher({ code: 'PHANTA50K', orderAmount: 150000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Ném BadRequestException nếu sai môn thể thao áp dụng', async () => {
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVoucherDoc),
      });

      await expect(
        service.validateVoucher({ code: 'PHANTA50K', orderAmount: 300000, sportType: 'TENNIS' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Ném ConflictException nếu hết số lượt toàn hệ thống (usedCount >= usageLimit)', async () => {
      const exhaustedVoucher = { ...mockVoucherDoc, usedCount: 100, usageLimit: 100 };
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(exhaustedVoucher),
      });

      await expect(
        service.validateVoucher({ code: 'PHANTA50K', orderAmount: 300000, sportType: 'FOOTBALL' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Ném ConflictException nếu vượt quá tổng ngân sách phát hành (BR-13, AC-13)', async () => {
      // Ngân sách 1tr, đã dùng 980k, voucher giảm 50k -> cần 1.030.000k > 1.000.000k
      const budgetVoucher = { ...mockVoucherDoc, totalBudget: 1000000, usedBudget: 980000 };
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(budgetVoucher),
      });

      await expect(
        service.validateVoucher({ code: 'PHANTA50K', orderAmount: 300000, sportType: 'FOOTBALL' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Ném ConflictException nếu user đã vượt quá perUserLimit (BR-15, AC-15, AC-79)', async () => {
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVoucherDoc),
      });
      // User đã có 1 lượt APPLIED hoặc COMMITTED
      mockVoucherUsageModel.countDocuments.mockResolvedValue(1);

      await expect(
        service.validateVoucher(
          { code: 'PHANTA50K', orderAmount: 300000, sportType: 'FOOTBALL' },
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('3. applyVoucherAtomically - Bộ đếm nguyên tử & Chống Race Condition (BR-13, AC-13)', () => {
    it('Áp dụng thành công và tăng nguyên tử usedCount, usedBudget', async () => {
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVoucherDoc),
      });
      mockVoucherUsageModel.countDocuments.mockResolvedValue(0);

      // findOneAndUpdate thành công
      mockVoucherModel.findOneAndUpdate.mockResolvedValue({
        ...mockVoucherDoc,
        usedCount: 11,
        usedBudget: 950000,
      });

      const mockUsageId = new Types.ObjectId();
      mockVoucherUsageModel.create.mockResolvedValue({
        _id: mockUsageId,
        voucherCode: 'PHANTA50K',
        discountAmount: 50000,
      });

      const result = await service.applyVoucherAtomically(
        {
          code: 'PHANTA50K',
          orderAmount: 300000,
          sportType: 'FOOTBALL',
        },
        new Types.ObjectId().toString(),
      );

      expect(result.success).toBe(true);
      expect(result.discountAmount).toBe(50000);
      expect(result.finalAmount).toBe(250000);
      expect(mockVoucherModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: mockVoucherDoc._id,
          isActive: true,
          usedCount: { $lt: 100 },
        }),
        expect.objectContaining({
          $inc: {
            usedCount: 1,
            usedBudget: 50000,
          },
        }),
        expect.anything(),
      );
    });

    it('Ném ConflictException nếu atomic findOneAndUpdate trả về null do tranh chấp hết ngân sách/lượt (AC-13)', async () => {
      mockVoucherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVoucherDoc),
      });
      mockVoucherUsageModel.countDocuments.mockResolvedValue(0);

      // Mô phỏng 50 request đồng thời: request thua cuộc nhận null do điều kiện $lte ngân sách không còn thỏa mãn
      mockVoucherModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.applyVoucherAtomically(
          {
            code: 'PHANTA50K',
            orderAmount: 300000,
            sportType: 'FOOTBALL',
          },
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('4. rollbackVoucherUsage - Hoàn lại lượt và ngân sách khi hủy đơn', () => {
    it('Cập nhật trạng thái ROLLED_BACK và trừ $inc lại usedCount và usedBudget', async () => {
      const mockUsage = {
        _id: new Types.ObjectId(),
        voucherId: mockVoucherDoc._id,
        discountAmount: 50000,
        status: VoucherUsageStatus.ROLLED_BACK,
      };

      mockVoucherUsageModel.findOneAndUpdate.mockResolvedValue(mockUsage);
      mockVoucherModel.findByIdAndUpdate.mockResolvedValue(mockVoucherDoc);

      const res = await service.rollbackVoucherUsage(mockUsage._id.toString());
      expect(res).toBeDefined();

      expect(mockVoucherModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockVoucherDoc._id,
        expect.objectContaining({
          $inc: {
            usedCount: -1,
            usedBudget: -50000,
          },
        }),
      );
    });
  });
});
