import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  VoucherDiscountType,
  VoucherScope,
  PromotionChannel,
} from '@sports/shared';

export type VoucherDocument = Voucher & Document;

@Schema({
  timestamps: true,
  collection: 'vouchers',
})
export class Voucher {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(VoucherDiscountType),
    required: true,
    index: true,
  })
  discountType: VoucherDiscountType;

  @Prop({ type: Number, required: true })
  discountValue: number;

  @Prop({ type: Number })
  maxDiscountAmount?: number;

  @Prop({ type: Number, default: 0 })
  minOrderAmount: number;

  @Prop({
    type: [String],
    enum: Object.values(VoucherScope),
    default: [VoucherScope.ALL],
    index: true,
  })
  applicableScopes: VoucherScope[];

  @Prop({ type: Date, required: true, index: true })
  validFrom: Date;

  @Prop({ type: Date, required: true, index: true })
  validTo: Date;

  @Prop({ type: Number })
  totalUsageLimit?: number;

  @Prop({ type: Number, default: 0, index: true })
  usedCount: number;

  @Prop({ type: Number, default: 1 })
  perCustomerLimit: number;

  @Prop({
    type: String,
    enum: Object.values(PromotionChannel),
    default: PromotionChannel.ALL,
    index: true,
  })
  channel: PromotionChannel;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

VoucherSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
VoucherSchema.index({ code: 1, isActive: 1 });
