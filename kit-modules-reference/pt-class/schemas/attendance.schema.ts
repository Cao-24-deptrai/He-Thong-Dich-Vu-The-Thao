import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceRecordDocument = AttendanceRecord & Document;

@Schema({ timestamps: true, collection: 'attendance_records' })
export class AttendanceRecord {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  staffId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'StaffShift', index: true })
  shiftId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  checkInAt!: Date;

  @Prop({ type: Date })
  checkOutAt?: Date;

  @Prop({ default: 0 })
  totalWorkedMinutes?: number;

  @Prop({ trim: true })
  deviceIp?: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  note?: string;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);

AttendanceRecordSchema.index({ staffId: 1, checkInAt: -1 });
