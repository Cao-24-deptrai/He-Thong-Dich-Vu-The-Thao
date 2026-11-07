import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentProvider, OrderItemType } from '../../common/enums';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @ApiProperty({ description: 'Invoice / Order Code', example: 'HD-20261026-001' })
  @Prop({ type: String, required: true, unique: true })
  orderCode: string;

  @ApiProperty({ description: 'Staff Cashier User ID', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  cashierId?: Types.ObjectId;

  @ApiProperty({ description: 'Customer User ID if member', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  customerId?: Types.ObjectId;

  @ApiProperty({ description: 'Customer Full Name', example: 'Khách vãng lai' })
  @Prop({ type: String, default: 'Khách vãng lai' })
  customerName: string;

  @ApiProperty({ description: 'Customer Phone', required: false })
  @Prop({ type: String })
  customerPhone?: string;

  @ApiProperty({
    description: 'Line items purchased or rented',
    example: [
      {
        itemId: 'p-water',
        name: 'Nước tăng lực RedBull',
        type: OrderItemType.PRODUCT,
        quantity: 2,
        unitPrice: 20000,
        totalPrice: 40000,
      },
    ],
  })
  @Prop({
    type: [
      {
        itemId: { type: String },
        name: { type: String, required: true },
        type: { type: String, enum: Object.values(OrderItemType), default: OrderItemType.PRODUCT },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    default: [],
  })
  items: Array<{
    itemId?: string;
    name: string;
    type: OrderItemType;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @ApiProperty({ description: 'Subtotal before discounts and taxes in VND', example: 100000 })
  @Prop({ type: Number, required: true })
  subtotal: number;

  @ApiProperty({ description: 'Discount amount in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @ApiProperty({ description: 'VAT tax rate in percent', default: 8 })
  @Prop({ type: Number, default: 8 })
  vatRate: number;

  @ApiProperty({ description: 'VAT tax amount in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  vatAmount: number;

  @ApiProperty({ description: 'Final payable total in VND', example: 108000 })
  @Prop({ type: Number, required: true })
  finalTotal: number;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.CASH })
  @Prop({
    type: String,
    enum: Object.values(PaymentProvider),
    default: PaymentProvider.CASH,
  })
  paymentMethod: PaymentProvider;

  @ApiProperty({ enum: OrderStatus, default: OrderStatus.COMPLETED })
  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.COMPLETED,
  })
  status: OrderStatus;

  @ApiProperty({ description: 'Current active cashier shift ID', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Shift' })
  shiftId?: Types.ObjectId;

  @ApiProperty({ description: 'Order note', required: false })
  @Prop({ type: String })
  note?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ cashierId: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
