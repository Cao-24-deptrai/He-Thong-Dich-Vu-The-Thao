import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { BookingStatus } from '../common/enums';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Sinh / làm mới qrToken động (JWT sống 60s) - Mục 4.5 của spec
   */
  async getOrRefreshQrToken(bookingId: string, userId: string) {
    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    if (booking.userId?.toString() !== userId) {
      throw new ConflictException('Bạn không có quyền xem vé của đơn này');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Chỉ đơn đã thanh toán thành công (CONFIRMED) mới có mã QR vé. Trạng thái hiện tại: ${booking.status}`,
      );
    }

    // Sinh JWT payload với jti duy nhất, sống 60 giây (Mục 4.5.1)
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
   * Quét mã QR check-in tại quầy - Mục 4.5 của spec
   */
  async scanCheckin(qrToken: string) {
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

    const booking = await this.bookingModel.findById(bookingId).populate('venueId').exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt chỗ');
    }

    // Kiểm tra chống quét trùng (Mục 4.5.3)
    if (booking.isCheckedIn) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'ALREADY_CHECKED_IN',
        message: `Vé này đã được check-in vào lúc ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleTimeString() : 'trước đó'}!`,
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
    booking.checkedInAt = new Date();
    await booking.save();

    this.logger.log(`✅ Quét check-in thành công cho booking ${booking._id}`);

    return {
      success: true,
      message: 'Check-in thành công! Chúc quý khách chơi thể thao vui vẻ.',
      booking,
      bookingId: booking._id,
      checkedInAt: booking.checkedInAt,
      venueName: (booking.venueId as any)?.name,
      timeSlot: `${booking.startTime} - ${booking.endTime}`,
    };
  }
}
