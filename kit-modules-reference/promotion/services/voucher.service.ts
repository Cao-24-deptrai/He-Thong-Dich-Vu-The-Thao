import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema.js';
import { VoucherUsage, VoucherUsageDocument } from '../schemas/voucher-usage.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherListQueryDto,
  ValidateVoucherDto,
  ValidateVoucherResult,
} from '@sports/contracts';
import {
  VoucherDiscountType,
  VoucherScope,
  PromotionChannel,
} from '@sports/shared';

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    @InjectModel(VoucherUsage.name)
    private readonly voucherUsageModel: Model<VoucherUsageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async createVoucher(dto: CreateVoucherDto): Promise<VoucherDocument> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.voucherModel.findOne({ code });
    if (existing) {
      throw new ConflictException({
        code: 'VOUCHER_CODE_EXISTS',
        message: `Mã voucher "${code}" đã tồn tại trên hệ thống`,
      });
    }

    if (new Date(dto.validFrom) > new Date(dto.validTo)) {
      throw new BadRequestException('Thời hạn bắt đầu không được lớn hơn thời hạn kết thúc');
    }

    const voucher = new this.voucherModel({
      ...dto,
      code,
      usedCount: 0,
      isActive: dto.isActive ?? true,
    });

    return voucher.save();
  }

  async updateVoucher(id: string, dto: UpdateVoucherDto): Promise<VoucherDocument> {
    const voucher = await this.findById(id);

    if (dto.code && dto.code.toUpperCase() !== voucher.code) {
      const code = dto.code.trim().toUpperCase();
      const existing = await this.voucherModel.findOne({ code });
      if (existing) {
        throw new ConflictException({
          code: 'VOUCHER_CODE_EXISTS',
          message: `Mã voucher "${code}" đã tồn tại trên hệ thống`,
        });
      }
      voucher.code = code;
    }

    if (dto.name) voucher.name = dto.name;
    if (dto.description !== undefined) voucher.description = dto.description;
    if (dto.discountType) voucher.discountType = dto.discountType;
    if (dto.discountValue !== undefined) voucher.discountValue = dto.discountValue;
    if (dto.maxDiscountAmount !== undefined) voucher.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.minOrderAmount !== undefined) voucher.minOrderAmount = dto.minOrderAmount;
    if (dto.applicableScopes) voucher.applicableScopes = dto.applicableScopes;
    if (dto.validFrom) voucher.validFrom = new Date(dto.validFrom);
    if (dto.validTo) voucher.validTo = new Date(dto.validTo);
    if (dto.totalUsageLimit !== undefined) voucher.totalUsageLimit = dto.totalUsageLimit;
    if (dto.perCustomerLimit !== undefined) voucher.perCustomerLimit = dto.perCustomerLimit;
    if (dto.channel) voucher.channel = dto.channel;
    if (dto.isActive !== undefined) voucher.isActive = dto.isActive;

    return voucher.save();
  }

  async findById(id: string): Promise<VoucherDocument> {
    const voucher = await this.voucherModel.findById(id);
    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Không tìm thấy voucher',
      });
    }
    return voucher;
  }

  async findByCode(code: string): Promise<VoucherDocument | null> {
    return this.voucherModel.findOne({ code: code.trim().toUpperCase() });
  }

  async findAll(query: VoucherListQueryDto): Promise<{ items: VoucherDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.scope) {
      filter.applicableScopes = { $in: [VoucherScope.ALL, query.scope] };
    }
    if (query.channel) {
      filter.channel = { $in: [PromotionChannel.ALL, query.channel] };
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }
    if (query.search) {
      filter.$or = [
        { code: { $regex: query.search.trim(), $options: 'i' } },
        { name: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.voucherModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.voucherModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * F15.2 Thẩm định & Tính toán giảm giá Voucher (Validate & Calculate Discount):
   * Trả về kết quả thẩm định và số tiền giảm giá chính xác từng đồng VND.
   */
  async validateAndCalculateDiscount(dto: ValidateVoucherDto): Promise<ValidateVoucherResult> {
    const code = dto.code.trim().toUpperCase();
    const voucher = await this.findByCode(code);

    const fail = (reason: string): ValidateVoucherResult => ({
      isValid: false,
      voucherCode: code,
      discountAmount: 0,
      finalAmount: dto.orderAmount,
      reason,
    });

    if (!voucher || !voucher.isActive) {
      return fail('Mã voucher không tồn tại hoặc đã ngừng áp dụng');
    }

    // 1. Kiểm tra thời hạn hiệu lực
    const now = new Date();
    if (now < voucher.validFrom) {
      return fail(`Voucher chưa đến ngày áp dụng (bắt đầu từ ${voucher.validFrom.toLocaleDateString('vi-VN')})`);
    }
    if (now > voucher.validTo) {
      return fail(`Voucher đã hết hạn sử dụng vào ngày ${voucher.validTo.toLocaleDateString('vi-VN')}`);
    }

    // 2. Kiểm tra kênh áp dụng (ONLINE / POS)
    if (
      voucher.channel !== PromotionChannel.ALL &&
      dto.channel !== PromotionChannel.ALL &&
      voucher.channel !== dto.channel
    ) {
      return fail(`Voucher chỉ áp dụng cho kênh ${voucher.channel}`);
    }

    // 3. Kiểm tra phạm vi dịch vụ (COURT, CANTEEN, GYM, RENTAL, GAMING)
    if (
      !voucher.applicableScopes.includes(VoucherScope.ALL) &&
      dto.scope !== VoucherScope.ALL &&
      !voucher.applicableScopes.includes(dto.scope)
    ) {
      return fail(`Voucher không áp dụng cho dịch vụ ${dto.scope}`);
    }

    // 4. Kiểm tra giá trị đơn hàng tối thiểu
    if (dto.orderAmount < voucher.minOrderAmount) {
      return fail(
        `Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')} VND để áp dụng voucher này`,
      );
    }

    // 5. Kiểm tra giới hạn tổng lượt dùng toàn hệ thống
    if (voucher.totalUsageLimit !== undefined && voucher.usedCount >= voucher.totalUsageLimit) {
      return fail('Voucher đã hết lượt sử dụng trên hệ thống');
    }

    // 6. Kiểm tra giới hạn số lần dùng của từng khách hàng
    let customerUserId = dto.customerId;
    if (!customerUserId && dto.customerPhone) {
      const customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
      if (customer) {
        customerUserId = customer._id.toString();
      }
    }

    if (customerUserId) {
      const usedByCustomerCount = await this.voucherUsageModel.countDocuments({
        voucherCode: voucher.code,
        customerId: new Types.ObjectId(customerUserId),
        isRolledBack: false,
      });

      if (usedByCustomerCount >= voucher.perCustomerLimit) {
        return fail(`Bạn đã sử dụng hết lượt cho phép (${voucher.perCustomerLimit} lần) của voucher này`);
      }
    }

    // 7. Tính số tiền giảm giá chính xác
    let discountAmount = 0;
    if (voucher.discountType === VoucherDiscountType.PERCENT) {
      const rawDiscount = Math.round((dto.orderAmount * voucher.discountValue) / 100);
      discountAmount = voucher.maxDiscountAmount
        ? Math.min(voucher.maxDiscountAmount, rawDiscount)
        : rawDiscount;
    } else {
      // FIXED amount
      discountAmount = Math.min(dto.orderAmount, voucher.discountValue);
    }

    discountAmount = Math.max(0, Math.min(dto.orderAmount, discountAmount));
    const finalAmount = dto.orderAmount - discountAmount;

    return {
      isValid: true,
      voucherCode: voucher.code,
      name: voucher.name,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount,
      finalAmount,
    };
  }

  /**
   * F15.3 Tiêu voucher khi đơn thanh toán thành công (SPEC Rule 2):
   * Tăng nguyên tử usedCount và ghi nhận bản ghi VoucherUsage.
   */
  async consumeVoucher(
    code: string,
    customerId: string,
    orderType: string,
    orderId: string,
    discountAmount: number,
  ): Promise<VoucherUsageDocument> {
    const voucher = await this.voucherModel.findOneAndUpdate(
      {
        code: code.trim().toUpperCase(),
        isActive: true,
        $or: [
          { totalUsageLimit: { $exists: false } },
          { $expr: { $lt: ['$usedCount', '$totalUsageLimit'] } },
        ],
      },
      { $inc: { usedCount: 1 } },
      { new: true },
    );

    if (!voucher) {
      throw new BadRequestException({
        code: 'VOUCHER_USAGE_LIMIT_EXCEEDED',
        message: `Voucher "${code}" đã hết lượt sử dụng trên hệ thống`,
      });
    }

    const usage = new this.voucherUsageModel({
      voucherId: voucher._id,
      voucherCode: voucher.code,
      customerId: new Types.ObjectId(customerId),
      orderType,
      orderId,
      discountAmount,
      usedAt: new Date(),
      isRolledBack: false,
    });

    const savedUsage = await usage.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: customerId,
        action: 'CONSUME_VOUCHER',
        targetType: 'voucher',
        targetId: voucher._id.toString(),
        after: {
          code: voucher.code,
          orderType,
          orderId,
          discountAmount,
          newUsedCount: voucher.usedCount,
        },
      });
    }

    this.logger.log(`Consumed voucher ${voucher.code} for order ${orderId}, discount: ${discountAmount} VND`);
    return savedUsage;
  }

  /**
   * F15.3 Hoàn trả lượt dùng voucher khi đơn hàng bị hủy trong hạn (SPEC Rule 2)
   */
  async rollbackVoucherUsage(
    code: string,
    customerId: string,
    orderId: string,
  ): Promise<void> {
    const usage = await this.voucherUsageModel.findOne({
      voucherCode: code.trim().toUpperCase(),
      customerId: new Types.ObjectId(customerId),
      orderId,
      isRolledBack: false,
    });

    if (usage) {
      usage.isRolledBack = true;
      await usage.save();

      await this.voucherModel.updateOne(
        { code: code.trim().toUpperCase() },
        { $inc: { usedCount: -1 } },
      );

      if (this.auditLogService) {
        await this.auditLogService.record({
          actorId: customerId,
          action: 'ROLLBACK_VOUCHER_USAGE',
          targetType: 'voucher',
          targetId: usage.voucherId.toString(),
          after: { code, orderId, rolledBack: true },
        });
      }

      this.logger.log(`Rolled back voucher ${code} usage for order ${orderId}`);
    }
  }
}
