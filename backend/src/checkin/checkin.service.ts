import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { BookingStatus, UserRole } from '../common/enums';
import { EventsGateway } from '../events/events.gateway';
import { ManualCheckinDto, LookupCheckinDto } from './dto/manual-checkin.dto';
import { BOOKING_EVENTS, BookingCheckedInEvent } from '../bookings/events/booking-events';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    @Optional() private eventsGateway?: EventsGateway,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Sinh / làm mới qrToken động (JWT sống 60s) - Siết chặt theo Changelog Item 2 & Bước 3.1:
   */
  async getOrRefreshQrToken(
    bookingId: string,
    userOrUserId: string | { userId?: string; id?: string; role?: string },
  ) {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    const userId = typeof userOrUserId === 'string' ? userOrUserId : (userOrUserId?.userId || userOrUserId?.id);
    const userRole = typeof userOrUserId === 'object' ? userOrUserId?.role : undefined;

    // 1. Kiểm tra quyền sở hữu (Staff/Admin có quyền hỗ trợ xem vé tại quầy)
    const isStaffOrAdmin = userRole === UserRole.STAFF || userRole === UserRole.ADMIN;
    if (!isStaffOrAdmin) {
      if (!userId || !booking.userId || booking.userId.toString() !== userId) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'FORBIDDEN',
          message: 'Bạn không có quyền xem vé của đơn này',
        });
      }
    }

    // 2. Kiểm tra trạng thái thanh toán (Trả tiền mới có vé)
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'PAYMENT_NOT_CONFIRMED',
        message: `Chỉ đơn đã thanh toán thành công (CONFIRMED) mới có mã QR vé. Trạng thái hiện tại: ${booking.status}`,
      });
    }

    // 3. Kiểm tra đã check-in chưa (Chặn dùng lại vé đã quét vào sân)
    if (booking.isCheckedIn === true) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'ALREADY_CHECKED_IN',
        message: 'Vé đã được check-in vào sân trước đó, không thể cấp mã QR mới',
      });
    }

    // 4. Chuẩn hóa mã vé (ticketCode)
    const ticketCode =
      booking.ticketCode ||
      booking.bookingCode ||
      `TCK-${booking._id.toString().slice(-6).toUpperCase()}`;

    if (!booking.ticketCode) {
      booking.ticketCode = ticketCode;
    }

    // 5. Sinh JWT payload với jti duy nhất, sống đúng 60 giây (Mục 4.5.1)
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
      bookingId: booking._id.toString(),
      ticketCode,
      bookingCode: booking.bookingCode,
      userId: booking.userId ? booking.userId.toString() : null,
      issuedAt,
      jti: randomUUID(),
    };

    const qrToken = this.jwtService.sign(payload, { expiresIn: '60s' });
    booking.qrToken = qrToken;
    await booking.save();

    const expiresAt = new Date(Date.now() + 60 * 1000);

    return {
      qrToken,
      expiresInSeconds: 60,
      expiresAt,
      ticketCode,
      bookingCode: booking.bookingCode,
      isCheckedIn: booking.isCheckedIn,
      checkedInAt: booking.checkedInAt,
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        ticketCode,
        venue: booking.venueId,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalPrice: booking.totalPrice,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
      },
    };
  }

  /**
   * Quét mã QR check-in tại quầy - Chống race condition đa cửa bằng Atomic findOneAndUpdate
   */
  async scanCheckin(qrToken: string, staffId?: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(qrToken);
    } catch (err) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'QR_TOKEN_EXPIRED',
        message: 'Mã QR đã hết hạn (quá 60s) hoặc không hợp lệ. Vui lòng mở lại ứng dụng để lấy mã mới!',
      });
    }

    const { bookingId } = decoded;
    if (!bookingId) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_QR_TOKEN',
        message: 'Mã QR không chứa thông tin đặt chỗ hợp lệ.',
      });
    }

    // ATOMIC UPDATE: Chỉ cập nhật nếu isCheckedIn === false và status === CONFIRMED
    const booking = await this.bookingModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(bookingId),
          isCheckedIn: false,
          status: BookingStatus.CONFIRMED,
        },
        {
          $set: {
            isCheckedIn: true,
            checkedInAt: new Date(),
            checkedInBy: staffId ? new Types.ObjectId(staffId) : undefined,
            checkinMethod: 'QR',
          },
        },
        { new: true },
      )
      .populate('venueId')
      .populate('userId')
      .exec();

    // Nếu không cập nhật được bản ghi nào -> Tìm nguyên nhân chính xác để báo lỗi chuẩn
    if (!booking) {
      const existing = await this.bookingModel.findById(bookingId).populate('venueId').exec();
      if (!existing) {
        throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
      }

      if (existing.isCheckedIn) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'ALREADY_CHECKED_IN',
          message: `Vé này đã được check-in vào lúc ${
            existing.checkedInAt ? new Date(existing.checkedInAt).toLocaleTimeString() : 'trước đó'
          }!`,
          checkedInAt: existing.checkedInAt,
        });
      }

      if (existing.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INVALID_BOOKING_STATUS',
          message: `Đơn đặt chỗ không ở trạng thái hợp lệ để vào sân (Trạng thái: ${existing.status})`,
        });
      }

      throw new BadRequestException('Không thể thực hiện check-in cho đơn đặt này.');
    }

    this.logger.log(`✅ Quét check-in thành công cho booking ${booking._id}`);

    // 1. Phát WebSocket realtime cho client
    try {
      this.eventsGateway?.broadcastBookingCheckedIn({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        ticketCode: booking.ticketCode,
        venueId: (booking.venueId as any)?._id?.toString(),
        venueName: (booking.venueId as any)?.name,
        bookingDate: booking.bookingDate ? new Date(booking.bookingDate).toISOString().split('T')[0] : '',
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: (booking.userId as any)?.fullName || booking.customerName || 'Khách hàng',
        customerPhone: (booking.userId as any)?.phone || booking.customerPhone || '',
        checkedInAt: booking.checkedInAt!,
        checkinMethod: 'QR',
      });
    } catch (e) {
      this.logger.warn(`Lỗi khi broadcast booking_checked_in: ${e.message}`);
    }

    // 2. Phát Domain Event nội bộ (Mục 4.1)
    try {
      this.eventEmitter?.emit(BOOKING_EVENTS.CHECKED_IN, new BookingCheckedInEvent(booking));
    } catch (e) {
      this.logger.warn(`Lỗi khi emit BOOKING_CHECKED_IN: ${e.message}`);
    }

    return {
      success: true,
      message: 'Check-in thành công! Chúc quý khách chơi thể thao vui vẻ.',
      booking,
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      ticketCode: booking.ticketCode,
      checkedInAt: booking.checkedInAt,
      venueName: (booking.venueId as any)?.name,
      timeSlot: `${booking.startTime} - ${booking.endTime}`,
      customerName: (booking.userId as any)?.fullName || booking.customerName || 'Khách hàng',
      customerPhone: (booking.userId as any)?.phone || booking.customerPhone || '',
      checkinMethod: 'QR',
    };
  }

  /**
   * Check-in thủ công tại quầy khi khách hết pin, hỏng điện thoại (US-041)
   */
  async manualCheckin(dto: ManualCheckinDto, staffId?: string) {
    if (!Types.ObjectId.isValid(dto.bookingId)) {
      throw new BadRequestException('Booking ID không hợp lệ');
    }

    const booking = await this.bookingModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(dto.bookingId),
          isCheckedIn: false,
          status: BookingStatus.CONFIRMED,
        },
        {
          $set: {
            isCheckedIn: true,
            checkedInAt: new Date(),
            checkedInBy: staffId ? new Types.ObjectId(staffId) : undefined,
            checkinMethod: 'MANUAL',
            manualCheckinNote: dto.note || 'Lễ tân xác minh thông tin khách tại quầy',
          },
        },
        { new: true },
      )
      .populate('venueId')
      .populate('userId')
      .exec();

    if (!booking) {
      const existing = await this.bookingModel.findById(dto.bookingId).populate('venueId').exec();
      if (!existing) {
        throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
      }

      if (existing.isCheckedIn) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'ALREADY_CHECKED_IN',
          message: `Vé này đã được check-in vào lúc ${
            existing.checkedInAt ? new Date(existing.checkedInAt).toLocaleTimeString() : 'trước đó'
          }!`,
          checkedInAt: existing.checkedInAt,
        });
      }

      if (existing.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INVALID_BOOKING_STATUS',
          message: `Đơn đặt chỗ không ở trạng thái hợp lệ để vào sân (Trạng thái: ${existing.status})`,
        });
      }

      throw new BadRequestException('Không thể thực hiện check-in thủ công.');
    }

    this.logger.log(`✅ Check-in thủ công thành công cho booking ${booking._id} bởi Staff ${staffId || 'Unknown'}`);

    // 1. Phát WebSocket realtime
    try {
      this.eventsGateway?.broadcastBookingCheckedIn({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        ticketCode: booking.ticketCode,
        venueId: (booking.venueId as any)?._id?.toString(),
        venueName: (booking.venueId as any)?.name,
        bookingDate: booking.bookingDate ? new Date(booking.bookingDate).toISOString().split('T')[0] : '',
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: (booking.userId as any)?.fullName || booking.customerName || 'Khách hàng',
        customerPhone: (booking.userId as any)?.phone || booking.customerPhone || '',
        checkedInAt: booking.checkedInAt!,
        checkinMethod: 'MANUAL',
      });
    } catch (e) {
      this.logger.warn(`Lỗi khi broadcast booking_checked_in: ${e.message}`);
    }

    // 2. Phát Domain Event nội bộ (Mục 4.1)
    try {
      this.eventEmitter?.emit(BOOKING_EVENTS.CHECKED_IN, new BookingCheckedInEvent(booking));
    } catch (e) {
      this.logger.warn(`Lỗi khi emit BOOKING_CHECKED_IN: ${e.message}`);
    }

    return {
      success: true,
      message: 'Check-in thủ công thành công!',
      booking,
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      ticketCode: booking.ticketCode,
      checkedInAt: booking.checkedInAt,
      venueName: (booking.venueId as any)?.name,
      timeSlot: `${booking.startTime} - ${booking.endTime}`,
      customerName: (booking.userId as any)?.fullName || booking.customerName || 'Khách hàng',
      customerPhone: (booking.userId as any)?.phone || booking.customerPhone || '',
      checkinMethod: 'MANUAL',
      note: dto.note,
    };
  }

  /**
   * Tra cứu đơn đặt chỗ phục vụ check-in thủ công tại quầy (US-041)
   */
  async lookupBookings(dto: LookupCheckinDto) {
    const filter: any = {
      status: BookingStatus.CONFIRMED,
    };

    if (dto.date) {
      const startOfDay = new Date(dto.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dto.date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      filter.bookingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (dto.query && dto.query.trim()) {
      const q = dto.query.trim();

      // Tìm user theo SĐT hoặc họ tên
      const matchedUsers = await this.userModel
        .find({
          $or: [
            { phone: { $regex: q, $options: 'i' } },
            { fullName: { $regex: q, $options: 'i' } },
          ],
        })
        .select('_id')
        .exec();

      const userIds = matchedUsers.map((u) => u._id);

      const orConditions: any[] = [
        { bookingCode: { $regex: q, $options: 'i' } },
        { ticketCode: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
      ];

      if (Types.ObjectId.isValid(q)) {
        orConditions.push({ _id: new Types.ObjectId(q) });
      }

      if (userIds.length > 0) {
        orConditions.push({ userId: { $in: userIds } });
      }

      filter.$or = orConditions;
    }

    const bookings = await this.bookingModel
      .find(filter)
      .populate('venueId')
      .populate('userId', 'fullName phone email')
      .sort({ bookingDate: 1, startTime: 1 })
      .limit(50)
      .exec();

    return bookings.map((b) => ({
      id: b._id,
      bookingCode: b.bookingCode,
      ticketCode: b.ticketCode,
      venueName: (b.venueId as any)?.name || 'Sân thể thao',
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      totalPrice: b.totalPrice,
      isCheckedIn: b.isCheckedIn,
      checkedInAt: b.checkedInAt,
      checkinMethod: b.checkinMethod,
      customerName: (b.userId as any)?.fullName || b.customerName || 'Khách vãng lai',
      customerPhone: (b.userId as any)?.phone || b.customerPhone || 'N/A',
      status: b.status,
    }));
  }
}
