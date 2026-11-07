import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ClassType } from '@sports/shared';

export type ClassTemplateDocument = ClassTemplate & Document;

@Schema({ timestamps: true, collection: 'class_templates' })
export class ClassTemplate {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ClassType),
    required: true,
    index: true,
  })
  classType!: ClassType;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  trainerName!: string;

  @Prop({ required: true, min: 1 })
  capacity!: number; // Sức chứa tối đa (ví dụ: 20 học viên)

  @Prop({ required: true, min: 0 })
  pricePerSession!: number; // Giá vé buổi học (Integer VND)

  @Prop({ required: true, default: 60 })
  durationMinutes!: number; // Độ dài buổi tập (phút)

  @Prop({ type: [Number], required: true })
  daysOfWeek!: number[]; // [0: CN, 1: T2, 3: T4, 5: T6]

  @Prop({ required: true })
  startTime!: string; // HH:mm

  @Prop({ type: Types.ObjectId, ref: 'Resource' })
  roomOrCourtId?: Types.ObjectId;

  @Prop({ trim: true })
  roomName?: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const ClassTemplateSchema = SchemaFactory.createForClass(ClassTemplate);
