import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingsCronService {
  private readonly logger = new Logger(BookingsCronService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Chạy định kỳ mỗi 30 giây để quét dọn các booking HELD quá hạn (Mục 4.1 của spec)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    try {
      const cleaned = await this.bookingsService.cleanExpiredBookings();
      if (cleaned > 0) {
        this.logger.log(`Cron: Đã tự động chuyển ${cleaned} đơn HELD quá hạn sang EXPIRED.`);
      }
    } catch (err) {
      this.logger.error(`Lỗi khi dọn dẹp expired bookings: ${err.message}`);
    }
  }
}
