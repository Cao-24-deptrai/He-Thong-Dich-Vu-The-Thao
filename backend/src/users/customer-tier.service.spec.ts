import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CustomerTierService, TIER_CONFIG } from './customer-tier.service';
import { User } from './schemas/user.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { MembershipTier } from '../common/enums';

describe('CustomerTierService (Epic E13 - Rolling 12-Month Spend & Loyalty Points)', () => {
  let service: CustomerTierService;
  let mockUserModel: any;
  let mockBookingModel: any;

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    mockBookingModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerTierService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Booking.name),
          useValue: mockBookingModel,
        },
      ],
    }).compile();

    service = module.get<CustomerTierService>(CustomerTierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. determineTier - Xác định hạng theo chi tiêu 12 tháng trượt (BR-16, BR-17)', () => {
    it('Chi tiêu < 5.000.000 VND -> MEMBER', () => {
      expect(service.determineTier(0)).toBe(MembershipTier.MEMBER);
      expect(service.determineTier(4999999)).toBe(MembershipTier.MEMBER);
    });

    it('Chi tiêu 5.000.000 - 14.999.999 VND -> SILVER', () => {
      expect(service.determineTier(5000000)).toBe(MembershipTier.SILVER);
      expect(service.determineTier(14999999)).toBe(MembershipTier.SILVER);
    });

    it('Chi tiêu 15.000.000 - 29.999.999 VND -> GOLD', () => {
      expect(service.determineTier(15000000)).toBe(MembershipTier.GOLD);
      expect(service.determineTier(29999999)).toBe(MembershipTier.GOLD);
    });

    it('Chi tiêu >= 30.000.000 VND -> PLATINUM', () => {
      expect(service.determineTier(30000000)).toBe(MembershipTier.PLATINUM);
      expect(service.determineTier(50000000)).toBe(MembershipTier.PLATINUM);
    });
  });

  describe('2. recalculateUserTier - Tự động nâng hạng / hạ hạng (BR-18, AC-16, AC-17)', () => {
    it('Nâng hạng (Upgrade): từ MEMBER lên GOLD khi chi tiêu 12 tháng đạt 18.000.000 VND', async () => {
      const mockUser: any = {
        _id: new Types.ObjectId(mockUserId),
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        membershipTier: MembershipTier.MEMBER,
        rolling12MonthSpend: 2000000,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Aggregation trả về tổng chi tiêu 12 tháng qua = 18 triệu
      mockBookingModel.aggregate.mockResolvedValue([{ _id: null, totalSpend: 18000000 }]);

      const result = await service.recalculateUserTier(mockUserId);

      expect(result.previousTier).toBe(MembershipTier.MEMBER);
      expect(result.currentTier).toBe(MembershipTier.GOLD);
      expect(result.isUpgraded).toBe(true);
      expect(result.isDowngraded).toBe(false);
      expect(mockUser.membershipTier).toBe(MembershipTier.GOLD);
      expect(mockUser.rolling12MonthSpend).toBe(18000000);
      expect(mockUser.tierUpgradedAt).toBeDefined();
    });

    it('Hạ hạng (Downgrade): từ PLATINUM xuống SILVER khi chi tiêu 12 tháng chỉ còn 8.000.000 VND', async () => {
      const mockUser: any = {
        _id: new Types.ObjectId(mockUserId),
        fullName: 'Nguyễn Văn B',
        phone: '0987654321',
        membershipTier: MembershipTier.PLATINUM,
        rolling12MonthSpend: 35000000,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockBookingModel.aggregate.mockResolvedValue([{ _id: null, totalSpend: 8000000 }]);

      const result = await service.recalculateUserTier(mockUserId);

      expect(result.previousTier).toBe(MembershipTier.PLATINUM);
      expect(result.currentTier).toBe(MembershipTier.SILVER);
      expect(result.isUpgraded).toBe(false);
      expect(result.isDowngraded).toBe(true);
      expect(mockUser.membershipTier).toBe(MembershipTier.SILVER);
    });
  });

  describe('3. addLoyaltyPoints - Tích điểm theo hệ số hạng thành viên (BR-16)', () => {
    it('Khách hàng MEMBER (1x): chi tiêu 1.000.000 VND -> tích 100 điểm', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockUserId),
          membershipTier: MembershipTier.MEMBER,
        }),
      });

      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        loyaltyPoints: 100,
      });

      const res = await service.addLoyaltyPoints(mockUserId, 1000000);
      expect(res.pointsEarned).toBe(100);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          $inc: { loyaltyPoints: 100, totalLifetimeSpend: 1000000 },
        }),
        expect.anything(),
      );
    });

    it('Khách hàng GOLD (1.5x): chi tiêu 1.000.000 VND -> tích 150 điểm', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockUserId),
          membershipTier: MembershipTier.GOLD,
        }),
      });

      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        loyaltyPoints: 650,
      });

      const res = await service.addLoyaltyPoints(mockUserId, 1000000);
      expect(res.pointsEarned).toBe(150); // 100 * 1.5 = 150 điểm
    });

    it('Khách hàng PLATINUM (2.0x): chi tiêu 1.000.000 VND -> tích 200 điểm', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockUserId),
          membershipTier: MembershipTier.PLATINUM,
        }),
      });

      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        loyaltyPoints: 1200,
      });

      const res = await service.addLoyaltyPoints(mockUserId, 1000000);
      expect(res.pointsEarned).toBe(200); // 100 * 2.0 = 200 điểm
    });
  });

  describe('4. redeemLoyaltyPoints - Tiêu điểm thưởng giảm giá đơn hàng (1 điểm = 100 VND)', () => {
    it('Đổi 200 điểm (giảm 20.000 VND) thành công', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockUserId),
          loyaltyPoints: 500,
        }),
      });

      mockUserModel.findOneAndUpdate.mockResolvedValue({
        loyaltyPoints: 300,
      });

      const res = await service.redeemLoyaltyPoints(mockUserId, 200, 250000);

      expect(res.pointsRedeemed).toBe(200);
      expect(res.discountAmount).toBe(20000); // 200 * 100 VND
      expect(res.remainingPoints).toBe(300);
    });

    it('Ném BadRequestException nếu không đủ số dư điểm thưởng', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockUserId),
          loyaltyPoints: 50,
        }),
      });

      await expect(
        service.redeemLoyaltyPoints(mockUserId, 100, 200000),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
