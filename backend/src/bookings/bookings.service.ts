import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { BookingSource, BookingStatus, VenueType } from '../common/enums';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    private redisService: RedisService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Chống trùng lịch 3 lớp (Mục 4.1 của spec)
   * Lớp 1: Redis Mutex (TTL 2-3s)
   * Lớp 2: Business Hold ghi MongoDB (status=HELD, holdExpiresAt=now+10m) -> Nhả Mutex ngay
   * Lớp 3: Unique Partial Index của MongoDB
   */
  async holdBooking(userId: string, dto: HoldBookingDto): Promise<BookingDocument> {
    // 1. Kiểm tra Venue có tồn tại không
    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    // Chuẩn hóa ngày (00:00:00 UTC)
    const bookingDate = new Date(`${dto.bookingDate}T00:00:00.000Z`);
    const lockKey = `lock:${dto.venueId}:${dto.bookingDate}:${dto.startTime}`;

    // --- LỚP 1: Redis Mutex Lock (TTL 3000ms) ---
    const lockAcquired = await this.redisService.acquireLock(lockKey, userId, 3000);
    if (!lockAcquired) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'SLOT_MUTEX_LOCKED',
        message: 'Khung giờ đang có người thao tác giữ chỗ, vui lòng thử lại sau giây lát',
      });
    }

    try {
      // --- LỚP 2: Business Hold (Kiểm tra DB) ---
      const now = new Date();
      const existingBooking = await this.bookingModel
        .findOne({
          venueId: new Types.ObjectId(dto.venueId),
          bookingDate,
          startTime: dto.startTime,
          status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
        })
        .exec();

      if (existingBooking) {
        // Nếu booking là HELD nhưng đã quá hạn -> tự động expire để tái sử dụng
        if (
          existingBooking.status === BookingStatus.HELD &&
          existingBooking.holdExpiresAt &&
          existingBooking.holdExpiresAt <= now
        ) {
          existingBooking.status = BookingStatus.EXPIRED;
          await existingBooking.save();
        } else {
          throw new ConflictException({
            statusCode: 409,
            errorCode: 'SLOT_ALREADY_TAKEN',
            message: 'Khung giờ này đã có người giữ chỗ hoặc đặt thành công',
          });
        }
      }

      // Tính tổng tiền dựa trên giá cơ bản và thời lượng (kèm giá giờ vàng peak hours nếu có)
      let pricePerHour = venue.basePricePerHour;
      if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
        const peak = venue.pricingRules.peakHours.find(
          (p: any) => dto.startTime >= p.startTime && dto.startTime < p.endTime,
        );
        if (peak && typeof peak.price === 'number') {
          pricePerHour = peak.price;
        }
      }
      const durationHours = 1; // 1 slot mặc định 1 giờ
      let totalPrice = pricePerHour * durationHours;

      // Hỗ trợ Combo Giờ Đêm Esports (Mục 6.2)
      if (
        (dto.startTime === '23:00' || dto.startTime === '22:00') &&
        dto.endTime === '06:00' &&
        venue.pricingRules?.nightCombo?.enabled
      ) {
        totalPrice = venue.pricingRules.nightCombo.comboPrice || 70000;
      }

      const holdExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 phút

      // Tạo bản ghi Business Hold
      const newBooking = new this.bookingModel({
        userId: new Types.ObjectId(userId),
        venueId: new Types.ObjectId(dto.venueId),
        bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalPrice,
        bookingSource: BookingSource.APP,
        status: BookingStatus.HELD,
        holdExpiresAt,
      });

      // --- LỚP 3: Lưu vào MongoDB (Bảo vệ bởi Unique Partial Index) ---
      const savedBooking = await newBooking.save();

      // Broadcast sự kiện Socket.io (Mục 2.4 & 4.1)
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: dto.venueId,
        bookingDate: dto.bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: BookingStatus.HELD,
        holdExpiresAt,
      });

      return savedBooking;
    } finally {
      // BẮT BUỘC: Nhả Mutex ngay lập tức sau khi hoàn thành lưu DB (không đợi hết TTL)
      await this.redisService.releaseLock(lockKey, userId);
    }
  }

  /**
   * Xem lịch trống theo ngày (Mục 5 - GET /venues/:id/availability)
   */
  async getAvailability(venueId: string, dateStr: string) {
    const venue = await this.venueModel.findById(venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);
    const now = new Date();

    // Lấy tất cả các booking của venue trong ngày
    const bookings = await this.bookingModel
      .find({
        venueId: new Types.ObjectId(venueId),
        bookingDate,
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
      })
      .exec();

    // Tạo bản đồ trạng thái các slot theo giờ
    const bookingMap = new Map<string, BookingDocument>();
    for (const b of bookings) {
      // Nếu là HELD nhưng đã quá hạn -> đổi thành EXPIRED
      if (b.status === BookingStatus.HELD && b.holdExpiresAt && b.holdExpiresAt <= now) {
        b.status = BookingStatus.EXPIRED;
        await b.save();
      } else {
        bookingMap.set(b.startTime, b);
      }
    }

    // Tạo danh sách các slot từ 06:00 đến 22:00
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      const startH = hour.toString().padStart(2, '0');
      const endH = (hour + 1).toString().padStart(2, '0');
      const startTime = `${startH}:00`;
      const endTime = `${endH}:00`;

      const existing = bookingMap.get(startTime);
      let status = 'AVAILABLE';
      let holdExpiresAt = undefined;

      if (existing) {
        status = existing.status;
        holdExpiresAt = existing.holdExpiresAt;
      }

      let price = venue.basePricePerHour;
      if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
        const peak = venue.pricingRules.peakHours.find(
          (p: any) => startTime >= p.startTime && startTime < p.endTime
        );
        if (peak && typeof peak.price === 'number') {
          price = peak.price;
        }
      }

      slots.push({
        slot: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        status,
        price,
        holdExpiresAt,
      });
    }

    // Hỗ trợ Combo Giờ Đêm cho Esports / Cơ sở mở xuyên đêm (Mục 6.2)
    if (
      venue.type === VenueType.ESPORT_VIP ||
      venue.type === VenueType.ESPORT_NORMAL ||
      venue.pricingRules?.nightCombo?.enabled
    ) {
      const nightExisting = bookingMap.get('23:00');
      slots.push({
        slot: '23:00 - 06:00 (Combo Đêm)',
        startTime: '23:00',
        endTime: '06:00',
        status: nightExisting ? nightExisting.status : 'AVAILABLE',
        price: venue.pricingRules?.nightCombo?.comboPrice || 70000,
        isNightCombo: true,
        holdExpiresAt: nightExisting?.holdExpiresAt,
      });
    }

    return {
      venueId,
      venueName: venue.name,
      date: dateStr,
      slots,
    };
  }

  /**
   * Lịch sử đặt chỗ của khách (Mục 5 - GET /bookings/me)
   */
  async getMyBookings(userId: string): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('venueId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Hủy đơn giữ chỗ / đặt chỗ (Mục 5 - POST /bookings/:id/cancel)
   */
  async cancelBooking(bookingId: string, userId: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    if (booking.userId?.toString() !== userId) {
      throw new ConflictException('Bạn không có quyền hủy đơn đặt này');
    }

    if (booking.status !== BookingStatus.HELD && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Không thể hủy đơn đang ở trạng thái ${booking.status}`);
    }

    booking.status = BookingStatus.CANCELLED;
    const updated = await booking.save();

    // Broadcast giải phóng slot sang AVAILABLE
    const dateStr = booking.bookingDate.toISOString().split('T')[0];
    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: booking.venueId.toString(),
      bookingDate: dateStr,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: BookingStatus.CANCELLED,
    });

    return updated;
  }

  /**
   * Quét và chuyển các booking HELD quá hạn sang EXPIRED (Mục 4.1)
   */
  async cleanExpiredBookings(): Promise<number> {
    const now = new Date();
    const expiredBookings = await this.bookingModel
      .find({
        status: BookingStatus.HELD,
        holdExpiresAt: { $lte: now },
      })
      .exec();

    if (expiredBookings.length === 0) {
      return 0;
    }

    this.logger.log(`Phát hiện ${expiredBookings.length} booking HELD quá hạn, đang chuyển sang EXPIRED...`);

    for (const b of expiredBookings) {
      b.status = BookingStatus.EXPIRED;
      await b.save();

      // Broadcast giải phóng slot
      const dateStr = b.bookingDate.toISOString().split('T')[0];
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: b.venueId.toString(),
        bookingDate: dateStr,
        startTime: b.startTime,
        endTime: b.endTime,
        status: BookingStatus.EXPIRED,
      });
    }

    return expiredBookings.length;
  }

  /**
   * Đặt nhanh tại quầy (Walk-in) - Mục 4.3 của spec
   * Ghi thẳng Bookings với bookingSource=WALK_IN, status=CONFIRMED, không qua Redis.
   * Bắt lỗi E11000 duplicate key -> trả SLOT_ALREADY_TAKEN_ONLINE
   */
  async createWalkInBooking(dto: WalkInBookingDto): Promise<BookingDocument> {
    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    const bookingDate = new Date(`${dto.bookingDate}T00:00:00.000Z`);
    let totalPrice = venue.basePricePerHour; // 1 slot mặc định 1 giờ

    // Hỗ trợ Combo Giờ Đêm Esports khi đặt tại quầy (Mục 6.2)
    if (
      (dto.startTime === '23:00' || dto.startTime === '22:00') &&
      dto.endTime === '06:00' &&
      venue.pricingRules?.nightCombo?.enabled
    ) {
      totalPrice = venue.pricingRules.nightCombo.comboPrice || 70000;
    }

    try {
      const walkInBooking = new this.bookingModel({
        userId: null, // Walk-in không định danh
        venueId: new Types.ObjectId(dto.venueId),
        bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalPrice,
        bookingSource: BookingSource.WALK_IN,
        status: BookingStatus.CONFIRMED,
        isCheckedIn: false,
        isWalkIn: true,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        paymentMethod: dto.paymentMethod,
        note: dto.note,
      });

      const saved = await walkInBooking.save();

      // Broadcast Socket.io slot chuyển đỏ (CONFIRMED)
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: dto.venueId,
        bookingDate: dto.bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: BookingStatus.CONFIRMED,
      });

      return saved;
    } catch (err: any) {
      if (err?.code === 11000 || err?.name === 'MongoServerError') {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN_ONLINE',
          message: 'Khung giờ này vừa có khách hàng trực tuyến giữ chỗ hoặc đặt thành công!',
        });
      }
      throw err;
    }
  }
}

