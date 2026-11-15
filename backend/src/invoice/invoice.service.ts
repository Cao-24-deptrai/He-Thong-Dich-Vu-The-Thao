import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { InvoiceStatus } from '../common/enums';
import { CreateInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  private generateCqtCode(): string {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'CQT-26-';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createInvoice(userId: string, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const count = await this.invoiceModel.countDocuments();
    const invoiceNumber = `HD26-${String(count + 1001).padStart(6, '0')}`;

    let subtotal = 0;
    let totalTax = 0;

    const items = dto.items.map((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const lineTax = Math.round((lineSubtotal * item.taxRate) / 100);
      subtotal += lineSubtotal;
      totalTax += lineTax;
      return {
        ...item,
        amount: lineSubtotal,
        taxAmount: lineTax,
      };
    });

    const totalAmount = subtotal + totalTax;
    const cqtCode = this.generateCqtCode();

    const invoice = new this.invoiceModel({
      invoiceNumber,
      userId: new Types.ObjectId(userId),
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerTaxCode: dto.customerTaxCode,
      companyName: dto.companyName,
      companyAddress: dto.companyAddress,
      customerEmail: dto.customerEmail,
      refType: dto.refType,
      refId: dto.refId,
      items,
      subtotal,
      taxRate: 8,
      taxAmount: totalTax,
      totalAmount,
      status: InvoiceStatus.ISSUED,
      cqtCode,
      pdfUrl: `/api/v1/invoices/${invoiceNumber}/pdf`,
      xmlUrl: `/api/v1/invoices/${invoiceNumber}/xml`,
      issuedAt: new Date(),
    });

    return invoice.save();
  }

  async getMyInvoices(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const userObjectId = new Types.ObjectId(userId);

    const [items, total] = await Promise.all([
      this.invoiceModel.find({ userId: userObjectId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.invoiceModel.countDocuments({ userId: userObjectId }).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceModel.findById(id).exec();
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn điện tử');
    return invoice;
  }

  async getAllInvoices(filter?: { status?: string; search?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filter?.status) {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { invoiceNumber: { $regex: filter.search, $options: 'i' } },
        { customerName: { $regex: filter.search, $options: 'i' } },
        { customerTaxCode: { $regex: filter.search, $options: 'i' } },
        { cqtCode: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.invoiceModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
