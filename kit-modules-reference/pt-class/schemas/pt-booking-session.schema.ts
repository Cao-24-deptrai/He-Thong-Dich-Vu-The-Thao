import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PtSessionStatus, PaymentMethod } from '@sports/shared';

export type PtBookingSessionDocument = PtBookingSession & Document;

@Schema({ timestamps: true, collection: 'pt_booking_sessions' })
export class PtBookingSession {
  @Prop({ required: true, unique: true, index: true })
  sessionCode!: string; // PT-YYYYMMDD-XXXX

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  trainerName!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  customerId!: Types.ObjectId;

  @Prop({ trim: true })
  customerName?: string;

  @Prop({ required: true, trim: true, index: true })
  customerPhone!: string;

  @Prop({ type: Date, required: true, index: true })
  date!: Date; // Ngày tập

  @Prop({ required: true })
  startTime!: string; // HH:mm

  @Prop({ required: true })
  endTime!: string; // HH:mm

  @Prop({ required: true, default: 60 })
  durationMinutes!: number;

  @Prop({ required: true, min: 0 })
  pricePaid!: number;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  })
  paymentMethod!: PaymentMethod;

  @Prop({ type: Types.ObjectId, ref: 'UserPackage' })
  userPackageId?: Types.ObjectId; // Nếu trừ từ gói combo PT

  @Prop({ trim: true })
  notes?: string; // Ghi chú của khách hàng khi đặt

  @Prop({ trim: true })
  fitnessNotes?: string; // Ghi chú thể lực/giáo án của PT sau buổi tập (PT data privacy)

  @Prop({ default: 0 })
  bonusAmount?: number; // Tiền thưởng ca dạy PT nếu có (Integer VND)

  @Prop({
    type: String,
    enum: Object.values(PtSessionStatus),
    default: PtSessionStatus.BOOKED,
    index: true,
  })
  status!: PtSessionStatus;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey!: string;
}

export const PtBookingSessionSchema = SchemaFactory.createForClass(PtBookingSession);

PtBookingSessionSchema.index({ trainerId: 1, date: 1, status: 1 });
PtBookingSessionSchema.index({ customerId: 1, status: 1 });
