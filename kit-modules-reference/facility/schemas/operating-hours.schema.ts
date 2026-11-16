import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OperatingHoursDocument = HydratedDocument<OperatingHours>;

@Schema({ _id: false })
export class WeeklyScheduleItem {
  @Prop({ required: true, type: Number, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ required: true })
  openTime: string;

  @Prop({ required: true })
  closeTime: string;

  @Prop({ required: true, default: true })
  isOpen: boolean;
}

const WeeklyScheduleItemSchema = SchemaFactory.createForClass(WeeklyScheduleItem);

@Schema({ _id: false })
export class SpecialDateItem {
  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true })
  openTime: string;

  @Prop({ required: true })
  closeTime: string;

  @Prop({ required: true, default: false })
  isOpen: boolean;

  @Prop()
  reason?: string;
}

const SpecialDateItemSchema = SchemaFactory.createForClass(SpecialDateItem);

@Schema({ collection: 'operating_hours', timestamps: true })
export class OperatingHours {
  @Prop({ required: true, unique: true, default: 'MAIN' })
  facilityId: string;

  @Prop({ type: [WeeklyScheduleItemSchema], default: [] })
  weeklySchedules: WeeklyScheduleItem[];

  @Prop({ type: [SpecialDateItemSchema], default: [] })
  specialDates: SpecialDateItem[];

  @Prop()
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const OperatingHoursSchema = SchemaFactory.createForClass(OperatingHours);
