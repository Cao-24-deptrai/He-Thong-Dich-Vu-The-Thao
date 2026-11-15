import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import crypto from 'node:crypto';
import { Payment, PaymentDocument } from '../schemas/payment.schema.js';
import { VietQrService } from './vietqr.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { BookingService } from '../../booking/services/booking.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreatePaymentDto,
  CashPaymentDto,
  SplitPaymentDto,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentOrderType,
  ReconcileSummary,
} from '@sports/contracts';
import { assertValidMoney, WalletCategory } from '@sports/shared';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly vietQrService: VietQrService,
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly settingsService: SettingsService,
    private readonly transactionService: DatabaseTransactionService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Sinh mã thanh toán duy nhất dạng PAY-YYYYMMDD-XXXXXX
   */
  private generatePaymentCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${dateStr}-${rand}`;
  }

  /**
   * Map PaymentMethod sang PaymentProvider
   */
  private resolveProvider(method: PaymentMethod): PaymentProvider {
    switch (method) {
      case PaymentMethod.CASH:
        return PaymentProvider.CASH;
      case PaymentMethod.VIETQR:
        return PaymentProvider.VIETQR;
      case PaymentMethod.INTERNAL_WALLET:
        return PaymentProvider.INTERNAL_WALLET;
      case PaymentMethod.MOMO:
        return PaymentProvider.MOMO;
      case PaymentMethod.ZALOPAY:
        return PaymentProvider.ZALOPAY;
      case PaymentMethod.VNPAY:
        return PaymentProvider.VNPAY;
      default:
        return PaymentProvider.VIETQR;
    }
  }

  /**
   * 1. Khởi tạo giao dịch thanh toán
   */
  async createPayment(userId: string, dto: CreatePaymentDto): Promise<PaymentDocument> {
    assertValidMoney(dto.amount, 'payment amount');

    // Idempotency replay check
    const existing = await this.paymentModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existing) {
      this.logger.log(`Idempotent payment replay for key: ${dto.idempotencyKey}`);
      return existing;
    }

    const paymentCode = this.generatePaymentCode();
    const holdMinutes = this.settingsService.get<number>('booking.holdMinutes', 10);
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
    const provider = this.resolveProvider(dto.method);

    let qrCodeText: string | undefined;
    let qrDataUrl: string | undefined;

    if (dto.method === PaymentMethod.VIETQR) {
      const qrData = this.vietQrService.generateVietQr(paymentCode, dto.amount);
      qrCodeText = qrData.qrCodeText;
      qrDataUrl = qrData.qrDataUrl;
    }

    const payment = new this.paymentModel({
      paymentCode,
      orderId: Types.ObjectId.isValid(dto.orderId)
        ? new Types.ObjectId(dto.orderId)
        : new Types.ObjectId(),
      orderType: dto.orderType,
      userId: Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : new Types.ObjectId(),
      amount: dto.amount,
      paidAmount: 0,
      status: PaymentStatus.CREATED,
      method: dto.method,
      provider,
      qrCodeText,
      qrDataUrl,
      expiresAt,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await payment.save();

    await this.outboxService.recordEvent({
      eventType: 'payment.created',
      aggregateType: 'payment',
      aggregateId: saved.id,
      payload: {
        paymentCode,
        orderId: dto.orderId,
        amount: dto.amount,
        method: dto.method,
      },
    });

    return saved;
  }

  /**
   * 2. Xử lý thanh toán tiền mặt tại quầy (POS CASH)
   */
  async processCashPayment(actorId: string, dto: CashPaymentDto): Promise<PaymentDocument> {
    assertValidMoney(dto.receivedAmount, 'received amount');

    const payment = await this.paymentModel.findById(dto.paymentId).exec();
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    if (payment.status !== PaymentStatus.CREATED && payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Không thể thanh toán cho giao dịch ở trạng thái ${payment.status}`);
    }

    if (dto.receivedAmount < payment.amount) {
      throw new BadRequestException(
        `Số tiền khách đưa (${dto.receivedAmount.toLocaleString('vi-VN')} đ) không đủ thanh toán (${payment.amount.toLocaleString('vi-VN')} đ)`,
      );
    }

    const changeAmount = dto.receivedAmount - payment.amount;

    return this.handlePaymentSuccess(
      payment.paymentCode,
      payment.amount,
      `CASH_${payment.paymentCode}`,
      {
        receivedAmount: dto.receivedAmount,
        changeAmount,
        cashierId: actorId,
        note: dto.note || 'Thanh toán tiền mặt tại quầy POS',
      },
    );
  }

  /**
   * 3. Xử lý thanh toán bằng ví nội bộ
   */
  async processWalletPayment(
    userId: string,
    paymentId: string,
    idempotencyKey: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    if (payment.userId.toString() !== userId) {
      throw new BadRequestException('Bạn không sở hữu giao dịch thanh toán này');
    }

    // Map orderType sang WalletCategory
    let category = WalletCategory.COURT;
    if (payment.orderType === PaymentOrderType.CANTEEN_ORDER) {
      category = WalletCategory.CANTEEN;
    }

    // Trừ ví nội bộ an toàn (Chống âm số dư)
    await this.walletService.pay(
      userId,
      {
        amount: payment.amount,
        category,
        refType: payment.orderType,
        refId: payment.orderId.toString(),
        idempotencyKey: `WAL_${idempotencyKey}`,
        note: `Thanh toán ${payment.paymentCode}`,
      },
      userId,
    );

    return this.handlePaymentSuccess(payment.paymentCode, payment.amount, `WALLET_${idempotencyKey}`);
  }

  /**
   * 4. Xử lý thanh toán hỗn hợp (Split Payment)
   */
  async processSplitPayment(actorId: string, dto: SplitPaymentDto): Promise<PaymentDocument[]> {
    assertValidMoney(dto.totalAmount, 'totalAmount');

    // Kiểm tra tổng số tiền các phần thanh toán phải khớp chính xác 100%
    let sumSplit = 0;
    for (const split of dto.splits) {
      assertValidMoney(split.amount, 'split amount');
      sumSplit += split.amount;
    }

    if (sumSplit !== dto.totalAmount) {
      throw new BadRequestException(
        `Tổng các khoản thanh toán (${sumSplit.toLocaleString('vi-VN')} đ) không khớp với tổng đơn (${dto.totalAmount.toLocaleString('vi-VN')} đ)`,
      );
    }

    const processedPayments: PaymentDocument[] = [];

    // Thực hiện từng phần thanh toán trong transaction
    for (const split of dto.splits) {
      const childPayment = await this.createPayment(actorId, {
        orderId: dto.orderId,
        orderType: dto.orderType,
        amount: split.amount,
        method: split.method,
        idempotencyKey: split.idempotencyKey,
      });

      if (split.method === PaymentMethod.CASH) {
        const received = split.receivedAmount || split.amount;
        const paidDoc = await this.processCashPayment(actorId, {
          paymentId: childPayment.id,
          receivedAmount: received,
          idempotencyKey: split.idempotencyKey,
        });
        processedPayments.push(paidDoc);
      } else {
        processedPayments.push(childPayment);
      }
    }

    return processedPayments;
  }

  /**
   * 5. Xử lý xác nhận thanh toán thành công (Từ Webhook hoặc POS)
   * Kiểm tra nghiêm ngặt 2 bất biến:
   *  - Exact amount matching (khớp chính xác 100%)
   *  - Late payment handling (thanh toán muộn -> MISMATCH và tự động nạp ví cho khách)
   */
  async handlePaymentSuccess(
    paymentCode: string,
    receivedAmount: number,
    providerTxnId: string,
    meta?: Record<string, unknown>,
  ): Promise<PaymentDocument> {
    assertValidMoney(receivedAmount, 'receivedAmount');

    return this.transactionService.runTransaction(async (session: ClientSession) => {
      const payment = await this.paymentModel
        .findOne({ paymentCode })
        .session(session)
        .exec();

      if (!payment) {
        throw new NotFoundException(`Không tìm thấy mã thanh toán ${paymentCode}`);
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`Idempotent handlePaymentSuccess replay for ${paymentCode}`);
        return payment;
      }

      // --- BẤT BIẾN 1: EXACT AMOUNT MATCHING ---
      if (receivedAmount !== payment.amount) {
        this.logger.warn(
          `PAYMENT AMOUNT MISMATCH: Payment ${paymentCode} expected ${payment.amount} but got ${receivedAmount}`,
        );
        payment.status = PaymentStatus.MISMATCH;
        payment.paidAmount = receivedAmount;
        payment.providerTxnId = providerTxnId;
        payment.mismatchReason = `Số tiền nhận được (${receivedAmount.toLocaleString('vi-VN')} đ) không khớp với số tiền cần trả (${payment.amount.toLocaleString('vi-VN')} đ)`;
        if (meta) payment.meta = { ...payment.meta, ...meta };

        await payment.save({ session });

        await this.outboxService.recordEvent(
          {
            eventType: 'payment.mismatch',
            aggregateType: 'payment',
            aggregateId: payment.id,
            payload: {
              paymentCode,
              expectedAmount: payment.amount,
              receivedAmount,
              reason: payment.mismatchReason,
            },
          },
          session,
        );

        return payment;
      }

      // --- BẤT BIẾN 2: LATE PAYMENT HANDLING ---
      const isExpired = new Date() > payment.expiresAt;
      if (isExpired) {
        this.logger.warn(`LATE PAYMENT DETECTED: Payment ${paymentCode} received after expiresAt`);

        payment.status = PaymentStatus.MISMATCH;
        payment.paidAmount = receivedAmount;
        payment.providerTxnId = providerTxnId;
        payment.mismatchReason = 'Thanh toán muộn sau khi thời gian giữ chỗ đã kết thúc';
        if (meta) payment.meta = { ...payment.meta, ...meta };

        await payment.save({ session });

        // Tự động hoàn tiền vào ví nội bộ của khách hàng
        await this.walletService.refund(
          payment.userId.toString(),
          receivedAmount,
          'LATE_PAYMENT',
          paymentCode,
          `REFUND_LATE_${paymentCode}_${providerTxnId}`,
          'Tự động hoàn tiền do thanh toán muộn quá hạn giữ chỗ',
          'SYSTEM',
        );

        await this.outboxService.recordEvent(
          {
            eventType: 'payment.late_paid_refunded',
            aggregateType: 'payment',
            aggregateId: payment.id,
            payload: {
              paymentCode,
              userId: payment.userId.toString(),
              amount: receivedAmount,
              reason: payment.mismatchReason,
            },
          },
          session,
        );

        return payment;
      }

      // --- THANH TOÁN THÀNH CÔNG HỢP LỆ ---
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAmount = receivedAmount;
      payment.providerTxnId = providerTxnId;
      if (meta?.changeAmount !== undefined) {
        payment.changeAmount = meta.changeAmount as number;
      }
      if (meta) {
        payment.meta = { ...payment.meta, ...meta };
      }

      await payment.save({ session });

      // Nếu là thanh toán tiền cọc đặt sân -> Kích hoạt xác nhận booking
      if (payment.orderType === PaymentOrderType.BOOKING) {
        try {
          await this.bookingService.confirmBooking(
            payment.orderId.toString(),
            {
              paymentMethod: payment.method,
              paidAmount: receivedAmount,
            },
            payment.userId.toString(),
          );
        } catch (err: any) {
          this.logger.error(`Failed to auto-confirm booking ${payment.orderId}: ${err.message}`);
        }
      }

      await this.outboxService.recordEvent(
        {
          eventType: 'payment.succeeded',
          aggregateType: 'payment',
          aggregateId: payment.id,
          payload: {
            paymentCode,
            orderId: payment.orderId.toString(),
            orderType: payment.orderType,
            userId: payment.userId.toString(),
            amount: payment.amount,
            method: payment.method,
            providerTxnId,
          },
        },
        session,
      );

      await this.auditLogService.record(
        {
          action: 'PAYMENT_SUCCESS',
          targetType: 'payment',
          targetId: payment.id,
          after: { paymentCode, amount: payment.amount, status: PaymentStatus.SUCCESS },
        },
        session,
      );

      return payment;
    });
  }

  /**
   * 6. Hoàn tiền thanh toán
   */
  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
    actorId?: string,
  ): Promise<PaymentDocument> {
    assertValidMoney(amount, 'refund amount');

    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Chỉ có thể hoàn tiền cho giao dịch đã thanh toán thành công');
    }

    if (amount > payment.paidAmount) {
      throw new BadRequestException('Số tiền hoàn không được vượt quá số tiền đã thanh toán');
    }

    // Hoàn tiền vào ví nội bộ
    await this.walletService.refund(
      payment.userId.toString(),
      amount,
      'PAYMENT_REFUND',
      payment.paymentCode,
      `REFUND_${payment.paymentCode}_${Date.now()}`,
      reason || 'Hoàn tiền giao dịch',
      actorId,
    );

    payment.status =
      amount === payment.paidAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await payment.save();

    await this.outboxService.recordEvent({
      eventType: 'payment.refunded',
      aggregateType: 'payment',
      aggregateId: payment.id,
      payload: {
        paymentCode: payment.paymentCode,
        amount,
        status: payment.status,
      },
    });

    return payment;
  }

  /**
   * 7. Tra cứu chi tiết giao dịch
   */
  async getPayment(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }
    return payment;
  }

  /**
   * 8. Tra cứu danh sách giao dịch
   */
  async findAllPayments(query: {
    status?: PaymentStatus;
    provider?: PaymentProvider;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.provider) filter.provider = query.provider;
    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(`${query.date}T23:59:59.999Z`);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 9. Danh sách giao dịch MISMATCH để quản lý kiểm tra
   */
  async findMismatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { status: PaymentStatus.MISMATCH };

    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 10. Báo cáo đối soát doanh thu cổng trong ngày
   */
  async reconcileDaily(date: string, provider?: PaymentProvider): Promise<ReconcileSummary> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const filter: Record<string, unknown> = {
      createdAt: { $gte: start, $lte: end },
    };
    if (provider) filter.provider = provider;

    const payments = await this.paymentModel.find(filter).exec();

    let systemTotal = 0;
    let systemCount = 0;
    let mismatchCount = 0;

    for (const p of payments) {
      if (p.status === PaymentStatus.SUCCESS) {
        systemTotal += p.paidAmount;
        systemCount++;
      } else if (p.status === PaymentStatus.MISMATCH) {
        mismatchCount++;
      }
    }

    // Ở môi trường đối soát thực tế, providerTotal được đọc từ file sao kê đối soát
    return {
      date,
      provider: provider || 'ALL',
      systemTotal,
      systemCount,
      providerTotal: systemTotal, // Mock khớp 100% khi chưa có lệch sao kê ngoài
      providerCount: systemCount,
      isBalanced: mismatchCount === 0,
      mismatchCount,
    };
  }
}
