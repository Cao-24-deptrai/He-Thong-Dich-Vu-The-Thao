import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import crypto from 'node:crypto';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema.js';
import { Payment, PaymentDocument } from '../../payment/schemas/payment.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import {
  InvoiceAdapter,
  INVOICE_ADAPTER,
} from './invoice-adapter.interface.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateInvoiceDto,
  InvoiceStatus,
  InvoiceProvider,
  BuyerType,
  PaymentStatus,
  UninvoicedReport,
} from '@sports/contracts';
import { assertValidMoney } from '@sports/shared';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(INVOICE_ADAPTER) private readonly invoiceAdapter: InvoiceAdapter,
    private readonly settingsService: SettingsService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Sinh mã hóa đơn nội bộ duy nhất dạng INV-YYYYMMDD-XXXXXX
   */
  private generateInvoiceCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `INV-${dateStr}-${rand}`;
  }

  /**
   * 1. Khởi tạo hóa đơn từ thanh toán thành công
   */
  async createInvoice(dto: CreateInvoiceDto, actorId?: string): Promise<InvoiceDocument> {
    assertValidMoney(dto.totalAmount, 'total amount');

    // 1. Kiểm tra Idempotency
    const existing = await this.invoiceModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      this.logger.log(`Idempotent invoice replay for key: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Kiểm tra xem Payment này đã có hóa đơn gốc chưa (1-1 mapping)
    const existingForPayment = await this.invoiceModel
      .findOne({ paymentId: new Types.ObjectId(dto.paymentId) })
      .exec();
    if (existingForPayment) {
      return existingForPayment;
    }

    // 3. Tìm Payment và User tương ứng để xác định thông tin người mua
    const payment = await this.paymentModel.findById(dto.paymentId).exec();
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán để lập hóa đơn');
    }

    const user = await this.userModel.findById(payment.userId).exec();

    // 4. Phân loại thông tin người mua (F08.2)
    let buyerInfo = dto.buyerInfo;
    if (!buyerInfo) {
      if (user?.invoiceInfo?.taxId && user.invoiceInfo.companyName) {
        buyerInfo = {
          name: user.fullName,
          buyerType: BuyerType.ENTERPRISE,
          companyName: user.invoiceInfo.companyName,
          taxCode: user.invoiceInfo.taxId,
          address: user.invoiceInfo.address,
          email: user.invoiceInfo.email || user.email,
          phone: user.phone,
        };
      } else {
        buyerInfo = {
          name: user?.fullName || 'Khách lẻ không lấy hóa đơn',
          buyerType: BuyerType.INDIVIDUAL,
          email: user?.email,
          phone: user?.phone,
        };
      }
    }

    const invoiceCode = this.generateInvoiceCode();
    const provider = this.settingsService.get<InvoiceProvider>(
      'invoice.provider',
      InvoiceProvider.MOCK,
    );

    const invoice = new this.invoiceModel({
      invoiceCode,
      paymentId: payment._id,
      orderId: payment.orderId,
      orderType: payment.orderType,
      userId: payment.userId,
      buyerInfo,
      items: dto.items,
      subtotal: dto.subtotal,
      vatAmount: dto.vatAmount,
      totalAmount: dto.totalAmount,
      status: InvoiceStatus.PENDING,
      provider,
      retryCount: 0,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await invoice.save();

    await this.outboxService.recordEvent({
      eventType: 'invoice.created',
      aggregateType: 'invoice',
      aggregateId: saved.id,
      payload: {
        invoiceCode,
        paymentId: dto.paymentId,
        totalAmount: dto.totalAmount,
      },
    });

    // Tự động phát hành hóa đơn qua Adapter
    return this.issueInvoiceWithRetry(saved.id, actorId);
  }

  /**
   * 2. Phát hành hóa đơn qua Adapter kèm cơ chế thử lại (Retry Queue)
   */
  async issueInvoiceWithRetry(invoiceId: string, actorId?: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (invoice.status === InvoiceStatus.ISSUED) {
      return invoice;
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Hóa đơn đã bị hủy, không thể phát hành lại');
    }

    try {
      const result = await this.invoiceAdapter.issueInvoice({
        invoiceCode: invoice.invoiceCode,
        orderId: invoice.orderId.toString(),
        buyerInfo: invoice.buyerInfo,
        items: invoice.items,
        totalAmount: invoice.totalAmount,
      });

      invoice.status = InvoiceStatus.ISSUED;
      invoice.invoiceNumber = result.invoiceNumber;
      invoice.invoiceSeries = result.invoiceSeries;
      invoice.lookupCode = result.lookupCode;
      invoice.pdfUrl = result.pdfUrl;
      invoice.xmlUrl = result.xmlUrl;
      invoice.issuedAt = result.issuedAt;
      invoice.lastError = undefined;

      const updated = await invoice.save();

      await this.outboxService.recordEvent({
        eventType: 'invoice.issued',
        aggregateType: 'invoice',
        aggregateId: updated.id,
        payload: {
          invoiceCode: updated.invoiceCode,
          invoiceNumber: updated.invoiceNumber,
          lookupCode: updated.lookupCode,
          pdfUrl: updated.pdfUrl,
        },
      });

      await this.auditLogService.record({
        actorId,
        action: 'INVOICE_ISSUED',
        targetType: 'invoice',
        targetId: updated.id,
        after: {
          invoiceCode: updated.invoiceCode,
          invoiceNumber: updated.invoiceNumber,
          status: InvoiceStatus.ISSUED,
        },
      });

      return updated;
    } catch (err: any) {
      this.logger.error(
        `Failed to issue invoice ${invoice.invoiceCode}: ${err.message}`,
        err.stack,
      );

      invoice.retryCount += 1;
      invoice.lastError = err.message || 'Lỗi gọi API nhà cung cấp hóa đơn';

      if (invoice.retryCount >= 3) {
        invoice.status = InvoiceStatus.FAILED;
      }

      const failedDoc = await invoice.save();

      await this.outboxService.recordEvent({
        eventType: 'invoice.issue_failed',
        aggregateType: 'invoice',
        aggregateId: failedDoc.id,
        payload: {
          invoiceCode: failedDoc.invoiceCode,
          retryCount: failedDoc.retryCount,
          error: failedDoc.lastError,
        },
      });

      return failedDoc;
    }
  }

  /**
   * 3. Hủy hóa đơn khi giao dịch hoàn tiền
   */
  async cancelInvoice(
    invoiceId: string,
    reason: string,
    actorId?: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    if (invoice.invoiceNumber) {
      try {
        await this.invoiceAdapter.cancelInvoice(invoice.invoiceNumber, reason);
      } catch (err: any) {
        this.logger.error(`Adapter cancelInvoice failed: ${err.message}`);
      }
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.lastError = `Đã hủy: ${reason}`;

    const updated = await invoice.save();

    await this.outboxService.recordEvent({
      eventType: 'invoice.cancelled',
      aggregateType: 'invoice',
      aggregateId: updated.id,
      payload: {
        invoiceCode: updated.invoiceCode,
        invoiceNumber: updated.invoiceNumber,
        reason,
      },
    });

    await this.auditLogService.record({
      actorId,
      action: 'INVOICE_CANCELLED',
      targetType: 'invoice',
      targetId: updated.id,
      after: {
        invoiceCode: updated.invoiceCode,
        status: InvoiceStatus.CANCELLED,
        reason,
      },
    });

    return updated;
  }

  /**
   * 4. Lấy link PDF tra cứu hóa đơn
   */
  async getInvoicePdf(invoiceId: string): Promise<string> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

    if (invoice.invoiceNumber && invoice.lookupCode) {
      return this.invoiceAdapter.getPdfUrl(invoice.invoiceNumber, invoice.lookupCode);
    }

    throw new BadRequestException('Hóa đơn chưa được phát hành chính thức');
  }

  /**
   * 5. Tra cứu chi tiết hóa đơn
   */
  async getInvoice(id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id).exec();
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    return invoice;
  }

  /**
   * 6. Danh sách hóa đơn của khách hàng
   */
  async findMyInvoices(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { userId: new Types.ObjectId(userId) };

    const [items, total] = await Promise.all([
      this.invoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 7. Tra cứu danh sách toàn bộ hóa đơn cho Admin/Kế toán
   */
  async findAllInvoices(query: {
    status?: InvoiceStatus;
    provider?: InvoiceProvider;
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
      this.invoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 8. Đối soát hóa đơn & đơn hàng: Tìm các khoản thanh toán thành công chưa có hóa đơn (F08.7)
   */
  async findUninvoicedPayments(): Promise<UninvoicedReport> {
    // 1. Lấy tất cả payments thành công
    const successfulPayments = await this.paymentModel
      .find({ status: PaymentStatus.SUCCESS })
      .exec();

    // 2. Lấy tất cả paymentId đã có hóa đơn
    const invoicedPaymentIds = (
      await this.invoiceModel.find({}, { paymentId: 1 }).exec()
    ).map((inv) => inv.paymentId.toString());

    const uninvoicedPayments = successfulPayments.filter(
      (p) => !invoicedPaymentIds.includes(p._id.toString()),
    );

    let uninvoicedTotal = 0;
    const payments = uninvoicedPayments.map((p) => {
      uninvoicedTotal += p.paidAmount;
      return {
        paymentId: p.id,
        paymentCode: p.paymentCode,
        orderId: p.orderId.toString(),
        orderType: p.orderType,
        amount: p.paidAmount,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      uninvoicedCount: uninvoicedPayments.length,
      uninvoicedTotal,
      payments,
    };
  }
}
