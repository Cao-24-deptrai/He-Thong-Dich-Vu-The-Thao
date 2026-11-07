import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { VoucherUsage, VoucherUsageDocument, VoucherUsageStatus } from './schemas/voucher-usage.schema';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ApplyVoucherDto, ValidateVoucherDto } from './dto/apply-voucher.dto';
import { DiscountType } from '../common/enums';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(VoucherUsage.name) private voucherUsageModel: Model<VoucherUsageDocument>,
  ) {}

  /**
   * Tính toán mức giảm giá dựa trên loại chiết khấu
   */
  calculateDiscount(voucher: Voucher, orderAmount: number): number {
    if (orderAmount <= 0) return 0;

    let discount = 0;
    if (voucher.discountType === DiscountType.PERCENT) {
      discount = Math.round((orderAmount * voucher.discountValue) / 100);
      if (voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
        discount = Math.min(discount, voucher.maxDiscountAmount);
      }
    } else {
      // FIXED
      discount = voucher.discountValue;
    }

    return Math.min(discount, orderAmount);
  }

  /**
   * Tạo voucher mới (Dành cho Admin / Owner)
   */
  async createVoucher(dto: CreateVoucherDto): Promise<VoucherDocument> {
    const existing = await this.voucherModel.findOne({ code: dto.code.trim().toUpperCase() }).exec();
    if (existing) {
      throw new ConflictException(`Mã voucher "${dto.code}" đã tồn tại trên hệ thống`);
    }

    const voucher = new this.voucherModel({
      code: dto.code.trim().toUpperCase(),
      title: dto.title,
      description: dto.description || '',
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderValue: dto.minOrderValue || 0,
      maxDiscountAmount: dto.maxDiscountAmount,
      totalBudget: dto.totalBudget || 0,
      usedBudget: 0,
      usageLimit: dto.usageLimit || 100,
      usedCount: 0,
      perUserLimit: dto.perUserLimit || 1,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      applicableSports: dto.applicableSports || [],
      applicableVenues: (dto.applicableVenues || []).map((id) => new Types.ObjectId(id)),
      applicableCustomerTiers: dto.applicableCustomerTiers || [],
      isActive: true,
    });

    return voucher.save();
  }

  /**
   * Lấy danh sách voucher (có bộ lọc)
   */
  async findAll(onlyActive: boolean = false): Promise<VoucherDocument[]> {
    const query: any = {};
    if (onlyActive) {
      query.isActive = true;
      query.endDate = { $gte: new Date() };
    }
    return this.voucherModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Lấy chi tiết voucher theo mã code
   */
  async findByCode(code: string): Promise<VoucherDocument> {
    const voucher = await this.voucherModel.findOne({ code: code.trim().toUpperCase() }).exec();
    if (!voucher) {
      throw new NotFoundException(`Không tìm thấy mã voucher "${code}"`);
    }
    return voucher;
  }

  /**
   * Kiểm tra tính hợp lệ của voucher trước khi áp dụng
   */
  async validateVoucher(dto: ValidateVoucherDto, userId?: string) {
    const voucher = await this.findByCode(dto.code);

    if (!voucher.isActive) {
      throw new BadRequestException('Mã voucher này hiện đã bị vô hiệu hóa');
    }

    const now = new Date();
    if (now < voucher.startDate) {
      throw new BadRequestException('Chương trình khuyến mãi này chưa bắt đầu');
    }
    if (now > voucher.endDate) {
      throw new BadRequestException('Mã voucher này đã hết thời hạn sử dụng');
    }

    if (dto.orderAmount < voucher.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng cần đạt tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} VND để áp dụng voucher này`,
      );
    }

    // Ràng buộc môn thể thao
    if (
      dto.sportType &&
      voucher.applicableSports &&
      voucher.applicableSports.length > 0 &&
      !voucher.applicableSports.includes(dto.sportType.toUpperCase())
    ) {
      throw new BadRequestException(
        `Voucher chỉ áp dụng cho các môn: ${voucher.applicableSports.join(', ')}`,
      );
    }

    // Kiểm tra số lượt toàn hệ thống
    if (voucher.usedCount >= voucher.usageLimit) {
      throw new ConflictException('Mã voucher đã hết số lượt sử dụng toàn hệ thống');
    }

    const discountAmount = this.calculateDiscount(voucher, dto.orderAmount);

    // Kiểm tra ngân sách phát hành (BR-13)
    if (voucher.totalBudget > 0 && voucher.usedBudget + discountAmount > voucher.totalBudget) {
      throw new ConflictException('Ngân sách khuyến mãi của mã voucher này đã hết');
    }

    // Kiểm tra số lượt trên mỗi user (BR-15, AC-15, AC-79)
    if (userId) {
      const activeUserUsages = await this.voucherUsageModel.countDocuments({
        voucherId: voucher._id,
        userId: new Types.ObjectId(userId),
        status: { $in: [VoucherUsageStatus.APPLIED, VoucherUsageStatus.COMMITTED] },
      });

      if (activeUserUsages >= voucher.perUserLimit) {
        throw new ConflictException(
          `Bạn đã đạt giới hạn tối đa ${voucher.perUserLimit} lần sử dụng mã khuyến mãi này`,
        );
      }
    }

    return {
      isValid: true,
      voucher,
      discountAmount,
      finalAmount: Math.max(0, dto.orderAmount - discountAmount),
    };
  }

  /**
   * Áp dụng voucher nguyên tử (BR-13, BR-15, AC-13, AC-15, AC-79)
   * Sử dụng MongoDB atomic $inc kết hợp ràng buộc điều kiện truy vấn để chống Race Condition.
   */
  async applyVoucherAtomically(dto: ApplyVoucherDto, userId: string) {
    // 1. Kiểm tra tính hợp lệ cơ bản
    const validation = await this.validateVoucher(
      {
        code: dto.code,
        orderAmount: dto.orderAmount,
        sportType: dto.sportType,
        venueId: dto.venueId,
      },
      userId,
    );

    const { voucher, discountAmount, finalAmount } = validation;

    // 2. Chống Race Condition trên giới hạn lượt của user (AC-15 & AC-79)
    // Đếm số lượng đơn HELD hoặc COMMITTED đang giữ lượt của user
    const userActiveUsages = await this.voucherUsageModel.countDocuments({
      voucherId: voucher._id,
      userId: new Types.ObjectId(userId),
      status: { $in: [VoucherUsageStatus.APPLIED, VoucherUsageStatus.COMMITTED] },
    });

    if (userActiveUsages >= voucher.perUserLimit) {
      throw new ConflictException(
        `Khách hàng đã sử dụng tối đa (${voucher.perUserLimit} lượt) cho voucher này`,
      );
    }

    // 3. Thực thi cập nhật nguyên tử trên Voucher (Atomic Conditional Update, BR-13, AC-13)
    // Chỉ cập nhật $inc khi usedCount < usageLimit và usedBudget + discount <= totalBudget
    const filter: any = {
      _id: voucher._id,
      isActive: true,
      usedCount: { $lt: voucher.usageLimit },
    };

    if (voucher.totalBudget > 0) {
      filter.$expr = {
        $lte: [{ $add: ['$usedBudget', discountAmount] }, '$totalBudget'],
      };
    }

    const updatedVoucher = await this.voucherModel.findOneAndUpdate(
      filter,
      {
        $inc: {
          usedCount: 1,
          usedBudget: discountAmount,
        },
      },
      { new: true },
    );

    if (!updatedVoucher) {
      // Bị tranh chấp và hết ngân sách hoặc hết lượt sử dụng -> ném 409 Conflict (AC-13)
      throw new ConflictException(
        'Không thể áp dụng voucher: Mã đã hết lượt sử dụng hoặc vượt quá ngân sách phát hành',
      );
    }

    // 4. Ghi nhận bản ghi VoucherUsage
    try {
      const usage = await this.voucherUsageModel.create({
        voucherId: voucher._id,
        voucherCode: voucher.code,
        userId: new Types.ObjectId(userId),
        bookingId: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
        orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
        discountAmount,
        originalAmount: dto.orderAmount,
        finalAmount,
        status: VoucherUsageStatus.APPLIED,
        appliedAt: new Date(),
      });

      // 5. Kiểm tra lần thứ hai: Nếu user mở nhiều request đồng thời vượt quá perUserLimit
      const postCheckCount = await this.voucherUsageModel.countDocuments({
        voucherId: voucher._id,
        userId: new Types.ObjectId(userId),
        status: { $in: [VoucherUsageStatus.APPLIED, VoucherUsageStatus.COMMITTED] },
      });

      if (postCheckCount > voucher.perUserLimit) {
        // Rollback ngay lập tức
        await this.voucherUsageModel.findByIdAndUpdate(usage._id, {
          status: VoucherUsageStatus.ROLLED_BACK,
        });
        await this.voucherModel.findByIdAndUpdate(voucher._id, {
          $inc: {
            usedCount: -1,
            usedBudget: -discountAmount,
          },
        });
        throw new ConflictException(
          `Vượt quá giới hạn ${voucher.perUserLimit} lượt sử dụng voucher trên mỗi khách hàng (AC-15/AC-79)`,
        );
      }

      return {
        success: true,
        usageId: usage._id.toString(),
        voucherCode: voucher.code,
        discountAmount,
        originalAmount: dto.orderAmount,
        finalAmount,
      };
    } catch (err) {
      // Nếu có lỗi ghi nhận usage, rollback lại voucher
      if (!(err instanceof ConflictException)) {
        await this.voucherModel.findByIdAndUpdate(voucher._id, {
          $inc: {
            usedCount: -1,
            usedBudget: -discountAmount,
          },
        });
      }
      throw err;
    }
  }

  /**
   * Xác nhận hoàn tất lượt dùng khi đơn thanh toán thành công (COMMITTED)
   */
  async commitVoucherUsage(bookingIdOrUsageId: string) {
    const query: any = {};
    if (Types.ObjectId.isValid(bookingIdOrUsageId)) {
      query.$or = [
        { _id: new Types.ObjectId(bookingIdOrUsageId) },
        { bookingId: new Types.ObjectId(bookingIdOrUsageId) },
      ];
    } else {
      return null;
    }

    return this.voucherUsageModel.findOneAndUpdate(
      { ...query, status: VoucherUsageStatus.APPLIED },
      { status: VoucherUsageStatus.COMMITTED },
      { new: true },
    );
  }

  /**
   * Hoàn lại lượt và ngân sách khi đơn bị hủy / hết hạn giữ chỗ (Rollback)
   */
  async rollbackVoucherUsage(bookingIdOrUsageId: string) {
    const query: any = {};
    if (Types.ObjectId.isValid(bookingIdOrUsageId)) {
      query.$or = [
        { _id: new Types.ObjectId(bookingIdOrUsageId) },
        { bookingId: new Types.ObjectId(bookingIdOrUsageId) },
      ];
    } else {
      return null;
    }

    const usage = await this.voucherUsageModel.findOneAndUpdate(
      { ...query, status: { $in: [VoucherUsageStatus.APPLIED, VoucherUsageStatus.COMMITTED] } },
      { status: VoucherUsageStatus.ROLLED_BACK },
      { new: true },
    );

    if (usage) {
      await this.voucherModel.findByIdAndUpdate(usage.voucherId, {
        $inc: {
          usedCount: -1,
          usedBudget: -usage.discountAmount,
        },
      });
    }

    return usage;
  }
}
