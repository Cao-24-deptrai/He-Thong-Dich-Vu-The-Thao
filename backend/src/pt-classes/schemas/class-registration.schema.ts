import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ClassRegistrationStatus, PaymentProvider } from '../../common/enums';

export type ClassRegistrationDocument = ClassRegistration & Document;

@Schema({ timestamps: true, collection: 'class_registrations' })
export class ClassRegistration {
  @ApiProperty({ description: 'Class Session ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'ClassSession' })
  sessionId: Types.ObjectId;

  @ApiProperty({ description: 'Customer User ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  customerId: Types.ObjectId;

  @ApiProperty({ description: 'Customer Name' })
  @Prop({ trim: true })
  customerName?: string;

  @ApiProperty({ description: 'Customer Phone' })
  @Prop({ required: true, trim: true, index: true })
  customerPhone: string;

  @ApiProperty({ description: 'Amount Paid in VND' })
  @Prop({ required: true, min: 0 })
  pricePaid: number;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.VIETQR })
  @Prop({
    type: String,
    enum: Object.values(PaymentProvider),
    default: PaymentProvider.VIETQR,
    required: true,
  })
  paymentMethod: PaymentProvider;

  @ApiProperty({ description: 'Registered timestamp' })
  @Prop({ type: Date, required: true, default: Date.now })
  registeredAt: Date;

  @ApiProperty({ enum: ClassRegistrationStatus, default: ClassRegistrationStatus.REGISTERED })
  @Prop({
    type: String,
    enum: Object.values(ClassRegistrationStatus),
    default: ClassRegistrationStatus.REGISTERED,
    index: true,
  })
  status: ClassRegistrationStatus;

  @ApiProperty({ description: 'Checked in timestamp' })
  @Prop({ type: Date })
  checkedInAt?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  @Prop({ trim: true })
  cancelReason?: string;
}

export const ClassRegistrationSchema = SchemaFactory.createForClass(ClassRegistration);
ClassRegistrationSchema.index({ sessionId: 1, customerId: 1 }, { unique: true });
