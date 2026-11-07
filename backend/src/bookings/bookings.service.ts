import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
  /**
   * AC-23 (Sân ghép): Lấy danh sách ID tất cả các sân có liên kết xung đột
   * Đặt Sân 7A tự động chiếm và khóa F1 và F2; ngược lại đặt F1 hoặc F2 thì Sân 7A cũng bị khóa.
   */
  async getConflictingVenueIds(venue: VenueDocument): Promise<Types.ObjectId[]> {
    const conflictingIds: Types.ObjectId[] = [venue._id];

    if (venue.isComposite && venue.baseUnitCodes && venue.baseUnitCodes.length > 0) {
      // SÂN GHÉP (Ví dụ: Sân 7A) -> Tìm các sân con F1, F2
      const objectIdCodes = venue.baseUnitCodes
        .filter((code) => Types.ObjectId.isValid(code))
        .map((id) => new Types.ObjectId(id));

      const childVenues = await this.venueModel
        .find({
          facilityId: venue.facilityId,
          $or: [
            { courtCode: { $in: venue.baseUnitCodes } },
            ...(objectIdCodes.length > 0 ? [{ _id: { $in: objectIdCodes } }] : []),
          ],
        })
        .select('_id')
        .exec();

      for (const child of childVenues) {
        if (!conflictingIds.some((id) => id.equals(child._id))) {
          conflictingIds.push(child._id);
        }
      }
    } else {
      // SÂN CON (Ví dụ: F1 hoặc F2) -> Tìm sân ghép chứa courtCode này
      const possibleCodes = [venue.courtCode, venue._id.toString()].filter(Boolean) as string[];
      if (possibleCodes.length > 0) {
        const parentCompositeVenues = await this.venueModel
          .find({
            facilityId: venue.facilityId,
            isComposite: true,
            baseUnitCodes: { $in: possibleCodes },
          })
          .select('_id')
          .exec();

        for (const parent of parentCompositeVenues) {
          if (!conflictingIds.some((id) => id.equals(parent._id))) {
            conflictingIds.push(parent._id);
          }
        }
      }
    }

    return conflictingIds;
  }

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
      // AC-23: Lấy toàn bộ sân có liên kết phụ thuộc (Sân ghép & Sân con)
      const conflictingVenueIds = await this.getConflictingVenueIds(venue);

      // --- LỚP 2: Business Hold (Kiểm tra DB) ---
      const now = new Date();
      const existingBookings = await this.bookingModel
        .find({
          venueId: { $in: conflictingVenueIds },
          bookingDate,
          startTime: { $lt: dto.endTime },
          endTime: { $gt: dto.startTime },
          status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        })
        .populate('venueId')
        .exec();

      for (const existingBooking of existingBookings) {
        // Nếu booking là HELD nhưng đã quá hạn -> tự động expire để tái sử dụng
        if (
          existingBooking.status === BookingStatus.HELD &&
          existingBooking.holdExpiresAt &&
          existingBooking.holdExpiresAt <= now
        ) {
          existingBooking.status = BookingStatus.EXPIRED;
          await existingBooking.save();
        } else {
          const bookedVenue = existingBooking.venueId as any;
          const isCurrentVenue = bookedVenue?._id?.toString() === venue._id.toString();
          const detailMsg = isCurrentVenue
            ? 'Khung giờ này đã có người giữ chỗ hoặc đặt thành công'
            : venue.isComposite
            ? `Khung giờ này đã bị khóa do sân con cơ sở (${bookedVenue?.name || bookedVenue?.courtCode}) đã có người đặt (AC-23)`
            : `Khung giờ này đã bị khóa do sân ghép (${bookedVenue?.name || bookedVenue?.courtCode}) đã có người đặt (AC-23)`;

          throw new ConflictException({
            statusCode: 409,
            errorCode: 'SLOT_ALREADY_TAKEN',
            message: detailMsg,
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
      let durationHours = 1; // 1 slot mặc định 1 giờ
      if (dto.startTime && dto.endTime) {
        const [startH, startM] = dto.startTime.split(':').map(Number);
        const [endH, endM] = dto.endTime.split(':').map(Number);
        const diffMinutes = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
        if (diffMinutes > 0) {
          durationHours = diffMinutes / 60;
        }
      }
      let totalPrice = Math.round(pricePerHour * durationHours);

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

      // Broadcast sự kiện Socket.io cho sân đặt và các sân liên kết (AC-23)
      for (const vId of conflictingVenueIds) {
        this.eventsGateway.broadcastSlotStatusChanged({
          venueId: vId.toString(),
          bookingDate: dto.bookingDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: BookingStatus.HELD,
          holdExpiresAt,
        });
      }

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

    // AC-23: Lấy tất cả các booking của venue và sân liên kết trong ngày
    const conflictingVenueIds = await this.getConflictingVenueIds(venue);
    const bookings = await this.bookingModel
      .find({
        venueId: { $in: conflictingVenueIds },
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

    // Tạo danh sách các slot theo khung giờ hoạt động của venue (mặc định 06:00 đến 22:00)
    const openTimeStr = venue.operatingHours?.openTime || '06:00';
    const closeTimeStr = venue.operatingHours?.closeTime || '22:00';
    const openHour = parseInt(openTimeStr.split(':')[0], 10) || 6;
    const closeHour = parseInt(closeTimeStr.split(':')[0], 10) || 22;

    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
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
   * Ma trận khung giờ 30 phút theo ngày thi đấu (Mục 2.1)
   * Biểu diễn 3 trạng thái: AVAILABLE (TRỐNG), HELD (ĐANG GIỮ CHỖ), CONFIRMED (ĐÃ ĐẶT)
   * Tự động tính giá peak hours (+20% hoặc theo pricingRules), hỗ trợ bước nhảy linh hoạt (30m, 60m)
   */
  async getSlotsMatrix(venueId: string, dateStr: string, granularityMinutes = 30) {
    if (!venueId) {
      throw new BadRequestException('venueId không được để trống');
    }
    if (!dateStr) {
      throw new BadRequestException('date không được để trống (định dạng YYYY-MM-DD)');
    }

    const venue = await this.venueModel.findById(venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);
    const now = new Date();

    // AC-23: Lấy tất cả các booking của venue và các sân liên kết (Sân ghép / Sân con)
    const conflictingVenueIds = await this.getConflictingVenueIds(venue);
    const bookings = await this.bookingModel
      .find({
        venueId: { $in: conflictingVenueIds },
        bookingDate,
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      })
      .populate('venueId')
      .exec();

    // Làm sạch expired holds
    const activeBookings: BookingDocument[] = [];
    for (const b of bookings) {
      if (b.status === BookingStatus.HELD && b.holdExpiresAt && b.holdExpiresAt <= now) {
        b.status = BookingStatus.EXPIRED;
        await b.save();
      } else {
        activeBookings.push(b);
      }
    }

    const openTimeStr = venue.operatingHours?.openTime || '06:00';
    const closeTimeStr = venue.operatingHours?.closeTime || '22:00';
    const [openHour, openMin] = openTimeStr.split(':').map(Number);
    const [closeHour, closeMin] = closeTimeStr.split(':').map(Number);

    const startTotalMinutes = (openHour || 6) * 60 + (openMin || 0);
    const endTotalMinutes = (closeHour || 22) * 60 + (closeMin || 0);

    const step = Math.max(15, Math.min(120, granularityMinutes || 30));
    const slots = [];

    for (let currentMinutes = startTotalMinutes; currentMinutes < endTotalMinutes; currentMinutes += step) {
      const nextMinutes = currentMinutes + step;
      if (nextMinutes > endTotalMinutes) break;

      const sh = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const sm = (currentMinutes % 60).toString().padStart(2, '0');
      const eh = Math.floor(nextMinutes / 60).toString().padStart(2, '0');
      const em = (nextMinutes % 60).toString().padStart(2, '0');

      const startTime = `${sh}:${sm}`;
      const endTime = `${eh}:${em}`;

      // Tìm booking giao với khoảng [startTime, endTime)
      const matched = activeBookings.find((b) => b.startTime < endTime && b.endTime > startTime);

      let status = 'AVAILABLE';
      let statusLabel = 'TRỐNG';
      let holdExpiresAt: Date | undefined = undefined;
      let bookingInfo: any = undefined;

      if (matched) {
        if (matched.status === BookingStatus.CONFIRMED || matched.status === BookingStatus.CHECKED_IN) {
          status = 'CONFIRMED';
          statusLabel = 'ĐÃ ĐẶT';
        } else if (matched.status === BookingStatus.HELD) {
          status = 'HELD';
          statusLabel = 'ĐANG GIỮ CHỖ';
          holdExpiresAt = matched.holdExpiresAt;
        }
        bookingInfo = {
          bookingId: matched._id,
          customerName: matched.customerName || (matched.userId ? 'Hội viên' : 'Khách vãng lai'),
          isWalkIn: matched.isWalkIn || false,
        };
      }

      // Tính giá và kiểm tra peak hour
      let pricePerHour = venue.basePricePerHour || 250000;
      let isPeak = false;

      // Giờ cao điểm: nếu cấu hình pricingRules.peakHours thì ưu tiên, nếu không mặc định 17:00 - 21:00 (+20%)
      if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
        const peak = venue.pricingRules.peakHours.find(
          (p: any) => startTime >= p.startTime && startTime < p.endTime,
        );
        if (peak) {
          isPeak = true;
          if (typeof peak.price === 'number') {
            pricePerHour = peak.price;
          }
        }
      } else if (startTime >= '17:00' && startTime < '21:00') {
        isPeak = true;
        pricePerHour = Math.round(pricePerHour * 1.2);
      }

      const slotPrice = Math.round(pricePerHour * (step / 60));

      slots.push({
        slot: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        status,
        statusLabel,
        price: slotPrice,
        pricePerHour,
        isPeak,
        holdExpiresAt,
        bookingInfo,
      });
    }

    // Hỗ trợ Combo Giờ Đêm Esports
    if (
      venue.type === VenueType.ESPORT_VIP ||
      venue.type === VenueType.ESPORT_NORMAL ||
      venue.pricingRules?.nightCombo?.enabled
    ) {
      const nightMatched = activeBookings.find((b) => b.startTime < '06:00' && b.endTime > '23:00');
      slots.push({
        slot: '23:00 - 06:00 (Combo Đêm)',
        startTime: '23:00',
        endTime: '06:00',
        status: nightMatched ? nightMatched.status : 'AVAILABLE',
        statusLabel: nightMatched ? (nightMatched.status === BookingStatus.HELD ? 'ĐANG GIỮ CHỖ' : 'ĐÃ ĐẶT') : 'TRỐNG',
        price: venue.pricingRules?.nightCombo?.comboPrice || 70000,
        pricePerHour: venue.pricingRules?.nightCombo?.comboPrice || 70000,
        isNightCombo: true,
        isPeak: false,
        holdExpiresAt: nightMatched?.holdExpiresAt,
      });
    }

    return {
      venueId,
      venueName: venue.name,
      courtCode: venue.courtCode,
      sportCategory: venue.sportCategory || venue.type,
      date: dateStr,
      granularityMinutes: step,
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
   * Changelog Item 3:
   * 1. Kiểm tra ownership: req.user.id === booking.userId -> 403 Forbidden
   * 2. Tính tỷ lệ hoàn tiền cancellationPolicy theo số giờ còn lại trước giờ bắt đầu
   */
  async cancelBooking(bookingId: string, userId: string): Promise<any> {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    // 1. Kiểm tra quyền sở hữu
    if (booking.userId?.toString() !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền hủy đơn đặt này',
      });
    }

    if (booking.status !== BookingStatus.HELD && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Không thể hủy đơn đang ở trạng thái ${booking.status}`);
    }

    // 2. Tính toán chính sách hoàn tiền cancellationPolicy nếu đơn đã CONFIRMED
    const venue = booking.venueId as any;
    const policy = venue?.cancellationPolicy || {
      hoursBeforeForFullRefund: 24,
      hoursBeforeForNoRefund: 2,
    };

    let refundRate = 1.0;
    let refundAmount = booking.totalPrice;

    if (booking.status === BookingStatus.CONFIRMED) {
      const [startH, startM] = (booking.startTime || '00:00').split(':').map(Number);
      const bDate = new Date(booking.bookingDate);
      const slotStartTime = new Date(
        bDate.getFullYear(),
        bDate.getMonth(),
        bDate.getDate(),
        startH || 0,
        startM || 0,
        0,
        0,
      );
      const now = new Date();
      const diffHours = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours >= policy.hoursBeforeForFullRefund) {
        refundRate = 1.0;
        refundAmount = booking.totalPrice;
      } else if (diffHours <= policy.hoursBeforeForNoRefund) {
        refundRate = 0.0;
        refundAmount = 0;
      } else {
        refundRate = 0.5;
        refundAmount = Math.round(booking.totalPrice * 0.5);
      }
    }

    booking.status = BookingStatus.CANCELLED;
    const updated = await booking.save();

    // Broadcast giải phóng slot sang AVAILABLE
    const dateStr = booking.bookingDate.toISOString().split('T')[0];
    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: (venue?._id || booking.venueId).toString(),
      bookingDate: dateStr,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: BookingStatus.CANCELLED,
    });

    const resObj = updated.toObject ? updated.toObject() : updated;
    return {
      ...resObj,
      refundRate,
      refundAmount,
      cancellationPolicy: policy,
    };
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

    // AC-23: Kiểm tra xung đột sân ghép và sân con
    const conflictingVenueIds = await this.getConflictingVenueIds(venue);
    const existingActive = await this.bookingModel
      .findOne({
        venueId: { $in: conflictingVenueIds },
        bookingDate,
        startTime: { $lt: dto.endTime },
        endTime: { $gt: dto.startTime },
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      })
      .populate('venueId')
      .exec();

    if (existingActive) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'SLOT_ALREADY_TAKEN',
        message: 'Khung giờ này đã có người đặt hoặc bị chiếm bởi sân liên kết (AC-23)',
      });
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

      // Broadcast Socket.io slot chuyển đỏ (CONFIRMED) cho toàn bộ sân liên kết (AC-23)
      for (const vId of conflictingVenueIds) {
        this.eventsGateway.broadcastSlotStatusChanged({
          venueId: vId.toString(),
          bookingDate: dto.bookingDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: BookingStatus.CONFIRMED,
        });
      }

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

