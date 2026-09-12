import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BookingSource, BookingStatus } from '../../common/enums';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Booking {
  @ApiProperty({ description: 'Customer User ID, null if anonymous walk-in', required: false, default: null })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Venue ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Venue', required: true })
  venueId: Types.ObjectId;

  @ApiProperty({ description: 'Booking date (Date object representing day of booking)', example: '2026-09-15T00:00:00.000Z' })
  @Prop({ type: Date, required: true })
  bookingDate: Date;

  @ApiProperty({ description: 'Start time format HH:mm', example: '18:00' })
  @Prop({ type: String, required: true })
  startTime: string;

  @ApiProperty({ description: 'End time format HH:mm', example: '19:00' })
  @Prop({ type: String, required: true })
  endTime: string;

  @ApiProperty({ description: 'Total price in VND', example: 250000 })
  @Prop({ type: Number, required: true })
  totalPrice: number;

  @ApiProperty({ enum: BookingSource, default: BookingSource.APP })
  @Prop({
    type: String,
    enum: Object.values(BookingSource),
    default: BookingSource.APP,
  })
  bookingSource: BookingSource;

  @ApiProperty({ enum: BookingStatus, default: BookingStatus.HELD })
  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.HELD,
  })
  status: BookingStatus;

  @ApiProperty({ description: 'Expiration time for HELD status (10 mins from creation)', required: false })
  @Prop({ type: Date })
  holdExpiresAt?: Date;

  @ApiProperty({ description: 'Short-lived dynamic QR JWT token for check-in', required: false })
  @Prop({ type: String })
  qrToken?: string;

  @ApiProperty({ description: 'Check-in flag', default: false })
  @Prop({ type: Boolean, default: false })
  isCheckedIn: boolean;

  @ApiProperty({ description: 'Check-in timestamp', required: false })
  @Prop({ type: Date })
  checkedInAt?: Date;

  @ApiProperty({ description: 'Is Walk-In booking flag', default: false, required: false })
  @Prop({ type: Boolean, default: false })
  isWalkIn?: boolean;

  @ApiProperty({ description: 'Customer Name for walk-in or anonymous', required: false })
  @Prop({ type: String })
  customerName?: string;

  @ApiProperty({ description: 'Customer Phone for walk-in or anonymous', required: false })
  @Prop({ type: String })
  customerPhone?: string;

  @ApiProperty({ description: 'Payment method (CASH, VIETQR, PAYOS)', required: false })
  @Prop({ type: String })
  paymentMethod?: string;

  @ApiProperty({ description: 'Staff note', required: false })
  @Prop({ type: String })
  note?: string;

  @ApiProperty({ description: 'Manual refund transaction note', required: false })
  @Prop({ type: String })
  refundNote?: string;

  @ApiProperty({ description: 'Manual refund completion timestamp', required: false })
  @Prop({ type: Date })
  refundedAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// BẮT BUỘC tạo index này ngay khi định nghĩa schema (Mục 3.4 & 4.1):
BookingSchema.index(
  { venueId: 1, bookingDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
    },
  },
);

// Index bổ sung phục vụ truy vấn & cron job quét expired:
BookingSchema.index({ status: 1, holdExpiresAt: 1 });
BookingSchema.index({ userId: 1, createdAt: -1 });
