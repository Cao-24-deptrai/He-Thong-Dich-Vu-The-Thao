import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ComboItemType, UserPackageStatus, PaymentMethod } from '@sports/shared';

export type UserPackageDocument = UserPackage & Document;

@Schema({ _id: false })
export class UserPackageItemBalance {
  @Prop({
    type: String,
    enum: Object.values(ComboItemType),
    required: true,
  })
  itemType: ComboItemType;

  @Prop({ type: Number, required: true, min: 0 })
  remainingQuantity: number;

  @Prop({ type: Number, required: true, min: 1 })
  totalQuantity: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: String })
  courtType?: string;
}

@Schema({
  timestamps: true,
  collection: 'user_packages',
})
export class UserPackage {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  packageCode: string;

  @Prop({ type: Types.ObjectId, ref: 'ComboPackage', required: true, index: true })
  comboPackageId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  comboName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true })
  customerPhone: string;

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: Number, required: true })
  pricePaid: number; // Integer VND

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  })
  paymentMethod: PaymentMethod;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  purchasedAt: Date;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: [UserPackageItemBalance], required: true, default: [] })
  remainingItems: UserPackageItemBalance[];

  @Prop({
    type: String,
    enum: Object.values(UserPackageStatus),
    default: UserPackageStatus.ACTIVE,
    index: true,
  })
  status: UserPackageStatus;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  idempotencyKey: string;
}

export const UserPackageSchema = SchemaFactory.createForClass(UserPackage);

UserPackageSchema.index({ customerId: 1, status: 1 });
UserPackageSchema.index({ expiresAt: 1, status: 1 });
