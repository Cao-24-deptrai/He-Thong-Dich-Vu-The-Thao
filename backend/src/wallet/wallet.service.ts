import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WalletLedger, WalletLedgerDocument } from '../payments/schemas/wallet-ledger.schema';
import { LedgerType, MembershipTier } from '../common/enums';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(WalletLedger.name) private walletLedgerModel: Model<WalletLedgerDocument>,
  ) {}

  private async resolveUser(phone?: string, userId?: string): Promise<UserDocument> {
    let user: UserDocument | null = null;
    if (phone) {
      user = await this.userModel.findOne({ phone }).exec();
    } else if (userId && Types.ObjectId.isValid(userId)) {
      user = await this.userModel.findById(userId).exec();
    }
    if (!user) {
      // Tìm tài khoản mặc định
      user = await this.userModel.findOne({ phone: '0900000005' }).exec();
      if (!user) {
        user = await this.userModel.findOne().exec();
      }
    }
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản hội viên');
    }
    return user;
  }

  async getBalance(phone?: string, userId?: string): Promise<any> {
    const user = await this.resolveUser(phone, userId);
    return {
      userId: user._id,
      phone: user.phone,
      fullName: user.fullName,
      walletBalance: user.walletBalance || 0,
      heldBalance: user.heldBalance || 0,
      loyaltyPoints: user.loyaltyPoints || 0,
      membershipTier: user.membershipTier || MembershipTier.GOLD,
    };
  }

  async topup(dto: any): Promise<any> {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền nạp phải lớn hơn 0');
    }

    const user = await this.resolveUser(dto.phone, dto.userId);
    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    user.walletBalance = balanceAfter;
    await user.save();

    const ledger = new this.walletLedgerModel({
      userId: user._id,
      type: LedgerType.TOPUP,
      amount,
      balanceBefore,
      balanceAfter,
      referenceId: dto.referenceId || `TOPUP_${Date.now()}`,
      paymentMethod: dto.paymentMethod || 'VIETQR',
      description: dto.description || `Nạp tiền vào ví Phanta Pay qua ${dto.paymentMethod || 'VietQR'}`,
      createdAt: new Date(),
    });
    await ledger.save();

    this.logger.log(`💳 Nạp tiền ví thành công: ${user.fullName} (${user.phone}) +${amount}đ -> Số dư: ${balanceAfter}đ`);

    return {
      userId: user._id,
      phone: user.phone,
      fullName: user.fullName,
      amount,
      balanceBefore,
      walletBalance: balanceAfter,
      ledgerId: ledger._id,
      message: 'Nạp tiền vào ví Phanta Pay thành công',
    };
  }

  async pay(dto: any): Promise<any> {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }

    const user = await this.resolveUser(dto.phone, dto.userId);
    const balanceBefore = user.walletBalance || 0;

    if (balanceBefore < amount) {
      throw new BadRequestException(`Số dư ví không đủ (Hiện có ${balanceBefore.toLocaleString('vi-VN')} đ, cần ${amount.toLocaleString('vi-VN')} đ)`);
    }

    const balanceAfter = balanceBefore - amount;
    user.walletBalance = balanceAfter;
    // Tặng điểm thưởng tích lũy (5% giá trị thanh toán)
    const pointsAwarded = Math.round(amount * 0.05);
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsAwarded;
    await user.save();

    const ledger = new this.walletLedgerModel({
      userId: user._id,
      type: LedgerType.PAYMENT,
      amount,
      balanceBefore,
      balanceAfter,
      referenceId: dto.referenceId || `PAY_${Date.now()}`,
      paymentMethod: 'WALLET',
      description: dto.description || `Thanh toán dịch vụ ${dto.serviceType || 'thể thao'}`,
      createdAt: new Date(),
    });
    await ledger.save();

    this.logger.log(`💸 Thanh toán ví thành công: ${user.fullName} -${amount}đ -> Còn ${balanceAfter}đ (+${pointsAwarded} điểm)`);

    return {
      userId: user._id,
      phone: user.phone,
      amount,
      balanceBefore,
      walletBalance: balanceAfter,
      pointsAwarded,
      loyaltyPoints: user.loyaltyPoints,
      ledgerId: ledger._id,
      message: 'Thanh toán dịch vụ bằng Ví Phanta Pay thành công',
    };
  }

  async refund(dto: any): Promise<any> {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền hoàn cọc/hủy sân phải lớn hơn 0');
    }

    const user = await this.resolveUser(dto.phone, dto.userId);
    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    user.walletBalance = balanceAfter;
    await user.save();

    const ledger = new this.walletLedgerModel({
      userId: user._id,
      type: LedgerType.REFUND,
      amount,
      balanceBefore,
      balanceAfter,
      referenceId: dto.referenceId || `REFUND_${Date.now()}`,
      paymentMethod: 'WALLET',
      description: `Hoàn tiền siêu tốc 3 giây: ${dto.reason || 'Hủy lịch đặt sân hợp lệ'}`,
      createdAt: new Date(),
    });
    await ledger.save();

    this.logger.log(`⚡ Hoàn tiền 3s vào ví thành công: ${user.fullName} +${amount}đ -> Số dư: ${balanceAfter}đ`);

    return {
      userId: user._id,
      phone: user.phone,
      amount,
      balanceBefore,
      walletBalance: balanceAfter,
      ledgerId: ledger._id,
      refundSpeed: '< 3s',
      message: 'Hoàn tiền tức thì vào ví Phanta Pay thành công trong 3 giây',
    };
  }

  async getHistory(phone?: string, userId?: string, page = 1, limit = 10): Promise<any> {
    const user = await this.resolveUser(phone, userId);
    const skip = (Math.max(1, page) - 1) * limit;

    const [total, items] = await Promise.all([
      this.walletLedgerModel.countDocuments({ userId: user._id }),
      this.walletLedgerModel
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const formatted = items.map((item, idx) => ({
      stt: skip + idx + 1,
      id: item._id,
      type: item.type,
      amount: item.amount,
      balanceBefore: item.balanceBefore,
      balanceAfter: item.balanceAfter,
      referenceId: item.referenceId,
      paymentMethod: item.paymentMethod,
      description: item.description,
      createdAt: item.createdAt,
    }));

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
      items: formatted,
    };
  }
}
