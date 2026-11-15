import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider, PaymentStatus } from '../../common/enums';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Payment {
  @ApiProperty({ description: 'Associated Booking ID', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: false })
  bookingId?: Types.ObjectId;

  @ApiProperty({ description: 'Associated Membership Pass ID', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MembershipPass', required: false })
  passId?: Types.ObjectId;

  @ApiProperty({ description: 'Payment amount in VND', example: 250000 })
  @Prop({ type: Number, required: true })
  amount: number;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.PAYOS })
  @Prop({
    type: String,
    enum: Object.values(PaymentProvider),
    required: true,
  })
  provider: PaymentProvider;

  @ApiProperty({ description: 'Transaction ID from payment gateway', required: false })
  @Prop({ type: String })
  transactionId?: string;

  @ApiProperty({
    description: 'Unique idempotency key from webhook provider to prevent duplicate execution',
    required: false,
  })
  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

  @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.INIT })
  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.INIT,
  })
  status: PaymentStatus;

  @ApiProperty({ description: 'Raw callback webhook payload for audit and dispute resolution', required: false })
  @Prop({ type: MongooseSchema.Types.Mixed })
  rawPayload?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ transactionId: 1 });
