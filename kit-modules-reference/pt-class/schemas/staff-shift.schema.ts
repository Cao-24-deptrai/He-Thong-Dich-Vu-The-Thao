import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StaffShiftType } from '@sports/shared';

export type StaffShiftDocument = StaffShift & Document;

@Schema({ timestamps: true, collection: 'staff_shifts' })
export class StaffShift {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  staffId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  staffName!: string;

  @Prop({ type: Date, required: true, index: true })
  shiftDate!: Date;

  @Prop({
    type: String,
    enum: Object.values(StaffShiftType),
    required: true,
  })
  shiftType!: StaffShiftType;

  @Prop({ required: true })
  startTime!: string; // HH:mm

  @Prop({ required: true })
  endTime!: string; // HH:mm

  @Prop({ trim: true })
  note?: string;
}

export const StaffShiftSchema = SchemaFactory.createForClass(StaffShift);

StaffShiftSchema.index({ staffId: 1, shiftDate: 1 });
