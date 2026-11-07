import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { MembershipTier, BookingStatus } from '../common/enums';

export interface TierBenefit {
  minSpend: number;
  name: string;
  pointMultiplier: number;
  discountPercent: number;
  advanceBookingDays: number;
  description: string;
}

export const TIER_CONFIG: Record<MembershipTier, TierBenefit> = {
  [MembershipTier.MEMBER]: {
    minSpend: 0,
    name: 'Thành viên Đồng (Member)',
    pointMultiplier: 1.0, // 1 điểm cho mỗi 10.000 VND
    discountPercent: 0,
    advanceBookingDays: 3,
    description: 'Tích điểm cơ bản (1x), đặt sân trước tối đa 3 ngày',
  },
  [MembershipTier.SILVER]: {
    minSpend: 5000000, // 5 triệu VND
    name: 'Hội viên Bạc (Silver)',
    pointMultiplier: 1.2, // Tích điểm 1.2x
    discountPercent: 5,
    advanceBookingDays: 7,
    description: 'Giảm 5% đơn đặt sân, tích điểm 1.2x, đặt trước 7 ngày',
  },
  [MembershipTier.GOLD]: {
    minSpend: 15000000, // 15 triệu VND
    name: 'Hội viên Vàng (Gold)',
    pointMultiplier: 1.5, // Tích điểm 1.5x
    discountPercent: 10,
    advanceBookingDays: 14,
    description: 'Giảm 10% đơn đặt sân, tích điểm 1.5x, đặt trước 14 ngày, ưu tiên giờ vàng',
  },
  [MembershipTier.PLATINUM]: {
    minSpend: 30000000, // 30 triệu VND
    name: 'Hội viên Bạch Kim (Platinum)',
    pointMultiplier: 2.0, // Tích điểm 2.0x
    discountPercent: 15,
    advanceBookingDays: 30,
    description: 'Giảm 15% đơn đặt sân, tích điểm 2x, đặt trước 30 ngày, miễn phí hủy trước 12h',
  },
};

export const POINT_EXCHANGE_RATE = 100; // 1 điểm thưởng = 100 VND

