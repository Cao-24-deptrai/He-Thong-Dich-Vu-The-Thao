import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../schemas/booking.schema.js';
import { BookingSlot, BookingSlotDocument } from '../schemas/booking-slot.schema.js';
import { BookingStatus } from '@sports/shared';

@Injectable()
export class BookingCleanupService {
  private readonly logger = new Logger(BookingCleanupService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(BookingSlot.name) private readonly bookingSlotModel: Model<BookingSlotDocument>,
  ) {}

  /**
   * Quét và dọn các lượt giữ chỗ tạm thời (HOLD) đã quá hạn
   */
  async cleanupExpiredHolds(): Promise<{ expiredBookingsCount: number; deletedSlotsCount: number }> {
    const now = new Date();

    // 1. Cập nhật các booking HOLD đã hết hạn
    const expiredBookingsResult = await this.bookingModel.updateMany(
      {
        status: BookingStatus.HOLD,
        holdExpiresAt: { $lt: now },
      },
      {
        $set: {
          status: BookingStatus.CANCELLED,
          cancelReason: 'Hết hạn thời gian giữ chỗ tạm thời',
        },
      },
    );

    // 2. Xóa các slot HELD đã hết hạn
    const deletedSlotsResult = await this.bookingSlotModel.deleteMany({
      status: 'HELD',
      holdExpiresAt: { $lt: now },
    });

    if (expiredBookingsResult.modifiedCount > 0 || deletedSlotsResult.deletedCount > 0) {
      this.logger.log(
        `Cleanup: Expired ${expiredBookingsResult.modifiedCount} hold bookings and released ${deletedSlotsResult.deletedCount} slots.`,
      );
    }

    return {
      expiredBookingsCount: expiredBookingsResult.modifiedCount,
      deletedSlotsCount: deletedSlotsResult.deletedCount,
    };
  }
}
