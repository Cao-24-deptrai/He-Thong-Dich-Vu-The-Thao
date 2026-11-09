import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoucherUsageDocument = VoucherUsage & Document;

@Schema({
  timestamps: true,
  collection: 'voucher_usages',
})
export class VoucherUsage {
  @Prop({ type: Types.ObjectId, ref: 'Voucher', required: true, index: true })
  voucherId: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  voucherCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderType: string;

  @Prop({ type: String, required: true, index: true })
  orderId: string;

  @Prop({ type: Number, required: true })
  discountAmount: number;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  usedAt: Date;

  @Prop({ type: Boolean, default: false, index: true })
  isRolledBack: boolean;
}

export const VoucherUsageSchema = SchemaFactory.createForClass(VoucherUsage);

VoucherUsageSchema.index({ voucherCode: 1, customerId: 1, isRolledBack: 1 });
VoucherUsageSchema.index({ voucherCode: 1, orderId: 1 });
