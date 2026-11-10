import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CashierShift, CashierShiftDocument } from '../schemas/cashier-shift.schema.js';
import { OpenCashierShiftDto, CloseCashierShiftDto } from '@sports/contracts';
import { CashierShiftStatus, PaymentMethod } from '@sports/shared';

@Injectable()
export class CashierShiftService {
  constructor(
    @InjectModel(CashierShift.name) private readonly shiftModel: Model<CashierShiftDocument>,
  ) {}

  /**
   * F12.5 Mở ca thu ngân:
   * Mỗi thu ngân chỉ có tối đa 1 ca đang mở (status: OPEN)
   */
  async openShift(cashierId: string, cashierName: string, dto: OpenCashierShiftDto): Promise<CashierShiftDocument> {
    const existing = await this.shiftModel.findOne({
      counterId: dto.counterId,
      status: CashierShiftStatus.OPEN,
    });

    if (existing) {
      throw new ConflictException({
        code: 'SHIFT_ALREADY_OPEN',
        message: `Thu ngân ${cashierName} đang có ca làm việc ${existing.shiftCode} chưa chốt`,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const shiftCode = `SHF-${todayStr}-${randomHex}`;

    const shift = new this.shiftModel({
      shiftCode,
      cashierId: new Types.ObjectId(cashierId),
      counterId: dto.counterId,
      cashierName,
      openedAt: new Date(),
      openingCash: dto.openingCash,
      status: CashierShiftStatus.OPEN,
      totalOrders: 0,
      totalCashSales: 0,
      totalQrSales: 0,
      totalWalletSales: 0,
      totalSales: 0,
      notes: dto.notes,
    });

    try {
      return await shift.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException({ code: 'COUNTER_ALREADY_OPEN', message: 'Quầy này đã có ca đang mở' });
      }
      throw error;
    }
  }

  async getActiveShift(cashierId: string): Promise<CashierShiftDocument | null> {
    return this.shiftModel.findOne({
      cashierId: new Types.ObjectId(cashierId),
      status: CashierShiftStatus.OPEN,
    });
  }

  async getShiftById(id: string): Promise<CashierShiftDocument> {
    const shift = await this.shiftModel.findById(id);
    if (!shift) {
      throw new NotFoundException({
        code: 'SHIFT_NOT_FOUND',
        message: 'Không tìm thấy ca làm việc',
      });
    }
    return shift;
  }

  /**
   * Ghi nhận tích lũy doanh số đơn hàng vào ca
   */
  async recordOrderSales(shiftId: string, amount: number, paymentMethod: PaymentMethod): Promise<void> {
    const incObj: Record<string, number> = {
      totalOrders: 1,
      totalSales: amount,
    };

    if (paymentMethod === PaymentMethod.CASH) {
      incObj.totalCashSales = amount;
    } else if (paymentMethod === PaymentMethod.VIETQR) {
      incObj.totalQrSales = amount;
    } else if (paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      incObj.totalWalletSales = amount;
    }

    await this.shiftModel.updateOne(
      { _id: new Types.ObjectId(shiftId) },
      { $inc: incObj },
    );
  }

  /**
   * Giảm trừ doanh số khi hủy đơn hoàn tiền
   */
  async recordOrderRefund(shiftId: string, amount: number, paymentMethod: PaymentMethod): Promise<void> {
    const incObj: Record<string, number> = {
      totalSales: -amount,
    };

    if (paymentMethod === PaymentMethod.CASH) {
      incObj.totalCashSales = -amount;
    } else if (paymentMethod === PaymentMethod.VIETQR) {
      incObj.totalQrSales = -amount;
    } else if (paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      incObj.totalWalletSales = -amount;
    }

    await this.shiftModel.updateOne(
      { _id: new Types.ObjectId(shiftId) },
      { $inc: incObj },
    );
  }

  /**
   * F12.5 Chốt ca thu ngân:
   * Tính closingCashExpected = openingCash + totalCashSales
   * difference = closingCashActual - closingCashExpected (dương: thừa tiền, âm: thiếu tiền)
   */
  async closeShift(shiftId: string, cashierId: string, dto: CloseCashierShiftDto): Promise<CashierShiftDocument> {
    const shift = await this.getShiftById(shiftId);

    if (shift.status !== CashierShiftStatus.OPEN) {
      throw new BadRequestException({
        code: 'SHIFT_NOT_OPEN',
        message: 'Ca làm việc này đã được chốt trước đó',
      });
    }

    if (shift.cashierId.toString() !== cashierId) {
      throw new ConflictException('Chỉ thu ngân mở ca mới được tự chốt ca');
    }

    const expectedCash = shift.openingCash + shift.totalCashSales;
    const difference = dto.closingCashActual - expectedCash;

    shift.status = CashierShiftStatus.CLOSED;
    shift.closedAt = new Date();
    shift.closingCashExpected = expectedCash;
    shift.closingCashActual = dto.closingCashActual;
    shift.difference = difference;
    if (dto.notes) {
      shift.notes = shift.notes ? `${shift.notes} | ${dto.notes}` : dto.notes;
    }

    return shift.save();
  }

  /** BR-44a: managers use the restricted admin route to close an absent cashier's shift. */
  async forceCloseShift(shiftId: string, managerId: string, dto: CloseCashierShiftDto): Promise<CashierShiftDocument> {
    const shift = await this.getShiftById(shiftId);
    if (shift.status !== CashierShiftStatus.OPEN) {
      throw new ConflictException('Ca không còn mở');
    }
    const expected = shift.openingCash + shift.totalCashSales;
    shift.status = CashierShiftStatus.CLOSED;
    shift.closedAt = new Date();
    shift.closingCashExpected = expected;
    shift.closingCashActual = dto.closingCashActual;
    shift.difference = dto.closingCashActual - expected;
    shift.notes = [shift.notes, `FORCE_CLOSE manager=${managerId}`, dto.notes].filter(Boolean).join(' | ');
    return shift.save();
  }
}
