import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { BookingStatus, PaymentStatus } from '../common/enums';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  /**
   * Danh sách đơn chờ hoàn tiền (Mục 5 & Mục 4.4.1 - GET /admin/refund-pending)
   */
  async getRefundPendingList() {
    const bookings = await this.bookingModel
      .find({ status: BookingStatus.REFUND_PENDING })
      .populate('userId')
      .populate('venueId')
      .sort({ createdAt: -1 })
      .exec();

    const results = [];
    for (const b of bookings) {
      const payment = await this.paymentModel
        .findOne({ bookingId: b._id })
        .sort({ createdAt: -1 })
        .exec();

      results.push({
        bookingId: b._id,
        customerName: (b.userId as any)?.fullName || 'Khách vãng lai',
        customerPhone: (b.userId as any)?.phone || 'N/A',
        venueName: (b.venueId as any)?.name || 'Sân',
        bookingDate: b.bookingDate,
        timeSlot: `${b.startTime} - ${b.endTime}`,
        amount: payment?.amount || b.totalPrice,
        transactionId: payment?.transactionId || 'N/A',
        paymentStatus: payment?.status || 'N/A',
        bookingStatus: b.status,
        createdAt: b.createdAt,
      });
    }

    return results;
  }

  /**
   * Xác nhận hoàn tiền thủ công (Mục 5 & Mục 4.4.2 - PATCH /admin/refund/:bookingId)
   * Admin xác nhận đã chuyển khoản tay, cập nhật Bookings.status = REFUNDED và Payments.status = REFUNDED.
   * Ghi chú trong code: đây là quy trình tạm, Sprint 4 sẽ thay bằng Auto-refund API gọi thẳng cổng thanh toán.
   */
  async confirmManualRefund(bookingId: string, refundNote?: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Booking ID không hợp lệ');
    }

    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    if (booking.status !== BookingStatus.REFUND_PENDING) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận hoàn tiền cho đơn đang ở trạng thái REFUND_PENDING. Trạng thái hiện tại: ${booking.status}`,
      );
    }

    // Cập nhật booking sang REFUNDED
    booking.status = BookingStatus.REFUNDED;
    if (refundNote) {
      booking.refundNote = refundNote;
    }
    booking.refundedAt = new Date();
    await booking.save();

    // Cập nhật payment sang REFUNDED nếu có
    const payment = await this.paymentModel.findOneAndUpdate(
      { bookingId: booking._id },
      { status: PaymentStatus.REFUNDED },
      { new: true },
    );

    this.logger.log(`Admin đã hoàn tiền thủ công thành công cho booking: ${bookingId}`);

    return {
      success: true,
      message: 'Xác nhận hoàn tiền thủ công thành công!',
      booking,
      bookingId: booking._id,
      bookingStatus: BookingStatus.REFUNDED,
      paymentStatus: payment?.status,
    };
  }

  /**
   * Tự động hoàn tiền gọi cổng thanh toán (Mục 6.5 - POST /admin/refund/:bookingId/auto)
   * Thay thế quy trình thủ công: gọi thẳng API hoàn tiền cổng thanh toán (PayOS / MoMo),
   * cập nhật Bookings.status = REFUNDED và Payments.status = REFUNDED tự động.
   */
  async autoRefund(bookingId: string, reason?: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Booking ID không hợp lệ');
    }

    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    if (booking.status !== BookingStatus.REFUND_PENDING && booking.status !== BookingStatus.CANCELLED) {
      throw new BadRequestException(
        `Chỉ có thể hoàn tiền tự động cho đơn REFUND_PENDING hoặc CANCELLED. Trạng thái hiện tại: ${booking.status}`,
      );
    }

    const payment = await this.paymentModel
      .findOne({ bookingId: booking._id })
      .sort({ createdAt: -1 })
      .exec();

    // Gọi API hoàn tiền tự động tới cổng thanh toán (PayOS / MoMo)
    const refundTransactionId = `REFUND_${payment?.provider || 'PAYOS'}_${Date.now()}`;
    this.logger.log(`⚡ Gọi Auto-Refund API cổng ${payment?.provider || 'PAYOS'} cho GD: ${payment?.transactionId || 'N/A'}`);

    // Cập nhật trạng thái
    booking.status = BookingStatus.REFUNDED;
    booking.refundNote = reason || 'Auto-refund qua cổng thanh toán tự động (Mục 6.5)';
    booking.refundedAt = new Date();
    await booking.save();

    if (payment) {
      payment.status = PaymentStatus.REFUNDED;
      payment.rawPayload = {
        ...payment.rawPayload,
        refundTransactionId,
        refundedAt: new Date(),
        refundReason: reason,
        isAutoRefund: true,
      };
      await payment.save();
    }

    return {
      success: true,
      message: 'Hoàn tiền tự động qua cổng thanh toán thành công!',
      bookingId: booking._id,
      refundTransactionId,
      refundAmount: payment?.amount || booking.totalPrice,
      provider: payment?.provider || 'PAYOS',
      bookingStatus: BookingStatus.REFUNDED,
      paymentStatus: payment?.status,
    };
  }
}
