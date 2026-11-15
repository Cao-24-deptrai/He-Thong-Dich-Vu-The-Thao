import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvoiceStatus, TaxRate } from '../../common/enums';

export type InvoiceDocument = HydratedDocument<Invoice>;

export class InvoiceItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 8 })
  taxRate: number; // 8% hoặc 10%

  @Prop({ required: true, default: 0 })
  taxAmount: number;
}

@Schema({ collection: 'invoices', timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string; // HD-2026-XXXXX

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, default: 'Dịch vụ thể thao & giải trí' })
  customerName: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerTaxCode?: string; // Mã số thuế cá nhân / DN

  @Prop()
  companyName?: string;

  @Prop()
  companyAddress?: string;

  @Prop()
  customerEmail?: string;

  @Prop({ required: true, type: String, index: true })
  refType: string; // BOOKING, WALLET_TOPUP, MEMBERSHIP

  @Prop({ required: true, type: String, index: true })
  refId: string;

  @Prop({ type: [InvoiceItem], default: [] })
  items: InvoiceItem[];

  @Prop({ required: true, default: 0 })
  subtotal: number; // Trước thuế

  @Prop({ required: true, default: 8 })
  taxRate: number; // Thuế suất chủ đạo (8%)

  @Prop({ required: true, default: 0 })
  taxAmount: number; // Tiền thuế VAT

  @Prop({ required: true, default: 0 })
  totalAmount: number; // Tổng thanh toán

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.ISSUED, index: true })
  status: InvoiceStatus;

  @Prop()
  cqtCode?: string; // Mã xác thực của cơ quan thuế

  @Prop()
  pdfUrl?: string;

  @Prop()
  xmlUrl?: string;

  @Prop()
  issuedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ customerTaxCode: 1 });
InvoiceSchema.index({ createdAt: -1 });
