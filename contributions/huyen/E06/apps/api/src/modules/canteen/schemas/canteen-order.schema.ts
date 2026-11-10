import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductCategory, PaymentMethod, CanteenOrderStatus } from '@sports/shared';

export type CanteenOrderDocument = HydratedDocument<CanteenOrder>;

@Schema({ _id: false })
export class CanteenOrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ProductCategory })
  category: ProductCategory;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  costPrice: number;

  @Prop({ required: true, min: 0, max: 100 })
  vatRate: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

export const CanteenOrderItemSchema = SchemaFactory.createForClass(CanteenOrderItem);

@Schema({ timestamps: true, collection: 'canteen_orders' })
export class CanteenOrder {
  @Prop({ required: true, unique: true, trim: true })
  orderCode: string;

  @Prop({ type: Types.ObjectId, ref: 'CashierShift', required: true, index: true })
  shiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  cashierId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  customerId?: Types.ObjectId;

  @Prop({ trim: true })
  customerPhone?: string;

  @Prop({ type: [CanteenOrderItemSchema], required: true })
  items: CanteenOrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ required: true, min: 0 })
  vatAmount: number;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  paidAmount: number;

  @Prop({ default: 0, min: 0 })
  changeAmount: number;

  @Prop({ required: true, enum: CanteenOrderStatus, default: CanteenOrderStatus.COMPLETED, index: true })
  status: CanteenOrderStatus;

  @Prop()
  cancelReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Invoice' })
  invoiceId?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CanteenOrderSchema = SchemaFactory.createForClass(CanteenOrder);

CanteenOrderSchema.index({ createdAt: -1 });
CanteenOrderSchema.index({ shiftId: 1, status: 1 });
