import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookingSlotDocument = HydratedDocument<BookingSlot>;

@Schema({ collection: 'booking_slots', timestamps: true })
export class BookingSlot {
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  unitId: string; // Mã đơn vị cơ sở (vd: F1, F2, T1, BB1, R01...)

  @Prop({ required: true, trim: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, type: Number, min: 0, max: 47, index: true })
  slotIndex: number; // 0..47

  @Prop({ required: true, type: Types.ObjectId, ref: 'Booking', index: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true, enum: ['HELD', 'CONFIRMED'], default: 'HELD', index: true })
  status: 'HELD' | 'CONFIRMED';

  @Prop({ type: Date, index: true })
  holdExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const BookingSlotSchema = SchemaFactory.createForClass(BookingSlot);

// Chốt chặn bất biến chống trùng lịch: 1 đơn vị cơ sở chỉ có tối đa 1 booking giữ hoặc đặt tại 1 slot trong ngày
BookingSlotSchema.index({ unitId: 1, date: 1, slotIndex: 1 }, { unique: true });
BookingSlotSchema.index({ status: 1, holdExpiresAt: 1 });
