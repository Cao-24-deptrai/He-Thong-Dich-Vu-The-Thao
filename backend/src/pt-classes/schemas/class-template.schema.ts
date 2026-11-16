import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ClassType } from '../../common/enums';

export type ClassTemplateDocument = ClassTemplate & Document;

@Schema({ timestamps: true, collection: 'class_templates' })
export class ClassTemplate {
  @ApiProperty({ description: 'Class template name', example: 'Yoga Thư Giãn Buổi Sáng' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiProperty({ description: 'Description' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ enum: ClassType, example: ClassType.YOGA })
  @Prop({
    type: String,
    enum: Object.values(ClassType),
    required: true,
    index: true,
  })
  classType: ClassType;

  @ApiProperty({ description: 'Trainer Staff ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'StaffProfile' })
  trainerId: Types.ObjectId;

  @ApiProperty({ description: 'Trainer Full Name' })
  @Prop({ required: true, trim: true })
  trainerName: string;

  @ApiProperty({ description: 'Max Capacity', example: 20 })
  @Prop({ required: true, min: 1 })
  capacity: number;

  @ApiProperty({ description: 'Price per session in VND', example: 120000 })
  @Prop({ required: true, min: 0 })
  pricePerSession: number;

  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  @Prop({ required: true, default: 60 })
  durationMinutes: number;

  @ApiProperty({ description: 'Days of week [0: CN, 1: T2, 3: T4, 5: T6]', example: [1, 3, 5] })
  @Prop({ type: [Number], required: true })
  daysOfWeek: number[];

  @ApiProperty({ description: 'Default start time (HH:mm)', example: '08:00' })
  @Prop({ required: true })
  defaultStartTime: string;

  @ApiProperty({ description: 'Default end time (HH:mm)', example: '09:00' })
  @Prop({ required: true })
  defaultEndTime: string;

  @ApiProperty({ description: 'Room / Studio name', example: 'Studio Yoga 1' })
  @Prop({ trim: true })
  roomName?: string;

  @ApiProperty({ description: 'Active status', default: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const ClassTemplateSchema = SchemaFactory.createForClass(ClassTemplate);
