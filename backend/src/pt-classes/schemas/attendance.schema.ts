import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AttendanceRecordDocument = AttendanceRecord & Document;

@Schema({ timestamps: true, collection: 'attendance_records' })
export class AttendanceRecord {
  @ApiProperty({ description: 'Staff Profile ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  staffId: Types.ObjectId;

  @ApiProperty({ description: 'Shift ID (optional)' })
  @Prop({ type: Types.ObjectId, ref: 'StaffShift', index: true })
  shiftId?: Types.ObjectId;

  @ApiProperty({ description: 'Check-in timestamp' })
  @Prop({ type: Date, required: true })
  checkInAt: Date;

  @ApiProperty({ description: 'Check-out timestamp' })
  @Prop({ type: Date })
  checkOutAt?: Date;

  @ApiProperty({ description: 'Total worked minutes', default: 0 })
  @Prop({ default: 0 })
  totalWorkedMinutes?: number;

  @ApiProperty({ description: 'Device IP address' })
  @Prop({ trim: true })
  deviceIp?: string;

  @ApiProperty({ description: 'Location' })
  @Prop({ trim: true })
  location?: string;

  @ApiProperty({ description: 'Notes' })
  @Prop({ trim: true })
  note?: string;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
AttendanceRecordSchema.index({ staffId: 1, checkInAt: -1 });
