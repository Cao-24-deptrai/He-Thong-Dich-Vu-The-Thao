import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { StaffEmploymentStatus } from '../../common/enums';

export type StaffProfileDocument = StaffProfile & Document;

@Schema({ timestamps: true, collection: 'staff_profiles' })
export class StaffProfile {
  @ApiProperty({ description: 'User ID linked to profile', example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true, ref: 'User' })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Full name', example: 'Nguyễn Văn Huấn' })
  @Prop({ required: true, trim: true })
  fullName: string;

  @ApiProperty({ description: 'Phone number', example: '0988776655' })
  @Prop({ required: true, trim: true, index: true })
  phone: string;

  @ApiProperty({ description: 'Specialties', example: ['Gym', 'Yoga', 'Boxing', 'Pilates'] })
  @Prop({ type: [String], default: [] })
  specialties: string[];

  @ApiProperty({ description: 'Biography / summary' })
  @Prop({ trim: true })
  bio?: string;

  @ApiProperty({ description: 'Avatar image URL' })
  @Prop({ trim: true })
  avatarUrl?: string;

  @ApiProperty({ description: 'Hourly rate for 1-1 session in VND', example: 250000 })
  @Prop({ required: true, default: 0 })
  hourlyRate: number;

  @ApiProperty({ description: 'Certifications', example: ['NASM-CPT', 'CrossFit Level 1'] })
  @Prop({ type: [String], default: [] })
  certifications: string[];

  @ApiProperty({ enum: StaffEmploymentStatus, default: StaffEmploymentStatus.ACTIVE })
  @Prop({
    type: String,
    enum: Object.values(StaffEmploymentStatus),
    default: StaffEmploymentStatus.ACTIVE,
    index: true,
  })
  employmentStatus: StaffEmploymentStatus;
}

export const StaffProfileSchema = SchemaFactory.createForClass(StaffProfile);
