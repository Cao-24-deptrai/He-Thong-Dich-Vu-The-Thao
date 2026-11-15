import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { PtSessionStatus, PaymentProvider } from '../../common/enums';

export type PtBookingSessionDocument = PtBookingSession & Document;

@Schema({ timestamps: true, collection: 'pt_booking_sessions' })
export class PtBookingSession {
  @ApiProperty({ description: 'Unique Session Code', example: 'PT-20261102-A1B2' })
  @Prop({ required: true, unique: true, index: true })
  sessionCode: string;

  @ApiProperty({ description: 'Trainer Staff ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId: Types.ObjectId;

  @ApiProperty({ description: 'Trainer Name' })
  @Prop({ required: true, trim: true })
  trainerName: string;

  @ApiProperty({ description: 'Customer User ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  customerId: Types.ObjectId;

  @ApiProperty({ description: 'Customer Name' })
  @Prop({ trim: true })
  customerName?: string;

  @ApiProperty({ description: 'Customer Phone' })
  @Prop({ required: true, trim: true, index: true })
  customerPhone: string;

  @ApiProperty({ description: 'Session Date' })
  @Prop({ type: Date, required: true, index: true })
  sessionDate: Date;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '09:00' })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({ description: 'Duration in minutes', default: 60 })
  @Prop({ required: true, default: 60 })
  durationMinutes: number;

  @ApiProperty({ description: 'Price Paid in VND' })
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

  @ApiProperty({ enum: PtSessionStatus, default: PtSessionStatus.CONFIRMED })
  @Prop({
    type: String,
    enum: Object.values(PtSessionStatus),
    default: PtSessionStatus.CONFIRMED,
    index: true,
  })
  status: PtSessionStatus;

  @ApiProperty({ description: 'Session notes / training goals' })
  @Prop({ trim: true })
  notes?: string;

  @ApiProperty({ description: 'Bonus amount for trainer' })
  @Prop({ default: 0 })
  bonusAmount?: number;
}

export const PtBookingSessionSchema = SchemaFactory.createForClass(PtBookingSession);
PtBookingSessionSchema.index({ trainerId: 1, sessionDate: 1, startTime: 1 });
