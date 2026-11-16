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
import { ComboPackage, ComboPackageDocument } from '../schemas/combo-package.schema.js';
import { UserPackage, UserPackageDocument } from '../schemas/user-package.schema.js';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema.js';
import { VoucherUsage, VoucherUsageDocument } from '../schemas/voucher-usage.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateComboPackageDto,
  UpdateComboPackageDto,
  ComboPackageListQueryDto,
  PurchaseComboDto,
  DeductPackageItemDto,
  PromotionReport,
} from '@sports/contracts';
import {
  ComboItemType,
  UserPackageStatus,
  PaymentMethod,
  WalletCategory,
} from '@sports/shared';

@Injectable()
export class ComboPackageService {
  private readonly logger = new Logger(ComboPackageService.name);

  constructor(
    @InjectModel(ComboPackage.name)
    private readonly comboModel: Model<ComboPackageDocument>,
    @InjectModel(UserPackage.name)
    private readonly userPackageModel: Model<UserPackageDocument>,
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    @InjectModel(VoucherUsage.name)
    private readonly voucherUsageModel: Model<VoucherUsageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly cashierShiftService?: CashierShiftService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  private generatePackageCode(): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PKG-${todayStr}-${randomHex}`;
  }

  async createComboPackage(dto: CreateComboPackageDto): Promise<ComboPackageDocument> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.comboModel.findOne({ code });
    if (existing) {
      throw new ConflictException({
        code: 'COMBO_CODE_EXISTS',
        message: `Mã gói combo "${code}" đã tồn tại trên hệ thống`,
      });
    }

    const combo = new this.comboModel({
      ...dto,
      code,
      isActive: dto.isActive ?? true,
    });

    return combo.save();
  }

  async updateComboPackage(id: string, dto: UpdateComboPackageDto): Promise<ComboPackageDocument> {
    const combo = await this.findById(id);

    if (dto.code && dto.code.toUpperCase() !== combo.code) {
      const code = dto.code.trim().toUpperCase();
      const existing = await this.comboModel.findOne({ code });
      if (existing) {
        throw new ConflictException({
          code: 'COMBO_CODE_EXISTS',
          message: `Mã gói combo "${code}" đã tồn tại trên hệ thống`,
        });
      }
      combo.code = code;
    }

    if (dto.name) combo.name = dto.name;
    if (dto.description !== undefined) combo.description = dto.description;
    if (dto.price !== undefined) combo.price = dto.price;
    if (dto.items) combo.items = dto.items;
    if (dto.validDays !== undefined) combo.validDays = dto.validDays;
    if (dto.channel) combo.channel = dto.channel;
    if (dto.isActive !== undefined) combo.isActive = dto.isActive;

    return combo.save();
  }

  async findById(id: string): Promise<ComboPackageDocument> {
    const combo = await this.comboModel.findById(id);
    if (!combo) {
      throw new NotFoundException({
        code: 'COMBO_NOT_FOUND',
        message: 'Không tìm thấy gói combo',
      });
    }
    return combo;
  }

  async findByCode(code: string): Promise<ComboPackageDocument | null> {
    return this.comboModel.findOne({ code: code.trim().toUpperCase() });
  }

  async findAll(query: ComboPackageListQueryDto): Promise<{ items: ComboPackageDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.channel) {
      filter.channel = query.channel;
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
      this.comboModel.find(filter).sort({ price: 1 }).skip(skip).limit(limit).exec(),
      this.comboModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * F15.5 Mua gói combo:
   * - Bất biến SPEC Rule 3: Gói combo chứa thành phần ngoài danh mục ví (Gym/PT) cấm thanh toán bằng ví nội bộ
   * - Khởi tạo UserPackage với số dư chi tiết theo từng thành phần
   */
  async purchaseComboPackage(actorId: string, dto: PurchaseComboDto): Promise<UserPackageDocument> {
    // 1. Kiểm tra Idempotency Replay
    const existing = await this.userPackageModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent combo purchase replay: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Tìm combo package
    const combo = await this.findById(dto.comboPackageId);
    if (!combo.isActive) {
      throw new BadRequestException({
        code: 'COMBO_INACTIVE',
        message: `Gói combo "${combo.name}" hiện đã ngừng mở bán`,
      });
    }

    // 3. Tìm khách hàng
    const customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Không tìm thấy tài khoản với số điện thoại ${dto.customerPhone}`,
      });
    }

    // 4. Bất biến SPEC Rule 3: Cấm thanh toán ví cho Combo có thành phần ngoài danh mục ví
    const hasNonWalletItem = combo.items.some(
      (item) => item.itemType === ComboItemType.GYM_DAYS || item.itemType === ComboItemType.PT_SESSIONS,
    );

    if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET && hasNonWalletItem) {
      throw new BadRequestException({
        code: 'WALLET_PAYMENT_FORBIDDEN_FOR_COMBO',
        message: 'Gói combo có chứa dịch vụ ngoài danh mục ví (Gym/PT), không được thanh toán bằng ví nội bộ. Vui lòng thanh toán bằng Tiền mặt hoặc VietQR',
      });
    }

    const dummyPackageId = new Types.ObjectId();

    // 5. Xử lý thanh toán
    if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      if (!this.walletService) {
        throw new BadRequestException('Hệ thống ví nội bộ không khả dụng');
      }

      await this.walletService.pay(
        customer._id.toString(),
        {
          amount: combo.price,
          category: WalletCategory.COURT,
          refType: 'COMBO_PACKAGE',
          refId: dummyPackageId.toString(),
          idempotencyKey: `WAL_COMBO_${dto.idempotencyKey}`,
          note: `Mua gói combo ${combo.name}`,
        },
        actorId,
      );
    } else if (dto.paymentMethod === PaymentMethod.CASH && this.cashierShiftService) {
      const activeShift = await this.cashierShiftService.getActiveShift(actorId);
      if (activeShift) {
        await this.cashierShiftService.recordOrderSales(
          activeShift._id.toString(),
          combo.price,
          PaymentMethod.CASH,
        );
      }
    }

    // 6. Khởi tạo số dư từng thành phần và thời hạn gói
    const now = new Date();
    const expiresAt = new Date(now.getTime() + combo.validDays * 24 * 3600 * 1000);

    const remainingItems = combo.items.map((i) => ({
      itemType: i.itemType,
      remainingQuantity: i.quantity,
      totalQuantity: i.quantity,
      unit: i.unit,
      courtType: i.courtType,
    }));

    const packageCode = this.generatePackageCode();
    const userPackage = new this.userPackageModel({
      _id: dummyPackageId,
      packageCode,
      comboPackageId: combo._id,
      comboName: combo.name,
      customerId: customer._id,
      customerPhone: customer.phone,
      customerName: dto.customerName || customer.fullName,
      pricePaid: combo.price,
      paymentMethod: dto.paymentMethod,
      purchasedAt: now,
      expiresAt,
      remainingItems,
      status: UserPackageStatus.ACTIVE,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await userPackage.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'PURCHASE_COMBO_PACKAGE',
        targetType: 'user_package',
        targetId: saved._id.toString(),
        after: {
          packageCode: saved.packageCode,
          comboName: combo.name,
          pricePaid: combo.price,
          paymentMethod: dto.paymentMethod,
          customerId: customer._id.toString(),
        },
      });
    }

    this.logger.log(`Customer ${customer.phone} purchased combo ${combo.code} (${packageCode}) for ${combo.price} VND`);
    return saved;
  }

  /**
   * F15.5 Khấu trừ thành phần trong gói (Deduct Package Item):
   * Sử dụng khi khách hàng đặt sân hoặc điểm danh thay vì trả tiền
   */
  async deductPackageItem(dto: DeductPackageItemDto): Promise<UserPackageDocument> {
    const userPackage = await this.userPackageModel.findById(dto.userPackageId);
    if (!userPackage) {
      throw new NotFoundException({
        code: 'PACKAGE_NOT_FOUND',
        message: 'Không tìm thấy gói dịch vụ của người dùng',
      });
    }

    const now = new Date();
    if (now > userPackage.expiresAt) {
      userPackage.status = UserPackageStatus.EXPIRED;
      await userPackage.save();
      throw new BadRequestException({
        code: 'PACKAGE_EXPIRED',
        message: `Gói dịch vụ "${userPackage.comboName}" đã hết hạn sử dụng vào ngày ${userPackage.expiresAt.toLocaleDateString('vi-VN')}`,
      });
    }

    if (userPackage.status !== UserPackageStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'PACKAGE_INACTIVE',
        message: `Gói dịch vụ đang ở trạng thái ${userPackage.status}, không thể khấu trừ`,
      });
    }

    // Tìm thành phần tương ứng trong gói
    const targetItem = userPackage.remainingItems.find((item) => {
      if (item.itemType !== dto.itemType) return false;
      if (dto.courtType && item.courtType && item.courtType !== dto.courtType) return false;
      return true;
    });

    if (!targetItem || targetItem.remainingQuantity < dto.quantity) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_PACKAGE_BALANCE',
        message: `Số dư thành phần "${dto.itemType}" trong gói không đủ (yêu cầu: ${dto.quantity}, còn lại: ${targetItem?.remainingQuantity ?? 0})`,
      });
    }

    targetItem.remainingQuantity -= dto.quantity;

    // Kiểm tra nếu tất cả thành phần đều đã dùng hết -> chuyển trạng thái DEPLETED
    const isAllDepleted = userPackage.remainingItems.every((item) => item.remainingQuantity === 0);
    if (isAllDepleted) {
      userPackage.status = UserPackageStatus.DEPLETED;
    }

    const saved = await userPackage.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: userPackage.customerId.toString(),
        action: 'DEDUCT_PACKAGE_ITEM',
        targetType: 'user_package',
        targetId: userPackage._id.toString(),
        after: {
          itemType: dto.itemType,
          deductedQuantity: dto.quantity,
          refType: dto.refType,
          refId: dto.refId,
          remainingQuantity: targetItem.remainingQuantity,
        },
      });
    }

    this.logger.log(`Deducted ${dto.quantity} ${dto.itemType} from package ${userPackage.packageCode}`);
    return saved;
  }

  /**
   * Danh sách gói dịch vụ khách hàng đang sở hữu
   */
  async findMyPackages(customerId: string): Promise<UserPackageDocument[]> {
    return this.userPackageModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ purchasedAt: -1 })
      .exec();
  }

  /**
   * Báo cáo khuyến mãi tổng hợp
   */
  async getPromotionReport(fromDate?: Date, toDate?: Date): Promise<PromotionReport> {
    const filter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      const dateRange: Record<string, Date> = {};
      if (fromDate) dateRange.$gte = fromDate;
      if (toDate) dateRange.$lte = toDate;
      filter.usedAt = dateRange;
    }

    const [totalVouchers, activeVouchers, usages, userPackages] = await Promise.all([
      this.voucherModel.countDocuments().exec(),
      this.voucherModel.countDocuments({ isActive: true }).exec(),
      this.voucherUsageModel.find({ isRolledBack: false, ...filter }).exec(),
      this.userPackageModel.find().exec(),
    ]);

    let totalDiscountAmount = 0;
    for (const usage of usages) {
      totalDiscountAmount += usage.discountAmount || 0;
    }

    let totalComboRevenue = 0;
    for (const pkg of userPackages) {
      totalComboRevenue += pkg.pricePaid || 0;
    }

    return {
      totalVouchers,
      activeVouchers,
      totalVoucherUsages: usages.length,
      totalDiscountAmount,
      totalCombosSold: userPackages.length,
      totalComboRevenue,
    };
  }
}
