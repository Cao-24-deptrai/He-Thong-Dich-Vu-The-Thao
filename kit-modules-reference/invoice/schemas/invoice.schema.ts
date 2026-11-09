import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  InvoiceStatus,
  InvoiceProvider,
  BuyerType,
  PaymentOrderType,
} from '@sports/shared';

export type InvoiceDocument = HydratedDocument<Invoice>;

export class BuyerInfoSchema {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Object.values(BuyerType), default: BuyerType.INDIVIDUAL })
  buyerType: BuyerType;

  @Prop({ trim: true })
  companyName?: string;

  @Prop({ trim: true })
  taxCode?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;
}

export class InvoiceItemSchema {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, default: 'Lượt' })
  unit: string;

  @Prop({ required: true, type: Number, default: 1 })
  quantity: number;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, type: Number, default: 8 })
  vatRate: number;

  @Prop({ required: true, type: Number, default: 0 })
  vatAmount: number;
}

@Schema({ collection: 'invoices', timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true, trim: true, index: true })
  invoiceCode: string;

  @Prop({ trim: true, index: true })
  invoiceNumber?: string;

  @Prop({ trim: true })
  invoiceSeries?: string;

  @Prop({ trim: true, index: true })
  lookupCode?: string;

  @Prop({ required: true, type: Types.ObjectId, unique: true, index: true })
  paymentId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(PaymentOrderType), index: true })
  orderType: PaymentOrderType;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: BuyerInfoSchema })
  buyerInfo: BuyerInfoSchema;

  @Prop({ required: true, type: [InvoiceItemSchema] })
  items: InvoiceItemSchema[];

  @Prop({ required: true, type: Number })
  subtotal: number; // Tiền trước thuế (VND nguyên)

  @Prop({ required: true, type: Number, default: 0 })
  vatAmount: number; // Tiền thuế VAT (VND nguyên)

  @Prop({ required: true, type: Number })
  totalAmount: number; // Tổng tiền thanh toán sau thuế (VND nguyên)

  @Prop({
    required: true,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.PENDING,
    index: true,
  })
  status: InvoiceStatus;

  @Prop({
    required: true,
    enum: Object.values(InvoiceProvider),
    default: InvoiceProvider.MOCK,
    index: true,
  })
  provider: InvoiceProvider;

  @Prop({ required: true, type: Number, default: 0 })
  retryCount: number;

  @Prop({ trim: true })
  lastError?: string;

  @Prop({ trim: true })
  pdfUrl?: string;

  @Prop({ trim: true })
  xmlUrl?: string;

  @Prop({ type: Date })
  issuedAt?: Date;

  @Prop({ required: true, unique: true, trim: true, index: true })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
