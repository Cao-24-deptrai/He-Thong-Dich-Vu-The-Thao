import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CanteenOrder, CanteenOrderDocument, CanteenOrderItem } from '../schemas/canteen-order.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { InventoryService } from './inventory.service.js';
import { CashierShiftService } from './cashier-shift.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { InvoiceService } from '../../invoice/services/invoice.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreatePosOrderDto,
  CancelPosOrderDto,
  ProfitReport,
} from '@sports/contracts';
import {
  ProductCategory,
  PaymentMethod,
  CanteenOrderStatus,
  WalletCategory,
  PaymentOrderType,
} from '@sports/shared';

@Injectable()
export class CanteenOrderService {
  private readonly logger = new Logger(CanteenOrderService.name);

  constructor(
    @InjectModel(CanteenOrder.name) private readonly orderModel: Model<CanteenOrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly inventoryService: InventoryService,
    private readonly cashierShiftService: CashierShiftService,
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly invoiceService?: InvoiceService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  private generateOrderCode(): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `POS-${todayStr}-${randomHex}`;
  }

  /**
   * F12.2 / F12.3 Tạo đơn hàng bán tại quầy POS:
   * - Bắt buộc thu ngân đang có ca mở
   * - Kiểm tra bất biến: Ví nội bộ CHỈ trừ dòng CANTEEN, tuyệt đối cấm RETAIL
   * - Trừ tồn kho nguyên tử
   * - Ghi nhận doanh số vào ca thu ngân
   * - Tự động phát hành hóa đơn điện tử M08
   */
  async createPosOrder(cashierId: string, dto: CreatePosOrderDto): Promise<CanteenOrderDocument> {
    // 1. Kiểm tra Idempotency replay
    const existing = await this.orderModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent order replay for key: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Kiểm tra ca thu ngân đang mở (SPEC Rule 2)
    const activeShift = await this.cashierShiftService.getActiveShift(cashierId);
    if (!activeShift) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_SHIFT',
        message: 'Thu ngân chưa mở ca làm việc. Vui lòng mở ca trước khi tạo đơn hàng POS',
      });
    }

    // 3. Khách hàng (nếu có SĐT hoặc thanh toán qua Ví nội bộ)
    let customer: UserDocument | null = null;
    if (dto.customerPhone) {
      customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
      if (!customer && dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
        throw new NotFoundException({
          code: 'CUSTOMER_NOT_FOUND',
          message: `Không tìm thấy tài khoản khách hàng với số điện thoại ${dto.customerPhone}`,
        });
      }
    } else if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      throw new BadRequestException({
        code: 'CUSTOMER_PHONE_REQUIRED',
        message: 'Bắt buộc cung cấp số điện thoại khách hàng khi thanh toán bằng ví nội bộ',
      });
    }

    // 4. Kiểm tra sản phẩm và Bất biến Ví nội bộ chỉ áp dụng cho CANTEEN (SPEC Rule 1)
    const orderItems: CanteenOrderItem[] = [];
    let subtotal = 0;
    let totalVat = 0;

    for (const itemInput of dto.items) {
      const product = await this.inventoryService.findById(itemInput.productId);
      if (!product.isActive) {
        throw new BadRequestException({
          code: 'PRODUCT_INACTIVE',
          message: `Sản phẩm "${product.name}" đã ngừng kinh doanh`,
        });
      }

      // BẤT BIẾN: Cấm dùng ví nội bộ cho mặt hàng RETAIL
      if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET && product.category === ProductCategory.RETAIL) {
        throw new BadRequestException({
          code: 'WALLET_PAYMENT_RETAIL_FORBIDDEN',
          message: `Ví nội bộ chỉ được phép thanh toán cho các món ăn uống Canteen, không áp dụng cho sản phẩm bán lẻ (${product.name})`,
        });
      }

      const itemSubtotal = itemInput.quantity * product.price;
      const vatRate = product.vatRate ?? 8;
      const preTax = Math.round(itemSubtotal / (1 + vatRate / 100));
      const vat = itemSubtotal - preTax;

      subtotal += itemSubtotal;
      totalVat += vat;

      orderItems.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: itemInput.quantity,
        unitPrice: product.price,
        costPrice: product.costPrice ?? 0,
        vatRate,
        subtotal: itemSubtotal,
      });
    }

    const discountAmount = Math.min(subtotal, dto.discountAmount ?? 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // 5. Trừ kho nguyên tử (SPEC Rule 3: Chống âm kho)
    const dummyOrderId = new Types.ObjectId();
    await this.inventoryService.deductStockForOrder(
      dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      cashierId,
      dummyOrderId.toString(),
    );

    // 6. Xử lý thanh toán
    let paidAmount = totalAmount;
    let changeAmount = 0;

    if (dto.paymentMethod === PaymentMethod.CASH) {
      const cashGiven = dto.cashGiven ?? totalAmount;
      if (cashGiven < totalAmount) {
        // Rollback stock if payment fails
        await this.inventoryService.restoreStockForCancelledOrder(
          dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          cashierId,
          dummyOrderId.toString(),
        );
        throw new BadRequestException({
          code: 'INSUFFICIENT_CASH_GIVEN',
          message: `Tiền khách đưa (${cashGiven.toLocaleString('vi-VN')} đ) không đủ thanh toán đơn (${totalAmount.toLocaleString('vi-VN')} đ)`,
        });
      }
      paidAmount = cashGiven;
      changeAmount = cashGiven - totalAmount;
    } else if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      if (!this.walletService || !customer) {
        throw new BadRequestException('Hệ thống ví nội bộ không khả dụng hoặc thiếu khách hàng');
      }

      try {
        await this.walletService.pay(
          customer._id.toString(),
          {
            amount: totalAmount,
            category: WalletCategory.CANTEEN,
            refType: 'CANTEEN_ORDER',
            refId: dummyOrderId.toString(),
            idempotencyKey: `WAL_PAY_${dto.idempotencyKey}`,
            note: `Thanh toán đơn canteen tại quầy POS`,
          },
          cashierId,
        );
      } catch (err: unknown) {
        // Rollback stock if wallet deduction fails
        await this.inventoryService.restoreStockForCancelledOrder(
          dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          cashierId,
          dummyOrderId.toString(),
        );
        throw err;
      }
    }

    // 7. Tạo bản ghi đơn hàng
    const orderCode = this.generateOrderCode();
    const order = new this.orderModel({
      _id: dummyOrderId,
      orderCode,
      shiftId: activeShift._id,
      cashierId: new Types.ObjectId(cashierId),
      customerId: customer?._id,
      customerPhone: dto.customerPhone?.trim(),
      items: orderItems,
      subtotal,
      discountAmount,
      totalAmount,
      vatAmount: totalVat,
      paymentMethod: dto.paymentMethod,
      paidAmount,
      changeAmount,
      status: CanteenOrderStatus.COMPLETED,
      idempotencyKey: dto.idempotencyKey,
    });

    const savedOrder = await order.save();

    // 8. Ghi nhận doanh số vào ca thu ngân
    await this.cashierShiftService.recordOrderSales(activeShift._id.toString(), totalAmount, dto.paymentMethod);

    // 9. Tự động xuất hóa đơn điện tử M08 (F12.3 / SPEC Rule 4)
    if (this.invoiceService) {
      try {
        const preTaxSubtotal = totalAmount - totalVat;
        const invoiceItems = orderItems.map((item) => {
          const preTaxUnit = Math.round(item.unitPrice / (1 + item.vatRate / 100));
          const preTaxAmount = preTaxUnit * item.quantity;
          const vatAmount = item.subtotal - preTaxAmount;
          return {
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: preTaxUnit,
            amount: preTaxAmount,
            vatRate: item.vatRate,
            vatAmount,
          };
        });

        const invoice = await this.invoiceService.createInvoice(
          {
            paymentId: savedOrder._id.toString(),
            orderId: savedOrder._id.toString(),
            orderType: PaymentOrderType.CANTEEN_ORDER,
            items: invoiceItems,
            subtotal: preTaxSubtotal,
            vatAmount: totalVat,
            totalAmount,
            idempotencyKey: `INV_POS_${dto.idempotencyKey}`,
          },
          cashierId,
        );

        if (invoice) {
          savedOrder.invoiceId = invoice._id;
          await savedOrder.save();
        }
      } catch (invoiceErr: unknown) {
        this.logger.warn(`Không thể tự động tạo hóa đơn cho đơn POS ${orderCode}: ${(invoiceErr as Error).message}`);
      }
    }

    return savedOrder;
  }

  async findById(id: string): Promise<CanteenOrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Không tìm thấy đơn hàng POS',
      });
    }
    return order;
  }

  /**
   * F12.4 Hủy đơn & hoàn hàng:
   * Yêu cầu quyền quản lý, hoàn kho nguyên tử, hoàn tiền cho khách, hủy hóa đơn M08
   */
  async cancelOrder(orderId: string, operatorId: string, dto: CancelPosOrderDto): Promise<CanteenOrderDocument> {
    const order = await this.findById(orderId);

    if (order.status === CanteenOrderStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'ORDER_ALREADY_CANCELLED',
        message: 'Đơn hàng này đã được hủy trước đó',
      });
    }

    // 1. Hoàn trả tồn kho nguyên tử
    await this.inventoryService.restoreStockForCancelledOrder(
      order.items.map((i) => ({ productId: i.productId.toString(), quantity: i.quantity })),
      operatorId,
      order._id.toString(),
    );

    // 2. Hoàn tiền nếu khách đã thanh toán
    if (order.paymentMethod === PaymentMethod.INTERNAL_WALLET && order.customerId && this.walletService) {
      await this.walletService.refund(
        order.customerId.toString(),
        order.totalAmount,
        'CANTEEN_ORDER',
        order.orderCode,
        `REF_${order.idempotencyKey}`,
        `Hoàn tiền do hủy đơn POS ${order.orderCode}: ${dto.reason}`,
        operatorId,
      );
    } else if (order.paymentMethod === PaymentMethod.CASH) {
      // Giảm trừ doanh thu tiền mặt ca thu ngân
      await this.cashierShiftService.recordOrderRefund(order.shiftId.toString(), order.totalAmount, PaymentMethod.CASH);
    }


    // 3. Hủy hóa đơn điện tử nếu đã xuất (SPEC Rule 5)
    if (order.invoiceId && this.invoiceService) {
      try {
        await this.invoiceService.cancelInvoice(
          order.invoiceId.toString(),
          `Hủy đơn hàng POS ${order.orderCode}: ${dto.reason}`,
          operatorId,
        );
      } catch (invoiceErr: unknown) {
        this.logger.warn(`Không thể hủy hóa đơn điện tử ${order.invoiceId}: ${(invoiceErr as Error).message}`);
      }
    }

    // 4. Cập nhật trạng thái đơn
    order.status = CanteenOrderStatus.CANCELLED;
    order.cancelReason = dto.reason;
    order.cancelledBy = new Types.ObjectId(operatorId);
    order.cancelledAt = new Date();
    await order.save();

    // 5. Ghi nhật ký AuditLog
    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: operatorId,
        action: 'CANCEL_POS_ORDER',
        targetType: 'canteen_order',
        targetId: order._id.toString(),
        after: { orderCode: order.orderCode, reason: dto.reason, totalAmount: order.totalAmount },
      });
    }

    return order;
  }

  /**
   * F12.9 Báo cáo doanh thu và lãi gộp (Profit Report)
   */
  async getProfitReport(fromDate?: Date, toDate?: Date): Promise<ProfitReport> {
    const filter: Record<string, unknown> = {
      status: CanteenOrderStatus.COMPLETED,
    };

    if (fromDate || toDate) {
      const createdAt: Record<string, Date> = {};
      if (fromDate) createdAt.$gte = fromDate;
      if (toDate) createdAt.$lte = toDate;
      filter.createdAt = createdAt;
    }

    const orders = await this.orderModel.find(filter).exec();

    let totalSales = 0;
    let totalCost = 0;

    for (const order of orders) {
      totalSales += order.totalAmount;
      for (const item of order.items) {
        totalCost += item.quantity * (item.costPrice ?? 0);
      }
    }

    const grossProfit = totalSales - totalCost;
    const profitMarginPercent = totalSales > 0 ? Math.round((grossProfit / totalSales) * 10000) / 100 : 0;

    return {
      totalSales,
      totalCost,
      grossProfit,
      profitMarginPercent,
      orderCount: orders.length,
    };
  }
}
