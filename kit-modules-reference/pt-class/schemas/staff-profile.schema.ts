import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StaffEmploymentStatus } from '@sports/shared';

export type StaffProfileDocument = StaffProfile & Document;

@Schema({ timestamps: true, collection: 'staff_profiles' })
export class StaffProfile {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true, index: true })
  phone!: string;

  @Prop({ type: [String], default: [] })
  specialties!: string[]; // Ví dụ: 'Gym', 'Yoga', 'Boxing', 'Pilates'

  @Prop({ trim: true })
  bio?: string;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ required: true, default: 0 })
  hourlyRate!: number; // Đơn giá 1 giờ tập PT (Integer VND)

  @Prop({ type: [String], default: [] })
  certifications!: string[];

  @Prop({
    type: String,
    enum: Object.values(StaffEmploymentStatus),
    default: StaffEmploymentStatus.ACTIVE,
    index: true,
  })
  employmentStatus!: StaffEmploymentStatus;
}

export const StaffProfileSchema = SchemaFactory.createForClass(StaffProfile);

StaffProfileSchema.index({ specialties: 1, employmentStatus: 1 });
