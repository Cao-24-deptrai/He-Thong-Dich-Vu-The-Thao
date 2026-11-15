import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ClassType, ClassSessionStatus } from '../../common/enums';

export type ClassSessionDocument = ClassSession & Document;

@Schema({ timestamps: true, collection: 'class_sessions' })
export class ClassSession {
  @ApiProperty({ description: 'Class Template ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'ClassTemplate' })
  templateId: Types.ObjectId;

  @ApiProperty({ description: 'Class Session Name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ enum: ClassType })
  @Prop({
    type: String,
    enum: Object.values(ClassType),
    required: true,
  })
  classType: ClassType;

  @ApiProperty({ description: 'Trainer Staff ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId: Types.ObjectId;

  @ApiProperty({ description: 'Trainer Name' })
  @Prop({ required: true, trim: true })
  trainerName: string;

  @ApiProperty({ description: 'Session Date' })
  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '09:00' })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({ description: 'Room / Studio name' })
  @Prop({ trim: true })
  roomName?: string;

  @ApiProperty({ description: 'Max Capacity', example: 20 })
  @Prop({ required: true, min: 1 })
  capacity: number;

  @ApiProperty({ description: 'Current Booked Count', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  bookedCount: number;

  @ApiProperty({ description: 'Price per session in VND' })
  @Prop({ required: true, min: 0 })
  pricePerSession: number;

  @ApiProperty({ enum: ClassSessionStatus, default: ClassSessionStatus.SCHEDULED })
  @Prop({
    type: String,
    enum: Object.values(ClassSessionStatus),
    default: ClassSessionStatus.SCHEDULED,
    index: true,
  })
  status: ClassSessionStatus;

  @ApiProperty({ description: 'Cancel reason if cancelled' })
  @Prop({ trim: true })
  cancelReason?: string;
}

export const ClassSessionSchema = SchemaFactory.createForClass(ClassSession);
ClassSessionSchema.index({ date: 1, startTime: 1, trainerId: 1 });
ClassSessionSchema.index({ templateId: 1, date: 1 });
