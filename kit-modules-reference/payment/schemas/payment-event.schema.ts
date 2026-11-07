import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PaymentProvider } from '@sports/shared';

export type PaymentEventDocument = HydratedDocument<PaymentEvent>;

@Schema({ collection: 'payment_events', timestamps: true })
export class PaymentEvent {
  @Prop({ required: true, enum: Object.values(PaymentProvider), index: true })
  provider: PaymentProvider;

  @Prop({ required: true, trim: true })
  providerTxnId: string;

  @Prop({ required: true, trim: true, index: true })
  paymentCode: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, trim: true })
  signature: string;

  @Prop({ required: true, default: false })
  signatureVerified: boolean;

  @Prop({ required: true, default: false })
  processed: boolean;

  @Prop({ required: true, type: Object })
  payload: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);
PaymentEventSchema.index({ provider: 1, providerTxnId: 1 }, { unique: true });
