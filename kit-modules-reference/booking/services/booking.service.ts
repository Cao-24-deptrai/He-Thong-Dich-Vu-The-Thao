import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import * as crypto from 'node:crypto';
import { Booking, BookingDocument } from '../schemas/booking.schema.js';
import { BookingSlot, BookingSlotDocument } from '../schemas/booking-slot.schema.js';
import { RedisLockService } from './redis-lock.service.js';
import { ResourceService } from '../../facility/services/resource.service.js';
import { PricingService } from '../../facility/services/pricing.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  HoldBookingDto,
  ConfirmBookingDto,
  CancelBookingDto,
  RecurringBookingDto,
  RecurringBookingResponse,
  BookingStatus,
} from '@sports/contracts';
import {
  parseVietnamDate,
  nowInVietnam,
  toVietnamDateString,
  slotToUtcRange,
  assertValidSlotIndex,
} from '@sports/shared';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(BookingSlot.name) private readonly bookingSlotModel: Model<BookingSlotDocument>,
    private readonly redisLockService: RedisLockService,
    private readonly resourceService: ResourceService,
    private readonly pricingService: PricingService,
    private readonly settingsService: SettingsService,
    private readonly transactionService: DatabaseTransactionService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Bước 1: Giữ chỗ tạm thời (HOLD) với 3 lớp phòng thủ chống trùng lịch (Double-booking Prevention)
   */
  async holdBooking(dto: HoldBookingDto, userId: string): Promise<BookingDocument> {
    const resource = await this.resourceService.findByCode(dto.resourceCode);
    parseVietnamDate(dto.date);
    const todayStr = toVietnamDateString(nowInVietnam());

    if (dto.date < todayStr) {
      throw new BadRequestException('Không thể đặt sân cho ngày trong quá khứ');
    }

    if (!dto.slotIndices || dto.slotIndices.length === 0) {
      throw new BadRequestException('slotIndices không được rỗng');
    }

    const sortedSlots = [...new Set(dto.slotIndices)].sort((a, b) => a - b);
    for (const s of sortedSlots) {
      assertValidSlotIndex(s);
    }

    // 1. Phân giải danh sách đơn vị cơ sở (baseUnitIds) từ mã sân (xử lý sân ghép S7, S11)
    const baseUnitIds = await this.resourceService.resolveBaseUnits(resource.code);

    // 2. Tính toán tiền tệ và cấu hình
    const quote = await this.pricingService.calculatePrice({
      resourceCode: resource.code,
      date: dto.date,
      slotIndices: sortedSlots,
    });

    const holdMinutes = this.settingsService.get<number>('booking.holdMinutes', 10);
    const holdSeconds = holdMinutes * 60;
    const cancelRefundCutoffHours = this.settingsService.get<number>('booking.cancelRefundCutoffHours', 24);
    const depositPercent = this.settingsService.get<number>('booking.depositPercent', 30);

    const bookingId = new Types.ObjectId();
    const token = bookingId.toString();
    const holdExpiresAt = new Date(Date.now() + holdSeconds * 1000);

    // Sinh mã đặt sân duy nhất
    const dateClean = dto.date.replace(/-/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingCode = `BK-${dateClean}-${randSuffix}`;

    // Tạo danh sách Redis keys: lock:slot:{unitId}:{date}:{slotIndex}
    const redisKeys = baseUnitIds.flatMap((unitId) =>
      sortedSlots.map((slotIndex) => `lock:slot:${unitId}:${dto.date}:${slotIndex}`),
    );

    // --- LỚP 1: Khóa Redis nguyên tử (Atomic Multi-key lock) ---
    const locked = await this.redisLockService.acquireSlotLocks(redisKeys, token, holdSeconds);
    if (!locked) {
      throw new ConflictException('Khung giờ này vừa có người giữ chỗ hoặc đã được đặt');
    }

    try {
      // --- LỚP 2: MongoDB Session Transaction ---
      return await this.transactionService.runTransaction(async (session: ClientSession) => {
        const now = new Date();

        // 2a. Dọn các ô HELD đã quá hạn để tránh duplicate key ảo
        await this.bookingSlotModel.deleteMany(
          {
            unitId: { $in: baseUnitIds },
            date: dto.date,
            slotIndex: { $in: sortedSlots },
            status: 'HELD',
            holdExpiresAt: { $lt: now },
          },
          { session },
        );

        // --- LỚP 3: Insert các slot - Bảo vệ bằng Unique Compound Index { unitId: 1, date: 1, slotIndex: 1 } ---
        const slotsToInsert = baseUnitIds.flatMap((unitId) =>
          sortedSlots.map((slotIndex) => ({
            unitId,
            date: dto.date,
            slotIndex,
            bookingId,
            status: 'HELD' as const,
            holdExpiresAt,
          })),
        );

        try {
          await this.bookingSlotModel.insertMany(slotsToInsert, { session });
        } catch (err: any) {
          if (err.code === 11000 || err.name === 'MongoServerError') {
            throw new ConflictException('Khung giờ này không còn trống (xung đột lịch)');
          }
          throw err;
        }

        // Tạo bản ghi Booking chính
        const createdBooking = new this.bookingModel({
          _id: bookingId,
          bookingCode,
          userId: new Types.ObjectId(userId),
          resourceCode: resource.code,
          sport: resource.sport,
          date: dto.date,
          slotIndices: sortedSlots,
          baseUnitIds,
          status: BookingStatus.HOLD,
          totalPrice: quote.totalPrice,
          depositAmount: quote.depositAmount,
          paidAmount: 0,
          holdExpiresAt,
          priceSnapshot: { slots: quote.slots, total: quote.totalPrice },
          policySnapshot: {
            cancelRefundCutoffHours,
            depositPercent,
          },
          matchmaking: dto.matchmaking,
          version: 0,
        });

        await createdBooking.save({ session });

        // Ghi sự kiện Outbox
        await this.outboxService.recordEvent(
          {
            eventType: 'booking.held',
            aggregateType: 'booking',
            aggregateId: bookingId.toString(),
            payload: {
              bookingCode,
              userId,
              resourceCode: resource.code,
              totalPrice: quote.totalPrice,
              holdExpiresAt: holdExpiresAt.toISOString(),
            },
          },
          session,
        );

        // Ghi AuditLog
        await this.auditLogService.record(
          {
            actorId: userId,
            action: 'BOOKING_HOLD',
            targetType: 'booking',
            targetId: bookingId.toString(),
            after: createdBooking.toObject() as unknown as Record<string, unknown>,
          },
          session,
        );

        return createdBooking;
      });
    } catch (err) {
      // Nếu transaction thất bại, giải phóng ngay khóa Redis
      await this.redisLockService.releaseSlotLocks(redisKeys, token);
      throw err;
    }
  }

  /**
   * Bước 2: Xác nhận đặt sân (CONFIRMED) khi thanh toán cọc/toàn bộ thành công
   */
  async confirmBooking(bookingId: string, dto: ConfirmBookingDto, actorId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (booking.status !== BookingStatus.HOLD) {
      throw new BadRequestException(`Không thể xác nhận đặt sân từ trạng thái ${booking.status}`);
    }

    const now = new Date();
    if (booking.holdExpiresAt && booking.holdExpiresAt < now) {
      booking.status = BookingStatus.CANCELLED;
      booking.cancelReason = 'Hết hạn thời gian giữ chỗ';
      await booking.save();
      throw new BadRequestException('Thời gian giữ chỗ tạm thời đã hết hạn');
    }

    const paid = dto.paidAmount !== undefined ? dto.paidAmount : booking.depositAmount;

    return this.transactionService.runTransaction(async (session: ClientSession) => {
      // Cập nhật trạng thái các slots: HELD -> CONFIRMED, gỡ bỏ holdExpiresAt
      await this.bookingSlotModel.updateMany(
        { bookingId: booking._id },
        {
          $set: { status: 'CONFIRMED' },
          $unset: { holdExpiresAt: 1 },
        },
        { session },
      );

      booking.status = BookingStatus.CONFIRMED;
      booking.paidAmount = paid;
      booking.holdExpiresAt = undefined;
      booking.version += 1;

      const updated = await booking.save({ session });

      // Ghi Outbox event
      await this.outboxService.recordEvent(
        {
          eventType: 'booking.confirmed',
          aggregateType: 'booking',
          aggregateId: booking.id,
          payload: {
            bookingCode: booking.bookingCode,
            paidAmount: paid,
          },
        },
        session,
      );

      // Ghi AuditLog
      await this.auditLogService.record(
        {
          actorId,
          action: 'BOOKING_CONFIRM',
          targetType: 'booking',
          targetId: booking.id,
          after: updated.toObject() as unknown as Record<string, unknown>,
        },
        session,
      );

      return updated;
    });
  }

  /**
   * Bước 3: Hủy đặt sân (CANCELLED) & tính toán hoàn tiền dựa theo policySnapshot (mốc 24h)
   */
  async cancelBooking(bookingId: string, dto: CancelBookingDto, actorId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (
      booking.status !== BookingStatus.HOLD &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(`Không thể hủy đặt sân khi đang ở trạng thái ${booking.status}`);
    }

    const now = new Date();
    let refundAmount = 0;

    if (booking.status === BookingStatus.CONFIRMED && booking.paidAmount > 0) {
      const cutoffHours = booking.policySnapshot.cancelRefundCutoffHours || 24;
      const minSlot = Math.min(...booking.slotIndices);
      const { startUtc } = slotToUtcRange(booking.date, minSlot);

      const timeUntilStartMs = startUtc.getTime() - now.getTime();
      const cutoffMs = cutoffHours * 3600 * 1000;

      // Hủy trước mốc cutoff (vd: trước 24h) -> hoàn 100% số tiền đã trả
      if (timeUntilStartMs >= cutoffMs) {
        refundAmount = booking.paidAmount;
      } else {
        refundAmount = 0; // Hủy muộn -> không hoàn cọc
      }
    }

    return this.transactionService.runTransaction(async (session: ClientSession) => {
      // 1. Xóa toàn bộ booking slots để nhả sân cho người khác đặt
      await this.bookingSlotModel.deleteMany({ bookingId: booking._id }, { session });

      // 2. Cập nhật booking
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelReason = dto.reason || 'Khách hàng hủy';
      booking.refundAmount = refundAmount;
      booking.version += 1;

      const updated = await booking.save({ session });

      // Nếu có tiền hoàn, bắn sự kiện yêu cầu ví hoàn tiền
      if (refundAmount > 0) {
        await this.outboxService.recordEvent(
          {
            eventType: 'wallet.refund_requested',
            aggregateType: 'booking',
            aggregateId: booking.id,
            payload: {
              userId: booking.userId.toString(),
              refundAmount,
              reason: 'BOOKING_CANCELLATION',
            },
          },
          session,
        );
      }

      await this.outboxService.recordEvent(
        {
          eventType: 'booking.cancelled',
          aggregateType: 'booking',
          aggregateId: booking.id,
          payload: {
            bookingCode: booking.bookingCode,
            refundAmount,
            cancelReason: booking.cancelReason,
          },
        },
        session,
      );

      await this.auditLogService.record(
        {
          actorId,
          action: 'BOOKING_CANCEL',
          targetType: 'booking',
          targetId: booking.id,
          after: updated.toObject() as unknown as Record<string, unknown>,
        },
        session,
      );

      return updated;
    });
  }

  /**
   * Check-in nhận sân tại quầy (Nhân viên / Lễ tân)
   */
  async checkIn(bookingId: string, actorId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Chỉ có thể check-in khi đặt sân ở trạng thái CONFIRMED (hiện tại: ${booking.status})`);
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.checkInAt = new Date();
    booking.version += 1;
    const updated = await booking.save();

    await this.auditLogService.record({
      actorId,
      action: 'BOOKING_CHECK_IN',
      targetType: 'booking',
      targetId: booking.id,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Hoàn thành lượt chơi (CHECKED_IN -> COMPLETED)
   */
  async complete(bookingId: string, actorId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(`Chỉ có thể hoàn thành khi đặt sân ở trạng thái CHECKED_IN (hiện tại: ${booking.status})`);
    }

    booking.status = BookingStatus.COMPLETED;
    booking.checkOutAt = new Date();
    booking.version += 1;
    const updated = await booking.save();

    await this.auditLogService.record({
      actorId,
      action: 'BOOKING_COMPLETE',
      targetType: 'booking',
      targetId: booking.id,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Đặt định kỳ (Recurring Booking): Tạo chuỗi đặt sân theo tuần
   */
  async createRecurring(dto: RecurringBookingDto, userId: string): Promise<RecurringBookingResponse> {
    const startDt = parseVietnamDate(dto.startDate);
    const endDt = parseVietnamDate(dto.endDate);

    if (startDt > endDt) {
      throw new BadRequestException('startDate phải trước hoặc cùng ngày endDate');
    }

    // Liệt kê các ngày khớp daysOfWeek
    const targetDates: string[] = [];
    let current = startDt;

    while (current <= endDt) {
      const day = current.weekday % 7;
      if (dto.daysOfWeek.includes(day)) {
        targetDates.push(toVietnamDateString(current));
      }
      current = current.plus({ days: 1 });
    }

    if (targetDates.length === 0) {
      throw new BadRequestException('Không tìm thấy ngày nào khớp với cấu hình daysOfWeek trong khoảng thời gian đã chọn');
    }

    const createdBookings: BookingDocument[] = [];
    let totalPrice = 0;

    for (const d of targetDates) {
      const booking = await this.holdBooking(
        {
          resourceCode: dto.resourceCode,
          date: d,
          slotIndices: dto.slotIndices,
          matchmaking: dto.matchmaking,
        },
        userId,
      );
      createdBookings.push(booking);
      totalPrice += booking.totalPrice;
    }

    return {
      createdCount: createdBookings.length,
      totalPrice,
      bookings: createdBookings as any,
    };
  }

  /**
   * Danh sách các trận đang tìm đối thủ (Matchmaking)
   */
  async findMatchmakingList(filter?: { sport?: string; date?: string }): Promise<BookingDocument[]> {
    const todayStr = toVietnamDateString(nowInVietnam());
    const query: Record<string, unknown> = {
      'matchmaking.isLookingForOpponent': true,
      status: { $in: [BookingStatus.HOLD, BookingStatus.CONFIRMED] },
      date: { $gte: filter?.date || todayStr },
    };

    if (filter?.sport) {
      query.sport = filter.sport.toUpperCase();
    }

    return this.bookingModel.find(query).sort({ date: 1, 'slotIndices.0': 1 }).exec();
  }

  async findById(id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  async findByCode(code: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findOne({ bookingCode: code.toUpperCase() }).exec();
    if (!booking) {
      throw new NotFoundException(`Booking with code ${code} not found`);
    }
    return booking;
  }

  async findMyBookings(userId: string, filter?: { status?: string; page?: number; limit?: number }) {
    const page = filter?.page || 1;
    const limit = Math.min(filter?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filter?.status) {
      query.status = filter.status;
    }

    const [items, total] = await Promise.all([
      this.bookingModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.bookingModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findAllBookings(filter?: { date?: string; resourceCode?: string; status?: string; page?: number; limit?: number }) {
    const page = filter?.page || 1;
    const limit = Math.min(filter?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter?.date) query.date = filter.date;
    if (filter?.resourceCode) query.resourceCode = filter.resourceCode.toUpperCase();
    if (filter?.status) query.status = filter.status;

    const [items, total] = await Promise.all([
      this.bookingModel.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.bookingModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }
}
