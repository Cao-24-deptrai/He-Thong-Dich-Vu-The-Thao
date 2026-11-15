import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @ApiProperty({ description: 'Phone number of the user', example: '0912345678' })
  @Prop({ type: String, required: true, unique: true })
  phone: string;

  @ApiProperty({ description: 'Email address of the user', example: 'user@example.com', required: false })
  @Prop({ type: String })
  email?: string;

  @ApiProperty({ description: 'Full name of the user', example: 'Nguyễn Văn A' })
  @Prop({ type: String, required: true })
  fullName: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER })
  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @ApiProperty({ description: 'Firebase Cloud Messaging push notification token', required: false })
  @Prop({ type: String })
  fcmToken?: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
