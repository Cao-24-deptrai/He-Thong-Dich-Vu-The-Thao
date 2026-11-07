import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { BookingStatus } from '../common/enums';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private jwtService: JwtService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Sinh / làm mới qrToken động (JWT sống 60s) - Siết chặt theo Changelog Item 2:
   * 1. Quyền sở hữu (req.user.id === booking.userId) -> 403 Forbidden
   * 2. Trạng thái thanh toán (status === 'CONFIRMED') -> PAYMENT_NOT_CONFIRMED
   * 3. Chống dùng lại vé (isCheckedIn === true) -> ALREADY_CHECKED_IN
   * 4. Chỉ khi qua hết 3 bước trên mới sinh JWT mới (TTL 60s)
   */
  async getOrRefreshQrToken(bookingId: string, userId: string) {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    // 1. Kiểm tra quyền sở hữu
    if (booking.userId?.toString() !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Bạn không có quyền xem vé của đơn này',
      });
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

    // 4. Sinh JWT payload với jti duy nhất, sống 60 giây (Mục 4.5.1)
    const payload = {
      bookingId: booking._id.toString(),
      userId: booking.userId?.toString(),
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
      isCheckedIn: booking.isCheckedIn,
      checkedInAt: booking.checkedInAt,
      booking: {
        id: booking._id,
        venue: booking.venueId,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalPrice: booking.totalPrice,
      },
    };
  }

  /**
   * Quét mã QR check-in hoặc nhập mã vé tại quầy - Mục 4.5 của spec
   */
  async scanCheckin(param: string | { qrToken?: string; checkInCode?: string }) {
    let bookingId: string | null = null;
    let checkInCode: string | null = null;

    if (typeof param === 'string') {
      if (param.startsWith('PHANTA-') || param.startsWith('BK-')) {
        checkInCode = param;
      } else {
        try {
          const decoded = this.jwtService.verify(param);
          bookingId = decoded.bookingId;
        } catch (_) {
          checkInCode = param;
        }
      }
    } else {
      if (param.checkInCode) {
        checkInCode = param.checkInCode;
      } else if (param.qrToken) {
        if (param.qrToken.startsWith('PHANTA-') || param.qrToken.startsWith('BK-')) {
          checkInCode = param.qrToken;
        } else {
          try {
            const decoded = this.jwtService.verify(param.qrToken);
            bookingId = decoded.bookingId;
          } catch (err) {
            throw new BadRequestException({
              statusCode: 400,
              errorCode: 'QR_TOKEN_EXPIRED',
              message: 'Mã QR đã hết hạn (quá 60s) hoặc không hợp lệ. Vui lòng mở lại ứng dụng để lấy mã mới!',
            });
          }
        }
      }
    }

    let booking: BookingDocument | null = null;
    if (bookingId) {
      booking = await this.bookingModel.findById(bookingId).populate('venueId').populate('userId').exec();
    } else if (checkInCode) {
      booking = await this.bookingModel.findOne({ checkInCode }).populate('venueId').populate('userId').exec();
    }

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
    }

    // Kiểm tra chống quét trùng (Mục 4.5.3)
    if (booking.isCheckedIn || booking.status === BookingStatus.CHECKED_IN) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'ALREADY_CHECKED_IN',
        message: `Vé này đã được check-in vào lúc ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleTimeString('vi-VN') : 'trước đó'}!`,
        checkedInAt: booking.checkedInAt,
      });
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_BOOKING_STATUS',
        message: `Đơn đặt chỗ không ở trạng thái hợp lệ để vào sân (Trạng thái: ${booking.status})`,
      });
    }

    // Đánh dấu check-in thành công (Mục 4.5.3)
    booking.isCheckedIn = true;
    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = new Date();
    await booking.save();

    const customerName = (booking.userId as any)?.fullName || booking.customerName || 'Khách thể thao';
    const venueName = (booking.venueId as any)?.name || 'Sân Phanta';
    const timeSlot = `${booking.startTime} - ${booking.endTime}`;

    this.eventsGateway.broadcastCheckinSuccess({
      bookingId: booking._id.toString(),
      venueId: (booking.venueId as any)?._id?.toString() || booking.venueId?.toString(),
      customerName,
      timeSlot,
    });

    this.logger.log(`✅ Quét check-in thành công cho booking ${booking._id} (${checkInCode || bookingId})`);

    return {
      success: true,
      message: 'Check-in thành công! Cổng xoay Turnstile đã mở.',
      booking,
      bookingId: booking._id,
      checkInCode: booking.checkInCode,
      checkedInAt: booking.checkedInAt,
      customerName,
      venueName,
      timeSlot,
      status: BookingStatus.CHECKED_IN,
    };
  }
}
