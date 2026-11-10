import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { BookingSlot, BookingSlotDocument } from './schemas/booking-slot.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { RecurringBookingDto } from './dto/recurring-booking.dto';
import { BookingSource, BookingStatus, UserRole, VenueType } from '../common/enums';
import {
  BOOKING_EVENTS,
  BookingHeldEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  BookingExpiredEvent,
} from './events/booking-events';

/**
 * Bản đồ phân rã phân cấp Sân Ghép về Đơn vị cơ sở (Leaf Units)
 * Mục 2.2:
 * - 1 Sân 11 (S11) chiếm trọn 6 sân 5 cơ sở [F1, F2, F3, F4, F5, F6]
 * - Sân 7 (S7-A) ghép từ F1 + F2
 * - Sân 7 (S7-B) ghép từ F3 + F4
 * - Sân 7 (S7-C) ghép từ F5 + F6
 * - Sân 5 (F1..F6) chiếm đúng 1 sân cơ sở tương ứng
 */
export const PITCH_LEAF_UNITS: Record<string, string[]> = {
  // Sân 5 cơ sở
  'F1': ['F1'],
  'F2': ['F2'],
  'F3': ['F3'],
  'F4': ['F4'],
  'F5': ['F5'],
  'F6': ['F6'],

  // Sân 7 ghép
  'S7-A': ['F1', 'F2'],
  'S7-B': ['F3', 'F4'],
  'S7-C': ['F5', 'F6'],

  // Sân 11 đại tổ hợp
  'S11': ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(BookingSlot.name) private bookingSlotModel: Model<BookingSlotDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    private redisService: RedisService,
    private eventsGateway: EventsGateway,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Sinh mã đặt chỗ chuẩn hóa BK-YYYYMMDD-XXXX (Mục BR-05)
   */
  generateBookingCode(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BK-${y}${m}${day}-${rand}`;
  }

  /**
   * Chuyển đổi giờ HH:mm sang slot index 0..47 (block 30 phút)
   */
  timeToSlotIndex(time: string): number {
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    return h * 2 + (m >= 30 ? 1 : 0);
  }

  /**
   * Chuyển đổi slot index 0..47 sang giờ HH:mm
   */
  slotIndexToTime(index: number): string {
    const h = Math.floor(index / 2).toString().padStart(2, '0');
    const m = index % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  }

  /**
   * Lấy danh sách các block 30 phút giữa startTime và endTime
   */
  getSlotsForRange(startTime: string, endTime: string): { slotIndex: number; startTime: string; endTime: string }[] {
    const startIdx = this.timeToSlotIndex(startTime);
    let endIdx = this.timeToSlotIndex(endTime);
    // Xử lý trường hợp combo đêm vắt qua ngày hôm sau (vd 23:00 -> 06:00)
    if (endIdx <= startIdx) {
      endIdx += 48;
    }
    const slots: { slotIndex: number; startTime: string; endTime: string }[] = [];
    for (let idx = startIdx; idx < endIdx; idx++) {
      const normalizedIdx = idx % 48;
      slots.push({
        slotIndex: normalizedIdx,
        startTime: this.slotIndexToTime(normalizedIdx),
        endTime: this.slotIndexToTime((normalizedIdx + 1) % 48),
      });
    }
    return slots;
  }

  /**
   * Phân rã đơn vị sân thành tập hợp các đơn vị cơ sở (Leaf Units)
   * Mục 2.2:
   * - Sân 11 (S11) chiếm 6 đơn vị cơ sở: [F1, F2, F3, F4, F5, F6]
   * - Sân 7 (S7-A) chiếm 2 đơn vị cơ sở: [F1, F2]
   * - Sân 7 (S7-B) chiếm 2 đơn vị cơ sở: [F3, F4]
   * - Sân 7 (S7-C) chiếm 2 đơn vị cơ sở: [F5, F6]
   * - Sân 5 (F1..F6) chiếm đúng 1 đơn vị cơ sở tương ứng
   */
  resolveLeafUnits(venue: VenueDocument | any): string[] {
    if (!venue) return [];

    // 1. Nếu cấu hình tường minh trong pricingRules/metadata
    if (venue.pricingRules?.leafUnits && Array.isArray(venue.pricingRules.leafUnits)) {
      return venue.pricingRules.leafUnits;
    }
    if (venue.pricingRules?.compositeUnits && Array.isArray(venue.pricingRules.compositeUnits)) {
      return venue.pricingRules.compositeUnits;
    }

    // 2. Nếu cấu hình pitchCode trong pricingRules (F1, S7-A, S11, ...)
    const explicitCode = venue.pricingRules?.pitchCode;
    if (explicitCode && PITCH_LEAF_UNITS[explicitCode]) {
      return PITCH_LEAF_UNITS[explicitCode];
    }

    // 3. Suy luận tự động dựa trên tên sân hoặc loại sân (S11, S7-A, F1, ...)
    const name = (venue.name || '').toUpperCase();
    if (name.includes('S11') || name.includes('SÂN 11') || venue.type === VenueType.FOOTBALL_11) {
      return PITCH_LEAF_UNITS['S11'];
    }
    if (name.includes('S7-A') || name.includes('SÂN 7A') || name.includes('SÂN 7-A') || name.includes('SÂN 7 SỐ 1')) {
      return PITCH_LEAF_UNITS['S7-A'];
    }
    if (name.includes('S7-B') || name.includes('SÂN 7B') || name.includes('SÂN 7-B') || name.includes('SÂN 7 SỐ 2')) {
      return PITCH_LEAF_UNITS['S7-B'];
    }
    if (name.includes('S7-C') || name.includes('SÂN 7C') || name.includes('SÂN 7-C') || name.includes('SÂN 7 SỐ 3')) {
      return PITCH_LEAF_UNITS['S7-C'];
    }

    for (let i = 1; i <= 6; i++) {
      if (name.includes(`F${i}`) || name.includes(`SÂN 5 SỐ ${i}`) || name.includes(`SÂN 5 - ${i}`)) {
        return PITCH_LEAF_UNITS[`F${i}`];
      }
    }

    // Mặc định sân độc lập: leaf unit chính là venueId
    return [venue._id.toString()];
  }

  /**
   * Chống trùng lịch 3 lớp (Mục 4.1 của spec) kết hợp Composite Pitches Engine (Mục 2.2)
   * Lớp 1: Redis Mutex (TTL 2-3s)
   * Lớp 2: Business Hold ghi MongoDB (status=HELD, holdExpiresAt=now+10m) -> Nhả Mutex ngay
   * Lớp 3: Unique Partial Index của MongoDB trên Booking và BookingSlot (trên các leaf units cơ sở)
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
      // --- LỚP 2: Business Hold & Composite Pitches Check (Kiểm tra DB) ---
      const now = new Date();
      const leafUnits = this.resolveLeafUnits(venue);
      const slotBlocks = this.getSlotsForRange(dto.startTime, dto.endTime);
      const slotIndexes = slotBlocks.map((s) => s.slotIndex);

      // Dọn dẹp sơ bộ các slot HELD đã quá hạn của các unit cơ sở
      await this.bookingSlotModel.updateMany(
        {
          unitId: { $in: leafUnits },
          date: dto.bookingDate,
          slotIndex: { $in: slotIndexes },
          status: BookingStatus.HELD,
          holdExpiresAt: { $lte: now },
        },
        { $set: { status: BookingStatus.EXPIRED } },
      );

      // Kiểm tra xem có đơn vị cơ sở nào trong leafUnits đang bị chiếm chỗ không
      const occupiedSlot = await this.bookingSlotModel
        .findOne({
          unitId: { $in: leafUnits },
          date: dto.bookingDate,
          slotIndex: { $in: slotIndexes },
          $or: [
            { status: BookingStatus.CONFIRMED },
            { status: BookingStatus.HELD, holdExpiresAt: { $gt: now } },
          ],
        })
        .exec();

      if (occupiedSlot) {
        const isSelf = occupiedSlot.unitId === venue._id.toString();
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN',
          message: isSelf
            ? 'Khung giờ này đã có người giữ chỗ hoặc đặt thành công'
            : `Xung đột sân ghép: Đơn vị thành phần hoặc liên đới [${occupiedSlot.unitId}] đã bị chiếm chỗ!`,
          conflictingUnit: occupiedSlot.unitId,
        });
      }

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
          await this.bookingSlotModel.updateMany(
            { bookingId: existingBooking._id },
            { $set: { status: BookingStatus.EXPIRED } },
          );
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

      // Snapshot chính sách và bảng giá (Bảo toàn bất biến BR-05)
      const policySnapshot = venue.cancellationPolicy || {
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      };
      const priceSnapshot = {
        basePricePerHour: venue.basePricePerHour,
        appliedPricePerHour: pricePerHour,
        pricingRules: venue.pricingRules || null,
      };
      const bookingCode = this.generateBookingCode(dto.bookingDate);

      // Tạo bản ghi Business Hold
      const newBooking = new this.bookingModel({
        bookingCode,
        userId: new Types.ObjectId(userId),
        venueId: new Types.ObjectId(dto.venueId),
        bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalPrice,
        priceSnapshot,
        policySnapshot,
        isRecurring: false,
        bookingSource: BookingSource.APP,
        status: BookingStatus.HELD,
        holdExpiresAt,
      });

      // --- LỚP 3: Lưu vào MongoDB (Bảo vệ bởi Unique Partial Index của Booking & BookingSlot) ---
      const savedBooking = await newBooking.save();

      try {
        const slotDocs: any[] = [];
        for (const unit of leafUnits) {
          for (const s of slotBlocks) {
            slotDocs.push({
              bookingId: savedBooking._id,
              venueId: savedBooking.venueId,
              unitId: unit,
              date: dto.bookingDate,
              slotIndex: s.slotIndex,
              startTime: s.startTime,
              endTime: s.endTime,
              status: BookingStatus.HELD,
              holdExpiresAt,
            });
          }
        }
        await this.bookingSlotModel.insertMany(slotDocs);
      } catch (slotErr: any) {
        // Rollback booking và các slots nếu vi phạm unique slot index
        await this.bookingModel.deleteOne({ _id: savedBooking._id });
        await this.bookingSlotModel.deleteMany({ bookingId: savedBooking._id });
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN',
          message: 'Xung đột sân ghép hoặc khung giờ này đã có người giữ chỗ/đặt thành công',
        });
      }

      // Broadcast sự kiện Socket.io (Mục 2.4 & 4.1)
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: dto.venueId,
        bookingDate: dto.bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: BookingStatus.HELD,
        holdExpiresAt,
      });

      // Phát Domain Event cho các module khác (Mục 4.1)
      try {
        this.eventEmitter?.emit(BOOKING_EVENTS.HELD, new BookingHeldEvent(savedBooking));
      } catch (e) {
        this.logger.warn(`Lỗi khi emit BOOKING_HELD: ${e.message}`);
      }

      return savedBooking;
    } finally {
      // BẮT BUỘC: Nhả Mutex ngay lập tức sau khi hoàn thành lưu DB (không đợi hết TTL)
      await this.redisService.releaseLock(lockKey, userId);
    }
  }

  /**
   * Xem lịch trống theo ngày (Mục 5 - GET /venues/:id/availability)
   * Nâng cấp: Tự động tổng hợp trạng thái từ các sân con/sân ghép liên đới theo leaf units
   */
  async getAvailability(venueId: string, dateStr: string) {
    const venue = await this.venueModel.findById(venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);
    const now = new Date();
    const leafUnits = this.resolveLeafUnits(venue);

    // Lấy tất cả các booking của venue trong ngày
    const bookings = await this.bookingModel
      .find({
        venueId: new Types.ObjectId(venueId),
        bookingDate,
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
      })
      .exec();

    // Tạo bản đồ trạng thái các slot theo giờ từ Booking
    const bookingMap = new Map<string, BookingDocument>();
    for (const b of bookings) {
      // Nếu là HELD nhưng đã quá hạn -> đổi thành EXPIRED
      if (b.status === BookingStatus.HELD && b.holdExpiresAt && b.holdExpiresAt <= now) {
        b.status = BookingStatus.EXPIRED;
        await b.save();
        await this.bookingSlotModel.updateMany(
          { bookingId: b._id },
          { $set: { status: BookingStatus.EXPIRED } },
        );
      } else {
        bookingMap.set(b.startTime, b);
      }
    }

    // Lấy các slot bị chiếm dụng từ booking_slots của tất cả các leaf units
    const occupiedSlots = await this.bookingSlotModel
      .find({
        unitId: { $in: leafUnits },
        date: dateStr,
        status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
      })
      .exec();

    const occupiedSlotMap = new Map<number, BookingSlotDocument>();
    for (const s of occupiedSlots) {
      if (s.status === BookingStatus.HELD && s.holdExpiresAt && s.holdExpiresAt <= now) {
        s.status = BookingStatus.EXPIRED;
        await s.save();
      } else {
        occupiedSlotMap.set(s.slotIndex, s);
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

      const existingBooking = bookingMap.get(startTime);
      const startIdx = hour * 2;
      const nextIdx = hour * 2 + 1;
      const occupiedSlot = occupiedSlotMap.get(startIdx) || occupiedSlotMap.get(nextIdx);

      let status = 'AVAILABLE';
      let holdExpiresAt = undefined;

      if (existingBooking) {
        status = existingBooking.status;
        holdExpiresAt = existingBooking.holdExpiresAt;
      } else if (occupiedSlot) {
        status = occupiedSlot.status;
        holdExpiresAt = occupiedSlot.holdExpiresAt;
      }

      let price = venue.basePricePerHour;
      if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
        const peak = venue.pricingRules.peakHours.find(
          (p: any) => startTime >= p.startTime && startTime < p.endTime,
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
      const nightSlot = occupiedSlotMap.get(46); // 23:00
      slots.push({
        slot: '23:00 - 06:00 (Combo Đêm)',
        startTime: '23:00',
        endTime: '06:00',
        status: nightExisting ? nightExisting.status : (nightSlot ? nightSlot.status : 'AVAILABLE'),
        price: venue.pricingRules?.nightCombo?.comboPrice || 70000,
        isNightCombo: true,
        holdExpiresAt: nightExisting?.holdExpiresAt || nightSlot?.holdExpiresAt,
      });
    }

    // --- BƯỚC 2.4: MA TRẬN 48 SLOT (MỖI SLOT 30 PHÚT TỪ 00:00 ĐẾN 23:30) - US-004 ---
    const matrix48: any[] = [];
    let availableCount = 0;
    let heldCount = 0;
    let confirmedCount = 0;
    let maintenanceCount = 0;

    for (let idx = 0; idx < 48; idx++) {
      const startTime = this.slotIndexToTime(idx);
      const endTime = this.slotIndexToTime((idx + 1) % 48);

      // 1. Kiểm tra khung giờ mở cửa
      let isOperating = startTime >= openTimeStr && endTime <= closeTimeStr;
      if (
        (venue.type === VenueType.ESPORT_VIP ||
          venue.type === VenueType.ESPORT_NORMAL ||
          venue.pricingRules?.nightCombo?.enabled) &&
        (startTime >= '22:00' || endTime <= '06:00')
      ) {
        isOperating = true;
      }

      // 2. Tính giá cho block 30 phút
      let price = Math.round(venue.basePricePerHour / 2);
      if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
        const peak = venue.pricingRules.peakHours.find(
          (p: any) => startTime >= p.startTime && startTime < p.endTime,
        );
        if (peak && typeof peak.price === 'number') {
          price = Math.round(peak.price / 2);
        }
      }

      // 3. Phân định trạng thái chuẩn 4 mức: AVAILABLE, HELD, CONFIRMED, MAINTENANCE
      let status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'MAINTENANCE';
      let holdExpiresAt: Date | undefined = undefined;
      let countdownSeconds: number | undefined = undefined;

      if (venue.isActive === false || !isOperating) {
        status = 'MAINTENANCE';
        maintenanceCount++;
      } else {
        const occupied = occupiedSlotMap.get(idx);
        if (occupied) {
          if (occupied.status === BookingStatus.CONFIRMED) {
            status = 'CONFIRMED';
            confirmedCount++;
          } else if (occupied.status === BookingStatus.HELD && occupied.holdExpiresAt && occupied.holdExpiresAt > now) {
            status = 'HELD';
            holdExpiresAt = occupied.holdExpiresAt;
            countdownSeconds = Math.max(0, Math.floor((occupied.holdExpiresAt.getTime() - now.getTime()) / 1000));
            heldCount++;
          } else {
            status = 'AVAILABLE';
            availableCount++;
          }
        } else {
          status = 'AVAILABLE';
          availableCount++;
        }
      }

      matrix48.push({
        slotIndex: idx,
        slot: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        status,
        price,
        holdExpiresAt,
        countdownSeconds,
        isOperating,
      });
    }

    return {
      venueId,
      venueName: venue.name,
      venueType: venue.type,
      date: dateStr,
      operatingHours: {
        openTime: openTimeStr,
        closeTime: closeTimeStr,
      },
      slots,
      matrix48,
      summary: {
        total48: 48,
        availableCount,
        heldCount,
        confirmedCount,
        maintenanceCount,
      },
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
   * Hủy đơn giữ chỗ / đặt chỗ (Mục 5 - POST /bookings/:id/cancel) - US-046
   * 1. Kiểm tra ownership / Staff / Admin
   * 2. Tính tỷ lệ hoàn tiền cancellationPolicy theo số giờ còn lại trước giờ bắt đầu:
   *    - > 24h: Hoàn tiền 100% (refundRate = 1.0)
   *    - 2h - 24h: Hoàn tiền 50% (refundRate = 0.5)
   *    - < 2h: Không hoàn tiền (refundRate = 0.0)
   * 3. Lưu refundRate & refundAmount vào DB, phát sự kiện BOOKING_CANCELLED
   */
  async cancelBooking(bookingId: string, userOrUserId: any, cancelReason?: string, refDate?: Date): Promise<any> {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    // 1. Kiểm tra quyền sở hữu hoặc quyền nhân viên quầy / quản trị
    const userId = typeof userOrUserId === 'object'
      ? (userOrUserId?.userId || userOrUserId?._id?.toString() || userOrUserId?.id)
      : userOrUserId;
    const role = typeof userOrUserId === 'object' ? userOrUserId?.role : undefined;
    const isStaffOrAdmin = role === UserRole.STAFF || role === UserRole.ADMIN || role === 'STAFF' || role === 'ADMIN';
    const isOwner = booking.userId?.toString() === userId;

    if (!isStaffOrAdmin && !isOwner) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền hủy đơn đặt này',
      });
    }

    if (booking.status !== BookingStatus.HELD && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Không thể hủy đơn đang ở trạng thái ${booking.status}`);
    }

    // 2. Tính toán chính sách hoàn tiền cancellationPolicy nếu đơn đã CONFIRMED (US-046)
    const venue = booking.venueId as any;
    const policy = booking.policySnapshot || venue?.cancellationPolicy || {
      hoursBeforeForFullRefund: 24,
      hoursBeforeForNoRefund: 2,
    };

    let refundRate = 1.0;
    let refundAmount = booking.totalPrice;

    if (booking.status === BookingStatus.CONFIRMED) {
      const [startH, startM] = (booking.startTime || '00:00').split(':').map(Number);
      const dateStr = booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString().split('T')[0]
        : String(booking.bookingDate).split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const slotStartTime = new Date(year, month - 1, day, startH || 0, startM || 0, 0, 0);
      const now = refDate || new Date();
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
    booking.refundRate = refundRate;
    booking.refundAmount = refundAmount;
    if (cancelReason) {
      booking.refundNote = cancelReason;
    }
    const updated = await booking.save();

    // Cập nhật trạng thái slot trong bookingSlotModel
    await this.bookingSlotModel.updateMany(
      { bookingId: booking._id },
      { $set: { status: BookingStatus.CANCELLED } },
    );

    // Broadcast giải phóng slot sang AVAILABLE
    const dateStr = booking.bookingDate instanceof Date
      ? booking.bookingDate.toISOString().split('T')[0]
      : String(booking.bookingDate).split('T')[0];

    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: (venue?._id || booking.venueId).toString(),
      bookingDate: dateStr,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: BookingStatus.CANCELLED,
    });

    // Phát Domain Event cho các module khác (Mục 4.1 & US-046)
    try {
      this.eventEmitter?.emit(
        BOOKING_EVENTS.CANCELLED,
        new BookingCancelledEvent(
          updated,
          cancelReason || 'Khách yêu cầu hủy đơn',
          userId,
          refundRate,
          refundAmount,
        ),
      );
    } catch (e) {
      this.logger.warn(`Lỗi khi emit BOOKING_CANCELLED: ${e.message}`);
    }

    const resObj = updated.toObject ? updated.toObject() : updated;
    return {
      ...resObj,
      refundRate,
      refundAmount,
      cancellationPolicy: policy,
    };
  }

  /**
   * Cứu đơn trễ thanh toán (US-013: Late Webhook / Bank Payment Recovery)
   * Kịch bản:
   * - Khách thực hiện thanh toán online nhưng tiền về chậm sau 10 phút (booking đã chuyển EXPIRED).
   * - Khi webhook/ngân hàng xác nhận thanh toán thành công:
   *   + Nếu slot còn trống: Khôi phục lại slot với status CONFIRMED, emit BOOKING_CONFIRMED.
   *   + Nếu slot đã bị người khác đặt mất: Chuyển booking sang REFUND_PENDING, hoàn cọc 100%, emit BOOKING_CANCELLED.
   */
  async restoreExpiredHoldForLatePayment(
    bookingId: string,
    userOrUserId?: any,
    paymentDetails?: any,
  ): Promise<{
    success: boolean;
    action: 'CONFIRMED' | 'REFUND_PENDING' | 'ALREADY_CONFIRMED';
    reason?: string;
    refundRate?: number;
    refundAmount?: number;
    conflictingUnit?: string;
    booking: BookingDocument;
    message: string;
  }> {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
    }

    // Kiểm tra quyền (nếu có user truyền vào từ HTTP request)
    if (userOrUserId) {
      const userId = typeof userOrUserId === 'object'
        ? (userOrUserId?.userId || userOrUserId?._id?.toString() || userOrUserId?.id)
        : userOrUserId;
      const role = typeof userOrUserId === 'object' ? userOrUserId?.role : undefined;
      const isStaffOrAdmin = role === UserRole.STAFF || role === UserRole.ADMIN || role === 'STAFF' || role === 'ADMIN';
      const isOwner = booking.userId?.toString() === userId;

      if (!isStaffOrAdmin && !isOwner) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'FORBIDDEN',
          message: 'Bạn không có quyền khôi phục hoặc cứu đơn đặt này',
        });
      }
    }

    // Nếu đơn đã được xác nhận trước đó
    if (booking.status === BookingStatus.CONFIRMED) {
      return {
        success: true,
        action: 'ALREADY_CONFIRMED',
        booking,
        message: 'Đơn đặt chỗ đã ở trạng thái xác nhận thành công trước đó.',
      };
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã bị khách hàng hủy, không thể thực hiện cứu đơn.');
    }

    if (booking.status === BookingStatus.REFUND_PENDING || booking.status === BookingStatus.REFUNDED) {
      throw new BadRequestException('Đơn hàng đang/đã trong tiến trình hoàn tiền, không thể cứu đơn.');
    }

    const venue = booking.venueId as any;
    const leafUnits = this.resolveLeafUnits(venue);
    const slotBlocks = this.getSlotsForRange(booking.startTime, booking.endTime);
    const slotIndexes = slotBlocks.map((s) => s.slotIndex);
    const dateStr = booking.bookingDate instanceof Date
      ? booking.bookingDate.toISOString().split('T')[0]
      : String(booking.bookingDate).split('T')[0];
    const now = new Date();

    // 1. Kiểm tra xem có đơn khác đã chiếm bất kỳ slot nào trong khung giờ không
    const occupiedSlot = await this.bookingSlotModel.findOne({
      unitId: { $in: leafUnits },
      date: dateStr,
      slotIndex: { $in: slotIndexes },
      bookingId: { $ne: booking._id },
      $or: [
        { status: BookingStatus.CONFIRMED },
        { status: BookingStatus.HELD, holdExpiresAt: { $gt: now } },
      ],
    }).exec();

    const occupiedBooking = await this.bookingModel.findOne({
      _id: { $ne: booking._id },
      venueId: venue._id,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      $or: [
        { status: BookingStatus.CONFIRMED },
        { status: BookingStatus.HELD, holdExpiresAt: { $gt: now } },
      ],
    }).exec();

    // 2. TRƯỜNG HỢP B: SLOT ĐÃ BỊ CHIẾM MẤT (SLOTS_TAKEN) -> KÍCH HOẠT HOÀN TIỀN 100% (US-013 / US-046)
    if (occupiedSlot || occupiedBooking) {
      booking.status = BookingStatus.REFUND_PENDING;
      booking.refundRate = 1.0;
      booking.refundAmount = booking.totalPrice;
      booking.refundNote = 'Cứu đơn thất bại: Khung giờ đã có khách hàng khác đặt trong thời gian trễ thanh toán. Đã kích hoạt chờ hoàn cọc 100%.';
      if (paymentDetails?.paymentMethod) {
        booking.paymentMethod = paymentDetails.paymentMethod;
      }
      const savedRefundPending = await booking.save();

      // Dọn dẹp bản ghi slot cũ của đơn này trong bookingSlotModel để tránh rác
      await this.bookingSlotModel.deleteMany({ bookingId: booking._id });

      // Phát Domain Event CANCELLED với refundRate 1.0 để module Payments/Refund lắng nghe hoàn tiền
      try {
        this.eventEmitter?.emit(
          BOOKING_EVENTS.CANCELLED,
          new BookingCancelledEvent(
            savedRefundPending,
            'LATE_PAYMENT_SLOT_TAKEN: Khung giờ đã bị chiếm, tự động hoàn cọc 100%',
            typeof userOrUserId === 'object' ? userOrUserId?.userId : (userOrUserId || 'SYSTEM'),
            1.0,
            booking.totalPrice,
          ),
        );
      } catch (e) {
        this.logger.warn(`Lỗi khi emit BOOKING_CANCELLED trong cứu đơn: ${e.message}`);
      }

      return {
        success: false,
        action: 'REFUND_PENDING',
        reason: 'SLOTS_TAKEN',
        refundRate: 1.0,
        refundAmount: booking.totalPrice,
        conflictingUnit: occupiedSlot?.unitId || 'VENUE_SLOT',
        booking: savedRefundPending,
        message: 'Khung giờ đã có khách hàng khác đặt trong thời gian trễ thanh toán. Hệ thống đã tự động chuyển đơn sang trạng thái chờ hoàn cọc 100% (US-013 / US-046).',
      };
    }

    // 3. TRƯỜNG HỢP A: KHUNG GIỜ VẪN CÒN TRỐNG -> CỨU ĐƠN THÀNH CÔNG, CHUYỂN CONFIRMED
    try {
      // Xóa các bản ghi slot cũ (EXPIRED / HELD) của đơn này
      await this.bookingSlotModel.deleteMany({ bookingId: booking._id });

      const slotDocs: any[] = [];
      for (const unit of leafUnits) {
        for (const s of slotBlocks) {
          slotDocs.push({
            bookingId: booking._id,
            venueId: venue._id,
            unitId: unit,
            date: dateStr,
            slotIndex: s.slotIndex,
            startTime: s.startTime,
            endTime: s.endTime,
            status: BookingStatus.CONFIRMED,
          });
        }
      }
      await this.bookingSlotModel.insertMany(slotDocs);

      booking.status = BookingStatus.CONFIRMED;
      booking.holdExpiresAt = undefined;
      if (paymentDetails?.paymentMethod) {
        booking.paymentMethod = paymentDetails.paymentMethod;
      }
      if (!booking.ticketCode) {
        booking.ticketCode = `TK-${booking.bookingCode || booking._id.toString().substring(0, 8).toUpperCase()}`;
      }
      const savedConfirmed = await booking.save();

      // Broadcast Socket.io tới quầy và client
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: (venue?._id || booking.venueId).toString(),
        bookingDate: dateStr,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: BookingStatus.CONFIRMED,
      });

      // Phát Domain Event CONFIRMED
      try {
        this.eventEmitter?.emit(BOOKING_EVENTS.CONFIRMED, new BookingConfirmedEvent(savedConfirmed));
      } catch (e) {
        this.logger.warn(`Lỗi khi emit BOOKING_CONFIRMED trong cứu đơn: ${e.message}`);
      }

      return {
        success: true,
        action: 'CONFIRMED',
        booking: savedConfirmed,
        message: 'Cứu đơn thành công! Khung giờ còn trống và đã được kích hoạt xác nhận đặt sân (US-013).',
      };
    } catch (err: any) {
      if (err?.code === 11000 || err?.name === 'MongoServerError') {
        // Xử lý xung đột tức thời (Race Condition)
        booking.status = BookingStatus.REFUND_PENDING;
        booking.refundRate = 1.0;
        booking.refundAmount = booking.totalPrice;
        booking.refundNote = 'Cứu đơn thất bại do xung đột tức thời (Race Condition). Đã kích hoạt hoàn cọc 100%.';
        const savedRaceRefund = await booking.save();

        try {
          this.eventEmitter?.emit(
            BOOKING_EVENTS.CANCELLED,
            new BookingCancelledEvent(
              savedRaceRefund,
              'RACE_CONDITION_SLOT_TAKEN: Tranh chấp tức thời, hoàn cọc 100%',
              typeof userOrUserId === 'object' ? userOrUserId?.userId : (userOrUserId || 'SYSTEM'),
              1.0,
              booking.totalPrice,
            ),
          );
        } catch (e) {}

        return {
          success: false,
          action: 'REFUND_PENDING',
          reason: 'SLOTS_TAKEN_RACE',
          refundRate: 1.0,
          refundAmount: booking.totalPrice,
          booking: savedRaceRefund,
          message: 'Khung giờ vừa bị chiếm chỗ ngay tại thời điểm cứu đơn. Hệ thống tự động chuyển sang hoàn cọc 100%.',
        };
      }
      throw err;
    }
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

      // Cập nhật slot trong bookingSlotModel
      await this.bookingSlotModel.updateMany(
        { bookingId: b._id },
        { $set: { status: BookingStatus.EXPIRED } },
      );

      // Broadcast giải phóng slot
      const dateStr = b.bookingDate.toISOString().split('T')[0];
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: b.venueId.toString(),
        bookingDate: dateStr,
        startTime: b.startTime,
        endTime: b.endTime,
        status: BookingStatus.EXPIRED,
      });

      try {
        this.eventEmitter?.emit(
          BOOKING_EVENTS.EXPIRED,
          new BookingExpiredEvent(b._id.toString(), b.venueId?.toString(), b.bookingDate, b.startTime),
        );
      } catch (e) {
        this.logger.warn(`Lỗi khi emit BOOKING_EXPIRED: ${e.message}`);
      }
    }

    return expiredBookings.length;
  }

  /**
   * Đặt nhanh tại quầy (Walk-in) - Mục 4.3 của spec kết hợp Composite Pitches Check
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

    const policySnapshot = venue.cancellationPolicy || {
      hoursBeforeForFullRefund: 24,
      hoursBeforeForNoRefund: 2,
    };
    const priceSnapshot = {
      basePricePerHour: venue.basePricePerHour,
      appliedPricePerHour: totalPrice,
      pricingRules: venue.pricingRules || null,
    };
    const bookingCode = this.generateBookingCode(dto.bookingDate);
    const leafUnits = this.resolveLeafUnits(venue);
    const slotBlocks = this.getSlotsForRange(dto.startTime, dto.endTime);
    const slotIndexes = slotBlocks.map((s) => s.slotIndex);
    const now = new Date();

    // Kiểm tra DB trước khi lưu walk-in
    const occupiedSlot = await this.bookingSlotModel
      .findOne({
        unitId: { $in: leafUnits },
        date: dto.bookingDate,
        slotIndex: { $in: slotIndexes },
        $or: [
          { status: BookingStatus.CONFIRMED },
          { status: BookingStatus.HELD, holdExpiresAt: { $gt: now } },
        ],
      })
      .exec();

    if (occupiedSlot) {
      const isSelf = occupiedSlot.unitId === venue._id.toString();
      throw new ConflictException({
        statusCode: 409,
        errorCode: isSelf ? 'SLOT_ALREADY_TAKEN_ONLINE' : 'COMPOSITE_SLOT_CONFLICT',
        message: isSelf
          ? 'Khung giờ này vừa có khách hàng trực tuyến giữ chỗ hoặc đặt thành công!'
          : `Xung đột sân ghép: Đơn vị thành phần hoặc liên đới [${occupiedSlot.unitId}] đã bị chiếm chỗ!`,
        conflictingUnit: occupiedSlot.unitId,
      });
    }

    try {
      const walkInBooking = new this.bookingModel({
        bookingCode,
        userId: null, // Walk-in không định danh
        venueId: new Types.ObjectId(dto.venueId),
        bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalPrice,
        priceSnapshot,
        policySnapshot,
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

      try {
        const slotDocs: any[] = [];
        for (const unit of leafUnits) {
          for (const s of slotBlocks) {
            slotDocs.push({
              bookingId: saved._id,
              venueId: saved.venueId,
              unitId: unit,
              date: dto.bookingDate,
              slotIndex: s.slotIndex,
              startTime: s.startTime,
              endTime: s.endTime,
              status: BookingStatus.CONFIRMED,
            });
          }
        }
        await this.bookingSlotModel.insertMany(slotDocs);
      } catch (slotErr: any) {
        await this.bookingModel.deleteOne({ _id: saved._id });
        await this.bookingSlotModel.deleteMany({ bookingId: saved._id });
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN_ONLINE',
          message: 'Khung giờ này vừa có khách hàng trực tuyến giữ chỗ hoặc đặt thành công!',
        });
      }

      // Broadcast Socket.io slot chuyển đỏ (CONFIRMED)
      this.eventsGateway.broadcastSlotStatusChanged({
        venueId: dto.venueId,
        bookingDate: dto.bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: BookingStatus.CONFIRMED,
      });

      // Phát Domain Event cho các module khác (Mục 4.1)
      try {
        this.eventEmitter?.emit(BOOKING_EVENTS.CONFIRMED, new BookingConfirmedEvent(saved));
      } catch (e) {
        this.logger.warn(`Lỗi khi emit BOOKING_CONFIRMED: ${e.message}`);
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

  /**
   * Xác nhận thanh toán & chuyển trạng thái đơn sang CONFIRMED (Mục 4.1 - Domain Event Contract)
   */
  async confirmBooking(bookingId: string, paymentDetails?: any): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
    }
    if (booking.status === BookingStatus.CONFIRMED) {
      return booking;
    }

    booking.status = BookingStatus.CONFIRMED;
    if (paymentDetails?.paymentMethod) {
      booking.paymentMethod = paymentDetails.paymentMethod;
    }
    const saved = await booking.save();

    await this.bookingSlotModel.updateMany(
      { bookingId: saved._id },
      { $set: { status: BookingStatus.CONFIRMED } },
    );

    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: (saved.venueId as any)?._id?.toString() || saved.venueId.toString(),
      bookingDate: new Date(saved.bookingDate).toISOString().split('T')[0],
      startTime: saved.startTime,
      endTime: saved.endTime,
      status: BookingStatus.CONFIRMED,
    });

    try {
      this.eventEmitter?.emit(BOOKING_EVENTS.CONFIRMED, new BookingConfirmedEvent(saved));
    } catch (e) {
      this.logger.warn(`Lỗi khi emit BOOKING_CONFIRMED: ${e.message}`);
    }

    return saved;
  }

  /**
   * Sinh danh sách các ngày trong chuỗi định kỳ (Mục FR-04, US-027)
   */
  generateRecurringDates(startDateStr: string, weekCount: number, daysOfWeek?: number[]): string[] {
    const dates: string[] = [];
    const [y, m, d] = startDateStr.split('-').map(Number);
    const startObj = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

    if (!daysOfWeek || daysOfWeek.length === 0) {
      for (let i = 0; i < weekCount; i++) {
        const nextDate = new Date(startObj.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        dates.push(nextDate.toISOString().slice(0, 10));
      }
      return dates;
    }

    const sortedDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const startDayOfWeek = startObj.getUTCDay();

    for (let w = 0; w < weekCount; w++) {
      for (const targetDay of sortedDays) {
        const diffDays = targetDay - startDayOfWeek + w * 7;
        if (diffDays < 0) continue;
        const targetDate = new Date(startObj.getTime() + diffDays * 24 * 60 * 60 * 1000);
        dates.push(targetDate.toISOString().slice(0, 10));
      }
    }
    return dates;
  }

  /**
   * Kiểm tra tính khả dụng & phát hiện xung đột lịch chuỗi định kỳ (Dry-run)
   */
  async checkRecurringAvailability(dto: RecurringBookingDto) {
    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    const dates = this.generateRecurringDates(dto.startDate, dto.weekCount, dto.daysOfWeek);
    const leafUnits = this.resolveLeafUnits(venue);
    const slotBlocks = this.getSlotsForRange(dto.startTime, dto.endTime);
    const slotIndexes = slotBlocks.map((s) => s.slotIndex);
    const now = new Date();

    const conflicts: any[] = [];
    const availableDates: string[] = [];

    for (const dateStr of dates) {
      // Dọn dẹp sơ bộ slot HELD quá hạn
      await this.bookingSlotModel.updateMany(
        {
          unitId: { $in: leafUnits },
          date: dateStr,
          slotIndex: { $in: slotIndexes },
          status: BookingStatus.HELD,
          holdExpiresAt: { $lte: now },
        },
        { $set: { status: BookingStatus.EXPIRED } },
      );

      const occupiedSlot = await this.bookingSlotModel
        .findOne({
          unitId: { $in: leafUnits },
          date: dateStr,
          slotIndex: { $in: slotIndexes },
          $or: [
            { status: BookingStatus.CONFIRMED },
            { status: BookingStatus.HELD, holdExpiresAt: { $gt: now } },
          ],
        })
        .exec();

      if (occupiedSlot) {
        conflicts.push({
          date: dateStr,
          startTime: dto.startTime,
          endTime: dto.endTime,
          conflictingUnit: occupiedSlot.unitId,
          reason: `Khung giờ này hoặc sân thành phần [${occupiedSlot.unitId}] đã có người giữ chỗ hoặc đặt trước`,
        });
      } else {
        availableDates.push(dateStr);
      }
    }

    const durationHours = (this.timeToSlotIndex(dto.endTime) - this.timeToSlotIndex(dto.startTime)) * 0.5;
    let pricePerHour = venue.basePricePerHour;
    if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
      const peak = venue.pricingRules.peakHours.find(
        (p: any) => dto.startTime >= p.startTime && dto.startTime < p.endTime,
      );
      if (peak && typeof peak.price === 'number') {
        pricePerHour = peak.price;
      }
    }
    const pricePerSession = pricePerHour * (durationHours > 0 ? durationHours : 1);
    const totalPrice = pricePerSession * dates.length;

    const checkedDates = dates.map((d) => {
      const conflict = conflicts.find((c) => c.date === d);
      return {
        date: d,
        isAvailable: !conflict,
        conflictReason: conflict ? conflict.reason : undefined,
      };
    });

    return {
      venueId: dto.venueId,
      venueName: venue.name,
      totalSessions: dates.length,
      totalSessionsRequested: dates.length,
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      totalPrice,
      conflicts,
      availableDates,
      checkedDates,
    };
  }

  /**
   * Đặt sân định kỳ theo tuần (Mục FR-04, US-027)
   */
  async createRecurringBooking(userId: string | null, dto: RecurringBookingDto, isWalkIn = false) {
    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân');
    }

    // 1. Quét kiểm tra toàn bộ chuỗi
    const checkResult = await this.checkRecurringAvailability(dto);
    if (checkResult.hasConflict) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'RECURRING_DATES_CONFLICT',
        message: `Phát hiện xung đột lịch tại ${checkResult.conflictCount}/${checkResult.totalSessionsRequested} buổi trong chuỗi định kỳ!`,
        conflicts: checkResult.conflicts,
        availableDates: checkResult.availableDates,
      });
    }

    const dates = checkResult.availableDates;
    const leafUnits = this.resolveLeafUnits(venue);
    const slotBlocks = this.getSlotsForRange(dto.startTime, dto.endTime);

    // Tính giá mỗi buổi
    let pricePerHour = venue.basePricePerHour;
    if (venue.pricingRules?.peakHours && Array.isArray(venue.pricingRules.peakHours)) {
      const peak = venue.pricingRules.peakHours.find(
        (p: any) => dto.startTime >= p.startTime && dto.startTime < p.endTime,
      );
      if (peak && typeof peak.price === 'number') {
        pricePerHour = peak.price;
      }
    }
    const singleSessionPrice = pricePerHour * 1;
    const totalPrice = singleSessionPrice * dates.length;

    const policySnapshot = venue.cancellationPolicy || {
      hoursBeforeForFullRefund: 24,
      hoursBeforeForNoRefund: 2,
    };
    const priceSnapshot = {
      basePricePerHour: venue.basePricePerHour,
      appliedPricePerHour: pricePerHour,
      pricingRules: venue.pricingRules || null,
      recurringDiscount: 0,
    };

    const randGroup = Math.random().toString(36).substring(2, 6).toUpperCase();
    const recurringGroupId = `REC-${dto.startDate.replace(/-/g, '')}-${randGroup}`;

    const now = new Date();
    // 15 phút giữ chỗ cho chuỗi định kỳ
    const holdExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const bookingStatus = isWalkIn ? BookingStatus.CONFIRMED : BookingStatus.HELD;
    const bookingSource = isWalkIn ? BookingSource.WALK_IN : BookingSource.APP;

    const createdBookings: BookingDocument[] = [];
    const allSlotDocs: any[] = [];

    try {
      for (const dateStr of dates) {
        const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);
        const bookingCode = this.generateBookingCode(dateStr);

        const newBooking = new this.bookingModel({
          bookingCode,
          userId: userId ? new Types.ObjectId(userId) : null,
          venueId: new Types.ObjectId(dto.venueId),
          bookingDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          totalPrice: singleSessionPrice,
          priceSnapshot,
          policySnapshot,
          isRecurring: true,
          recurringGroupId,
          bookingSource,
          status: bookingStatus,
          holdExpiresAt: isWalkIn ? undefined : holdExpiresAt,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          paymentMethod: dto.paymentMethod,
        });

        const saved = await newBooking.save();
        createdBookings.push(saved);

        for (const unit of leafUnits) {
          for (const s of slotBlocks) {
            allSlotDocs.push({
              bookingId: saved._id,
              venueId: saved.venueId,
              unitId: unit,
              date: dateStr,
              slotIndex: s.slotIndex,
              startTime: s.startTime,
              endTime: s.endTime,
              status: bookingStatus,
              holdExpiresAt: isWalkIn ? undefined : holdExpiresAt,
            });
          }
        }
      }

      await this.bookingSlotModel.insertMany(allSlotDocs);

      // Broadcast Socket.io cho từng buổi
      for (const b of createdBookings) {
        this.eventsGateway.broadcastSlotStatusChanged({
          venueId: dto.venueId,
          bookingDate: b.bookingDate.toISOString().split('T')[0],
          startTime: b.startTime,
          endTime: b.endTime,
          status: bookingStatus,
          holdExpiresAt: isWalkIn ? undefined : holdExpiresAt,
        });

        try {
          if (bookingStatus === BookingStatus.CONFIRMED) {
            this.eventEmitter?.emit(BOOKING_EVENTS.CONFIRMED, new BookingConfirmedEvent(b));
          } else {
            this.eventEmitter?.emit(BOOKING_EVENTS.HELD, new BookingHeldEvent(b));
          }
        } catch (e) {
          this.logger.warn(`Lỗi khi emit recurring booking event: ${e.message}`);
        }
      }

      return {
        recurringGroupId,
        weekCount: dto.weekCount,
        totalSessions: createdBookings.length,
        totalPrice,
        status: bookingStatus,
        holdExpiresAt: isWalkIn ? undefined : holdExpiresAt,
        bookings: createdBookings,
      };
    } catch (err: any) {
      // Rollback toàn bộ chuỗi nếu phát sinh lỗi
      const createdIds = createdBookings.map((b) => b._id);
      if (createdIds.length > 0) {
        await this.bookingModel.deleteMany({ _id: { $in: createdIds } });
        await this.bookingSlotModel.deleteMany({ bookingId: { $in: createdIds } });
      }
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'RECURRING_CREATION_FAILED',
        message: 'Không thể khởi tạo chuỗi định kỳ do phát sinh xung đột trong quá trình ghi dữ liệu',
      });
    }
  }

  /**
   * Lấy danh sách các buổi đặt theo recurringGroupId
   */
  async getRecurringGroupBookings(recurringGroupId: string): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ recurringGroupId })
      .populate('venueId')
      .sort({ bookingDate: 1 })
      .exec();
  }
}