@Injectable()
export class CustomerTierService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  /**
   * Xác định hạng thành viên dựa trên tổng chi tiêu 12 tháng trượt (BR-16, BR-17)
   */
  determineTier(rollingSpend: number): MembershipTier {
    if (rollingSpend >= TIER_CONFIG[MembershipTier.PLATINUM].minSpend) {
      return MembershipTier.PLATINUM;
    }
    if (rollingSpend >= TIER_CONFIG[MembershipTier.GOLD].minSpend) {
      return MembershipTier.GOLD;
    }
    if (rollingSpend >= TIER_CONFIG[MembershipTier.SILVER].minSpend) {
      return MembershipTier.SILVER;
    }
    return MembershipTier.MEMBER;
  }

  /**
   * Tính toán tổng chi tiêu của khách hàng trong 12 tháng trượt (Rolling 12 Months Spend)
   * Sử dụng Aggregation quét các booking đã xác nhận / hoàn tất trong 365 ngày qua.
   */
  async calculateRolling12MonthSpend(userId: string): Promise<number> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setDate(twelveMonthsAgo.getDate() - 365);

    const matchFilter: any = {
      userId: new Types.ObjectId(userId),
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      $or: [
        { bookingDate: { $gte: twelveMonthsAgo } },
        { bookingDate: { $exists: false }, createdAt: { $gte: twelveMonthsAgo } },
      ],
    };

    const result = await this.bookingModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$totalPrice' },
        },
      },
    ]);

    return result.length > 0 ? (result[0].totalSpend || 0) : 0;
  }

  /**
   * Tính toán và cập nhật lại hạng của khách hàng dựa trên chi tiêu 12 tháng trượt (BR-18, AC-16, AC-17)
   */
  async recalculateUserTier(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const previousTier = user.membershipTier || MembershipTier.MEMBER;
    const rollingSpend = await this.calculateRolling12MonthSpend(userId);
    const currentTier = this.determineTier(rollingSpend);

    const isTierChanged = previousTier !== currentTier;
    const tierPriority = {
      [MembershipTier.MEMBER]: 1,
      [MembershipTier.SILVER]: 2,
      [MembershipTier.GOLD]: 3,
      [MembershipTier.PLATINUM]: 4,
    };

    const isUpgraded = tierPriority[currentTier] > tierPriority[previousTier];
    const isDowngraded = tierPriority[currentTier] < tierPriority[previousTier];

    // Cập nhật thông tin vào User
    user.rolling12MonthSpend = rollingSpend;
    user.membershipTier = currentTier;

    if (isTierChanged) {
      user.tierUpgradedAt = new Date();
      // Hạng có hiệu lực duy trì 12 tháng
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);
      user.tierExpiresAt = expiresAt;
    }

    await user.save();

    return {
      userId,
      fullName: user.fullName,
      phone: user.phone,
      rolling12MonthSpend: rollingSpend,
      previousTier,
      currentTier,
      isUpgraded,
      isDowngraded,
      tierBenefits: TIER_CONFIG[currentTier],
    };
  }

  /**
   * Tích điểm thưởng sau khi đơn thanh toán thành công (BR-16)
   * 10.000 VND = 1 điểm cơ bản, nhân với hệ số theo hạng khách hàng.
   */
  async addLoyaltyPoints(userId: string, spendAmount: number): Promise<{ pointsEarned: number; newTotalPoints: number }> {
    if (spendAmount <= 0) {
      return { pointsEarned: 0, newTotalPoints: 0 };
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const currentTier = user.membershipTier || MembershipTier.MEMBER;
    const multiplier = TIER_CONFIG[currentTier]?.pointMultiplier || 1.0;

    const basePoints = Math.floor(spendAmount / 10000);
    const pointsEarned = Math.floor(basePoints * multiplier);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $inc: {
          loyaltyPoints: pointsEarned,
          totalLifetimeSpend: spendAmount,
        },
      },
      { new: true },
    );

    return {
      pointsEarned,
      newTotalPoints: updatedUser?.loyaltyPoints || 0,
    };
  }

  /**
   * Sử dụng điểm thưởng để quy đổi giảm giá trực tiếp vào đơn đặt sân (1 điểm = 100 VND)
   */
  async redeemLoyaltyPoints(
    userId: string,
    pointsToRedeem: number,
    orderAmount: number,
  ): Promise<{ pointsRedeemed: number; discountAmount: number; remainingPoints: number }> {
    if (pointsToRedeem <= 0) {
      throw new BadRequestException('Số điểm quy đổi phải lớn hơn 0');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.loyaltyPoints < pointsToRedeem) {
      throw new BadRequestException(
        `Không đủ điểm thưởng. Bạn hiện có ${user.loyaltyPoints} điểm, yêu cầu ${pointsToRedeem} điểm`,
      );
    }

    // Giá trị quy đổi tối đa không vượt quá giá trị đơn hàng
    const maxDiscountAllowed = orderAmount;
    const rawDiscount = pointsToRedeem * POINT_EXCHANGE_RATE;
    const actualDiscount = Math.min(rawDiscount, maxDiscountAllowed);
    const actualPointsRedeemed = Math.ceil(actualDiscount / POINT_EXCHANGE_RATE);

    // Trừ điểm nguyên tử
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId), loyaltyPoints: { $gte: actualPointsRedeemed } },
      { $inc: { loyaltyPoints: -actualPointsRedeemed } },
      { new: true },
    );

    if (!updatedUser) {
      throw new BadRequestException('Tranh chấp số dư điểm thưởng, vui lòng thử lại');
    }

    return {
      pointsRedeemed: actualPointsRedeemed,
      discountAmount: actualDiscount,
      remainingPoints: updatedUser.loyaltyPoints,
    };
  }

  /**
   * Lấy thông tin quyền lợi và tiến trình thăng hạng của khách hàng
   */
  async getUserTierInfo(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const currentTier = user.membershipTier || MembershipTier.MEMBER;
    const rollingSpend = user.rolling12MonthSpend || (await this.calculateRolling12MonthSpend(userId));
    const currentBenefits = TIER_CONFIG[currentTier];

    // Tính mốc tiếp theo để thăng hạng
    let nextTier: MembershipTier | null = null;
    let spendNeededForNextTier = 0;

    if (currentTier === MembershipTier.MEMBER) {
      nextTier = MembershipTier.SILVER;
      spendNeededForNextTier = Math.max(0, TIER_CONFIG[MembershipTier.SILVER].minSpend - rollingSpend);
    } else if (currentTier === MembershipTier.SILVER) {
      nextTier = MembershipTier.GOLD;
      spendNeededForNextTier = Math.max(0, TIER_CONFIG[MembershipTier.GOLD].minSpend - rollingSpend);
    } else if (currentTier === MembershipTier.GOLD) {
      nextTier = MembershipTier.PLATINUM;
      spendNeededForNextTier = Math.max(0, TIER_CONFIG[MembershipTier.PLATINUM].minSpend - rollingSpend);
    }

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      currentTier,
      tierName: currentBenefits.name,
      rolling12MonthSpend: rollingSpend,
      loyaltyPoints: user.loyaltyPoints || 0,
      currentBenefits,
      nextTier,
      spendNeededForNextTier,
      tierUpgradedAt: user.tierUpgradedAt,
      tierExpiresAt: user.tierExpiresAt,
    };
  }
}
