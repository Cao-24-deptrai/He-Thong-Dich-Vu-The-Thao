import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { StaffShiftType } from '../../common/enums';

export type StaffShiftDocument = StaffShift & Document;

@Schema({ timestamps: true, collection: 'staff_shifts' })
export class StaffShift {
  @ApiProperty({ description: 'Staff Profile ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  staffId: Types.ObjectId;

  @ApiProperty({ description: 'Staff Name' })
  @Prop({ required: true, trim: true })
  staffName: string;

  @ApiProperty({ description: 'Shift Date' })
  @Prop({ type: Date, required: true, index: true })
  shiftDate: Date;

  @ApiProperty({ enum: StaffShiftType })
  @Prop({
    type: String,
    enum: Object.values(StaffShiftType),
    required: true,
  })
  shiftType: StaffShiftType;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '12:00' })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({ description: 'Notes' })
  @Prop({ trim: true })
  note?: string;
}

export const StaffShiftSchema = SchemaFactory.createForClass(StaffShift);
StaffShiftSchema.index({ staffId: 1, shiftDate: 1, startTime: 1 });
