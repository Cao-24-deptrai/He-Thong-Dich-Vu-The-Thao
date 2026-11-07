import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RentalTicket, RentalTicketDocument, RentalTicketItem } from '../schemas/rental-ticket.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { EquipmentService } from './equipment.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateRentalTicketDto,
  ReturnRentalTicketDto,
  RentalUsageReport,
} from '@sports/contracts';
import {
  RentalPricingType,
  RentalTicketStatus,
  RentalItemCondition,
  PaymentMethod,
  WalletCategory,
} from '@sports/shared';

@Injectable()
export class RentalService {
  private readonly logger = new Logger(RentalService.name);

  constructor(
    @InjectModel(RentalTicket.name) private readonly ticketModel: Model<RentalTicketDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly equipmentService: EquipmentService,
    private readonly cashierShiftService: CashierShiftService,
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  private generateTicketCode(): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RNT-${todayStr}-${randomHex}`;
  }

  /**
   * F13.3 Tạo phiếu thuê dụng cụ tại quầy POS:
   * - Bắt buộc thu ngân đang mở ca
   * - Được phép dùng Ví nội bộ (WalletCategory.RENTAL) theo SPEC
   * - Trừ số lượng khả dụng nguyên tử
   * - Ghi nhận doanh số tiền thuê + tiền cọc vào ca
   */
  async createRentalTicket(cashierId: string, dto: CreateRentalTicketDto): Promise<RentalTicketDocument> {
    // 1. Kiểm tra Idempotency replay
    const existing = await this.ticketModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent rental replay for key: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Kiểm tra ca thu ngân đang mở
    const activeShift = await this.cashierShiftService.getActiveShift(cashierId);
    if (!activeShift) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_SHIFT',
        message: 'Thu ngân chưa mở ca làm việc. Vui lòng mở ca trước khi tạo phiếu thuê',
      });
    }

    // 3. Khách hàng
    let customer: UserDocument | null = null;
    if (dto.customerPhone) {
      customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
      if (!customer && dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
        throw new NotFoundException({
          code: 'CUSTOMER_NOT_FOUND',
          message: `Không tìm thấy tài khoản khách hàng với số điện thoại ${dto.customerPhone}`,
        });
      }
    }

    // 4. Tính toán tiền thuê và tiền cọc
    const ticketItems: RentalTicketItem[] = [];
    let totalRentalAmount = 0;
    let totalDepositAmount = 0;

    const rentHours = Math.max(1, dto.rentHours || 1);

    for (const itemInput of dto.items) {
      const equipment = await this.equipmentService.findById(itemInput.equipmentId);
      if (!equipment.isActive) {
        throw new BadRequestException({
          code: 'EQUIPMENT_INACTIVE',
          message: `Dụng cụ "${equipment.name}" đã ngừng cho thuê`,
        });
      }

      let unitPrice = equipment.price;
      if (equipment.pricingType === RentalPricingType.HOURLY) {
        unitPrice = equipment.price * rentHours;
      }

      const depositPerUnit = equipment.depositAmount || 0;
      const subtotalPrice = unitPrice * itemInput.quantity;
      const subtotalDeposit = depositPerUnit * itemInput.quantity;

      totalRentalAmount += subtotalPrice;
      totalDepositAmount += subtotalDeposit;

      ticketItems.push({
        equipmentId: equipment._id,
        code: equipment.code,
        name: equipment.name,
        quantity: itemInput.quantity,
        unitPrice,
        depositPerUnit,
        pricingType: equipment.pricingType,
        subtotalPrice,
        subtotalDeposit,
      });
    }

    const totalPayAmount = totalRentalAmount + totalDepositAmount;

    // 5. Trừ số lượng khả dụng nguyên tử (SPEC Rule: Chống vượt số lượng khả dụng)
    await this.equipmentService.reserveEquipments(
      dto.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
    );

    const dummyTicketId = new Types.ObjectId();

    // 6. Xử lý thanh toán (Ví nội bộ, Tiền mặt, VietQR)
    if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      if (!this.walletService || !customer) {
        await this.equipmentService.rollbackReservation(
          dto.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
        );
        throw new BadRequestException('Hệ thống ví nội bộ không khả dụng hoặc thiếu tài khoản khách hàng');
      }

      try {
        await this.walletService.pay(
          customer._id.toString(),
          {
            amount: totalPayAmount,
            category: WalletCategory.RENTAL,
            refType: 'EQUIPMENT_RENTAL',
            refId: dummyTicketId.toString(),
            idempotencyKey: `WAL_RENT_${dto.idempotencyKey}`,
            note: 'Thanh toán thuê dụng cụ thể thao',
          },
          cashierId,
        );
      } catch (walletErr: unknown) {
        await this.equipmentService.rollbackReservation(
          dto.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })),
        );
        throw walletErr;
      }
    } else {
      // Ghi nhận doanh thu vào ca thu ngân
      await this.cashierShiftService.recordOrderSales(activeShift._id.toString(), totalPayAmount, dto.paymentMethod);
    }

    // 7. Xác định hạn trả (dueAt)
    const rentedAt = new Date();
    const dueAt = new Date(rentedAt.getTime() + rentHours * 3600 * 1000);

    const ticketCode = this.generateTicketCode();
    const ticket = new this.ticketModel({
      _id: dummyTicketId,
      ticketCode,
      shiftId: activeShift._id,
      cashierId: Types.ObjectId.isValid(cashierId) ? new Types.ObjectId(cashierId) : new Types.ObjectId(),
      customerId: customer?._id,
      customerPhone: dto.customerPhone.trim(),
      customerName: dto.customerName || customer?.fullName,
      bookingId: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
      items: ticketItems,
      rentedAt,
      dueAt,
      totalRentalAmount,
      totalDepositAmount,
      totalPenaltyFee: 0,
      refundDepositAmount: 0,
      paymentMethod: dto.paymentMethod,
      status: RentalTicketStatus.RENTING,
      notes: dto.notes,
      idempotencyKey: dto.idempotencyKey,
    });

    return ticket.save();
  }

  async findById(id: string): Promise<RentalTicketDocument> {
    const ticket = await this.ticketModel.findById(id);
    if (!ticket) {
      throw new NotFoundException({
        code: 'TICKET_NOT_FOUND',
        message: 'Không tìm thấy phiếu thuê dụng cụ',
      });
    }
    return ticket;
  }

  /**
   * F13.4 Trả đồ & Quyết toán bồi thường hư hỏng/mất:
   * - Khấu trừ phí hư hỏng/mất vào tiền cọc
   * - Hoàn cọc thừa vào ví/tiền mặt
   * - Món hỏng/mất được tự động cách ly khỏi số lượng khả dụng
   */
  async returnRentalTicket(ticketId: string, cashierId: string, dto: ReturnRentalTicketDto): Promise<RentalTicketDocument> {
    const ticket = await this.findById(ticketId);

    if (ticket.status === RentalTicketStatus.RETURNED || ticket.status === RentalTicketStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'TICKET_ALREADY_RETURNED',
        message: `Phiếu thuê đã ở trạng thái ${ticket.status}`,
      });
    }

    let totalPenaltyFee = 0;
    const releaseItems: { equipmentId: string; quantity: number; condition?: RentalItemCondition }[] = [];

    // Duyệt qua từng món hoàn trả
    for (const returnInput of dto.items) {
      const ticketItem = ticket.items.find(
        (i) => i.equipmentId.toString() === returnInput.equipmentId,
      );

      if (!ticketItem) {
        throw new BadRequestException(`Dụng cụ ID ${returnInput.equipmentId} không có trong phiếu thuê`);
      }

      const equipment = await this.equipmentService.findById(returnInput.equipmentId);

      let itemPenalty = 0;
      if (returnInput.condition === RentalItemCondition.DAMAGED) {
        itemPenalty = (equipment.damageFee || 0) * returnInput.quantity;
      } else if (returnInput.condition === RentalItemCondition.LOST) {
        itemPenalty = (equipment.lostFee || 0) * returnInput.quantity;
      }

      totalPenaltyFee += itemPenalty;
      ticketItem.returnCondition = returnInput.condition;
      ticketItem.penaltyFee = itemPenalty;

      releaseItems.push({
        equipmentId: returnInput.equipmentId,
        quantity: returnInput.quantity,
        condition: returnInput.condition,
      });
    }

    // Giải phóng hoặc cách ly dụng cụ trong kho
    await this.equipmentService.releaseEquipments(releaseItems);

    // Tính tiền hoàn cọc
    const refundDepositAmount = Math.max(0, ticket.totalDepositAmount - totalPenaltyFee);

    // Xử lý hoàn cọc tiền mặt hoặc ví
    if (refundDepositAmount > 0) {
      if (ticket.paymentMethod === PaymentMethod.INTERNAL_WALLET && ticket.customerId && this.walletService) {
        await this.walletService.refund(
          ticket.customerId.toString(),
          refundDepositAmount,
          'EQUIPMENT_RENTAL',
          ticket.ticketCode,
          `REF_RENT_${ticket.idempotencyKey}`,
          `Hoàn tiền cọc phiếu thuê ${ticket.ticketCode}`,
          cashierId,
        );
      } else if (ticket.paymentMethod === PaymentMethod.CASH) {
        // Chi hoàn cọc tiền mặt -> Giảm tiền mặt ca thu ngân
        await this.cashierShiftService.recordOrderRefund(
          ticket.shiftId.toString(),
          refundDepositAmount,
          PaymentMethod.CASH,
        );
      }
    }

    ticket.status = RentalTicketStatus.RETURNED;
    ticket.returnedAt = new Date();
    ticket.totalPenaltyFee = totalPenaltyFee;
    ticket.refundDepositAmount = refundDepositAmount;
    if (dto.notes) {
      ticket.notes = ticket.notes ? `${ticket.notes} | ${dto.notes}` : dto.notes;
    }

    const saved = await ticket.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: cashierId,
        action: 'RETURN_RENTAL_TICKET',
        targetType: 'rental_ticket',
        targetId: ticket._id.toString(),
        after: {
          ticketCode: ticket.ticketCode,
          totalPenaltyFee,
          refundDepositAmount,
        },
      });
    }

    return saved;
  }

  /**
   * F13.5: Cảnh báo dụng cụ chưa trả thuộc ca thu ngân đang mở
   */
  async getUnreturnedRentalsForShift(shiftId: string): Promise<RentalTicketDocument[]> {
    return this.ticketModel
      .find({
        shiftId: new Types.ObjectId(shiftId),
        status: { $in: [RentalTicketStatus.RENTING, RentalTicketStatus.OVERDUE] },
      })
      .exec();
  }

  /**
   * F13.6 Báo cáo hiệu suất thuê và tài sản hỏng/mất
   */
  async getUsageReport(fromDate?: Date, toDate?: Date): Promise<RentalUsageReport> {
    const filter: Record<string, unknown> = {};

    if (fromDate || toDate) {
      const rentedAt: Record<string, Date> = {};
      if (fromDate) rentedAt.$gte = fromDate;
      if (toDate) rentedAt.$lte = toDate;
      filter.rentedAt = rentedAt;
    }

    const tickets = await this.ticketModel.find(filter).exec();

    let totalRevenue = 0;
    let totalDepositCollected = 0;
    let totalDepositRefunded = 0;
    let totalPenaltyCollected = 0;
    let damagedItemCount = 0;
    let lostItemCount = 0;

    for (const ticket of tickets) {
      totalRevenue += ticket.totalRentalAmount;
      totalDepositCollected += ticket.totalDepositAmount;
      totalDepositRefunded += ticket.refundDepositAmount;
      totalPenaltyCollected += ticket.totalPenaltyFee;

      for (const item of ticket.items) {
        if (item.returnCondition === RentalItemCondition.DAMAGED) {
          damagedItemCount += item.quantity;
        } else if (item.returnCondition === RentalItemCondition.LOST) {
          lostItemCount += item.quantity;
        }
      }
    }

    return {
      totalTickets: tickets.length,
      totalRevenue,
      totalDepositCollected,
      totalDepositRefunded,
      totalPenaltyCollected,
      damagedItemCount,
      lostItemCount,
    };
  }
}
