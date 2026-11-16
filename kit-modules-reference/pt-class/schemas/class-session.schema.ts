import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ClassType, ClassSessionStatus } from '@sports/shared';

export type ClassSessionDocument = ClassSession & Document;

@Schema({ timestamps: true, collection: 'class_sessions' })
export class ClassSession {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'ClassTemplate' })
  templateId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(ClassType),
    required: true,
  })
  classType!: ClassType;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  trainerName!: string;

  @Prop({ type: Date, required: true, index: true })
  date!: Date; // Ngày diễn ra buổi học

  @Prop({ required: true })
  startTime!: string; // HH:mm

  @Prop({ required: true })
  endTime!: string; // HH:mm

  @Prop({ type: Types.ObjectId, ref: 'Resource' })
  roomOrCourtId?: Types.ObjectId;

  @Prop({ trim: true })
  roomName?: string;

  @Prop({ required: true, min: 1 })
  capacity!: number;

  @Prop({ required: true, default: 0, min: 0 })
  bookedCount!: number; // Số học viên đã đăng ký thành công

  @Prop({ required: true, min: 0 })
  pricePerSession!: number;

  @Prop({
    type: String,
    enum: Object.values(ClassSessionStatus),
    default: ClassSessionStatus.SCHEDULED,
    index: true,
  })
  status!: ClassSessionStatus;
}

export const ClassSessionSchema = SchemaFactory.createForClass(ClassSession);

// Đảm bảo truy vấn lịch của PT và lớp học nhanh chóng
ClassSessionSchema.index({ trainerId: 1, date: 1, status: 1 });
ClassSessionSchema.index({ date: 1, status: 1 });
