import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  PaymentOrderType,
} from '@sports/shared';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  @Prop({ required: true, unique: true, trim: true, index: true })
  paymentCode: string;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(PaymentOrderType), index: true })
  orderType: PaymentOrderType;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Number })
  amount: number; // Số tiền cần thanh toán (Integer VND)

  @Prop({ required: true, type: Number, default: 0 })
  paidAmount: number; // Số tiền thực tế đã nhận được (Integer VND)

  @Prop({
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.CREATED,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ required: true, enum: Object.values(PaymentMethod) })
  method: PaymentMethod;

  @Prop({ required: true, enum: Object.values(PaymentProvider), index: true })
  provider: PaymentProvider;

  @Prop({ trim: true, index: true })
  providerTxnId?: string;

  @Prop({ trim: true })
  qrCodeText?: string;

  @Prop({ trim: true })
  qrDataUrl?: string;

  @Prop({ required: true, type: Date, index: true })
  expiresAt: Date;

  @Prop({ type: Number, default: 0 })
  changeAmount?: number; // Tiền thừa trả khách (tiền mặt)

  @Prop({ trim: true })
  mismatchReason?: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  idempotencyKey: string;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
