import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../common/enums';

export type BookingSlotDocument = BookingSlot & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class BookingSlot {
  @ApiProperty({ description: 'Parent Booking ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @ApiProperty({ description: 'Venue ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Venue', required: true })
  venueId: Types.ObjectId;

  @ApiProperty({
    description: 'Physical court / unit ID (e.g. F1, F2, S7-A, S11, or venueId string)',
    example: 'F1',
  })
  @Prop({ type: String, required: true })
  unitId: string;

  @ApiProperty({ description: 'Date in YYYY-MM-DD format', example: '2026-10-31' })
  @Prop({ type: String, required: true })
  date: string;

  @ApiProperty({ description: 'Slot index in the day (0 to 47 for 30-min blocks)', example: 36 })
  @Prop({ type: Number, required: true })
  slotIndex: number;

  @ApiProperty({ description: 'Slot start time format HH:mm', example: '18:00' })
  @Prop({ type: String, required: true })
  startTime: string;

  @ApiProperty({ description: 'Slot end time format HH:mm', example: '18:30' })
  @Prop({ type: String, required: true })
  endTime: string;

  @ApiProperty({ enum: BookingStatus, default: BookingStatus.HELD })
  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.HELD,
  })
  status: BookingStatus;

  @ApiProperty({ description: 'Expiration time for HELD status', required: false })
  @Prop({ type: Date })
  holdExpiresAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const BookingSlotSchema = SchemaFactory.createForClass(BookingSlot);

// LỚP 3 BẢO VỆ: Unique Compound Index chống trùng lặp tuyệt đối
BookingSlotSchema.index(
  { unitId: 1, date: 1, slotIndex: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
    },
  },
);

// Index bổ sung phục vụ truy vấn và giải phóng slot
BookingSlotSchema.index({ bookingId: 1 });
BookingSlotSchema.index({ venueId: 1, date: 1, status: 1 });
BookingSlotSchema.index({ status: 1, holdExpiresAt: 1 });
