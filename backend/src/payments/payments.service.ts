import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { EventsGateway } from '../events/events.gateway';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { PaymentProvider, PaymentStatus, BookingStatus } from '../common/enums';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private payosInstance: any = null;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private eventsGateway: EventsGateway,
  ) {
    const clientId = this.configService.get<string>('payos.clientId');
    const apiKey = this.configService.get<string>('payos.apiKey');
    const checksumKey = this.configService.get<string>('payos.checksumKey');

    if (clientId && apiKey && checksumKey) {
      try {
        const { PayOS } = require('@payos/node');
        this.payosInstance = new PayOS({ clientId, apiKey, checksumKey });
        this.logger.log('✅ PayOS SDK đã được khởi tạo thành công.');
      } catch (err) {
        this.logger.warn(`Không thể khởi tạo PayOS SDK: ${err.message}`);
      }
    } else {
      this.logger.log('ℹ️ PayOS chưa cấu hình credentials. Hệ thống đang chạy chế độ Sandbox/Mock Payment Gateway.');
    }
  }

  /**
   * Sinh link/QR thanh toán (Mục 5 - POST /payments/create-link)
   */
  async createPaymentLink(userId: string, dto: CreatePaymentLinkDto) {
    const booking = await this.bookingModel.findById(dto.bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt');
    }

    if (booking.userId?.toString() !== userId) {
      throw new BadRequestException('Bạn không có quyền thanh toán cho đơn này');
    }

    const now = new Date();
    if (booking.status === BookingStatus.HELD && booking.holdExpiresAt && booking.holdExpiresAt <= now) {
      booking.status = BookingStatus.EXPIRED;
      await booking.save();
      throw new BadRequestException('Đơn giữ chỗ đã hết hạn 10 phút, vui lòng đặt lại khung giờ mới');
    }

    if (booking.status !== BookingStatus.HELD) {
      throw new BadRequestException(`Không thể thanh toán cho đơn đang ở trạng thái ${booking.status}`);
    }

    const orderCode = Number(String(Date.now()).slice(-6));
    const description = `BOOKING_${booking._id.toString().slice(-8)}`;

    // Kiểm tra xem đã có bản ghi thanh toán INIT chưa
    let payment = await this.paymentModel.findOne({
      bookingId: booking._id,
      status: PaymentStatus.INIT,
    }).exec();

    const selectedProvider = dto.provider?.toUpperCase() === 'MOMO' ? PaymentProvider.MOMO : PaymentProvider.PAYOS;

    if (!payment) {
      payment = new this.paymentModel({
        bookingId: booking._id,
        amount: booking.totalPrice,
        provider: selectedProvider,
        status: PaymentStatus.INIT,
      });
      await payment.save();
    } else if (dto.provider) {
      payment.provider = selectedProvider;
      await payment.save();
    }

    if (selectedProvider === PaymentProvider.MOMO) {
      const momoPayUrl = `https://test-payment.momo.vn/v2/gateway/pay?orderId=MOMO_${orderCode}`;
      const momoQr = `2|99|0911223344|MoMo Sports Booking|support@sportsbooking.vn|0|0|${booking.totalPrice}|${description}|transfer_myqr`;
      return {
        paymentId: payment._id,
        orderCode,
        provider: PaymentProvider.MOMO,
        checkoutUrl: momoPayUrl,
        qrCode: momoQr,
        amount: booking.totalPrice,
        status: 'PENDING',
        note: 'Cổng thanh toán ví điện tử MoMo Sandbox',
      };
    }

    // Nếu có PayOS thật -> gọi SDK
    if (this.payosInstance) {
      try {
        const paymentLinkData = {
          orderCode,
          amount: booking.totalPrice,
          description,
          returnUrl: dto.returnUrl || 'http://localhost:3000/payment/success',
          cancelUrl: dto.cancelUrl || 'http://localhost:3000/payment/cancel',
        };
        const paymentLink = this.payosInstance.paymentRequests
          ? await this.payosInstance.paymentRequests.create(paymentLinkData)
          : await this.payosInstance.createPaymentLink(paymentLinkData);
        return {
          paymentId: payment._id,
          orderCode,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          amount: booking.totalPrice,
          status: 'PENDING',
        };
      } catch (err) {
        this.logger.error(`Lỗi gọi PayOS: ${err.message}`);
      }
    }

    // Sandbox / Mock Fallback URL & VietQR Mock
    const mockCheckoutUrl = `https://pay.payos.vn/web/${orderCode}`;
    const mockQrCode = `vietqr://payment?orderCode=${orderCode}&amount=${booking.totalPrice}&desc=${description}`;

    return {
      paymentId: payment._id,
      orderCode,
      checkoutUrl: mockCheckoutUrl,
      qrCode: mockQrCode,
      amount: booking.totalPrice,
      status: 'PENDING',
    };
  }

  /**
   * Xử lý Webhook thanh toán - Idempotent + Late Webhook (Mục 4.2 của spec)
   */
  async processWebhook(payload: WebhookPayloadDto) {
    this.logger.log(`Nhận webhook thanh toán: ${JSON.stringify(payload)}`);

    const data = payload.data || (payload as any);
    const amount = data.amount;
    const orderCode = data.orderCode;
    const reference = data.reference;

    // Xác định idempotencyKey / transactionId duy nhất
    const idempotencyKey =
      payload.idempotencyKey ||
      payload.transactionId ||
      reference ||
      (orderCode ? `PAYOS_${orderCode}` : `TXN_${Date.now()}`);

    const transactionId = payload.transactionId || reference || (orderCode ? `TXN_${orderCode}` : idempotencyKey);

    // 1. KIỂM TRA IDEMPOTENCY (Mục 4.2.1)
    const existingSuccessPayment = await this.paymentModel
      .findOne({
        $or: [
          { idempotencyKey, status: PaymentStatus.SUCCESS },
          { transactionId, status: PaymentStatus.SUCCESS },
        ],
      })
      .exec();

    if (existingSuccessPayment) {
      this.logger.log(`[Idempotent] Webhook ${idempotencyKey} đã được xử lý thành công trước đó. Bỏ qua.`);
      return {
        statusCode: 200,
        message: 'Idempotent: Giao dịch đã được xử lý trước đó',
        paymentId: existingSuccessPayment._id,
      };
    }

    // 2. TÌM BOOKING TƯƠNG ỨNG
    let booking: BookingDocument | null = null;

    if (data.bookingId && Types.ObjectId.isValid(data.bookingId)) {
      booking = await this.bookingModel.findById(data.bookingId).exec();
    }

    if (!booking && data.description) {
      // Trích xuất id từ description dạng "BOOKING_<id>"
      const match = data.description.match(/BOOKING_([a-fA-F0-9]{8,24})/);
      if (match) {
        const idPart = match[1];
        booking = await this.bookingModel
          .findOne({
            _id: Types.ObjectId.isValid(idPart)
              ? new Types.ObjectId(idPart)
              : { $regex: new RegExp(idPart + '$') },
          })
          .exec();
      }
    }

    // Nếu vẫn chưa tìm thấy, lấy đơn HELD gần nhất có cùng số tiền
    if (!booking && amount) {
      booking = await this.bookingModel
        .findOne({
          totalPrice: amount,
          status: { $in: [BookingStatus.HELD, BookingStatus.EXPIRED, BookingStatus.CANCELLED] },
        })
        .sort({ createdAt: -1 })
        .exec();
    }

    if (!booking) {
      this.logger.warn(`Không tìm thấy booking tương ứng với webhook: ${JSON.stringify(data)}`);
      // Lưu payment mồ côi để đối soát
      await this.paymentModel.create({
        bookingId: new Types.ObjectId(),
        amount: amount || 0,
        provider: PaymentProvider.PAYOS,
        transactionId,
        idempotencyKey,
        status: PaymentStatus.FAILED,
        rawPayload: payload,
      });
      return { statusCode: 200, message: 'Webhook received but booking not matched' };
    }

    // 3. XỬ LÝ LATE WEBHOOK HOẶC ĐÚNG HẠN (Mục 4.2.2 & 4.2.3)
    if (booking.status === BookingStatus.EXPIRED || booking.status === BookingStatus.CANCELLED) {
      // --- LATE WEBHOOK ---
      this.logger.warn(
        `⚠️ Late Webhook phát hiện! Đơn ${booking._id} đang ở trạng thái ${booking.status}. Chuyển sang REFUND_PENDING.`,
      );

      booking.status = BookingStatus.REFUND_PENDING;
      await booking.save();

      const payment = await this.paymentModel.findOneAndUpdate(
        { bookingId: booking._id },
        {
          amount: amount || booking.totalPrice,
          provider: PaymentProvider.PAYOS,
          transactionId,
          idempotencyKey,
          status: PaymentStatus.REFUND_PENDING,
          rawPayload: payload,
        },
        { upsert: true, new: true },
      );

      return {
        statusCode: 200,
        message: 'Late Webhook: Đã ghi nhận đơn chuyển sang REFUND_PENDING để hoàn tiền thủ công',
        bookingStatus: BookingStatus.REFUND_PENDING,
        paymentId: payment._id,
      };
    }

    // --- ĐÚNG HẠN (status == HELD) ---
    // Sinh qrToken động hạn 60s (Mục 4.5)
    const qrPayload = {
      bookingId: booking._id.toString(),
      userId: booking.userId?.toString(),
      jti: randomUUID(),
    };
    const qrToken = this.jwtService.sign(qrPayload, { expiresIn: '60s' });

    booking.status = BookingStatus.CONFIRMED;
    booking.qrToken = qrToken;
    await booking.save();

    const payment = await this.paymentModel.findOneAndUpdate(
      { bookingId: booking._id },
      {
        amount: amount || booking.totalPrice,
        provider: PaymentProvider.PAYOS,
        transactionId,
        idempotencyKey,
        status: PaymentStatus.SUCCESS,
        rawPayload: payload, // Toàn bộ payload gốc lưu vào Payments.rawPayload để đối soát (Mục 4.2.3)
      },
      { upsert: true, new: true },
    );

    // Broadcast Socket.io slot chuyển sang CONFIRMED (đỏ)
    const dateStr = booking.bookingDate.toISOString().split('T')[0];
    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: booking.venueId.toString(),
      bookingDate: dateStr,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: BookingStatus.CONFIRMED,
    });

    this.logger.log(`✅ Thanh toán thành công cho booking ${booking._id}. Trạng thái CONFIRMED.`);

    return {
      statusCode: 200,
      message: 'Thanh toán thành công',
      bookingStatus: BookingStatus.CONFIRMED,
      paymentId: payment._id,
      qrToken,
    };
  }
}
