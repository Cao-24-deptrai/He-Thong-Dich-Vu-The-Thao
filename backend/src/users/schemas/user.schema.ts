import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ description: 'Phone number of the user', example: '0912345678' })
  @Prop({ type: String, required: true, unique: true, index: true })
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

  @ApiProperty({ description: 'List of fine-grained permissions for RBAC', required: false, default: [] })
  @Prop({ type: [String], default: [] })
  permissions: string[];

  @ApiProperty({ description: 'Number of consecutive failed login attempts', default: 0 })
  @Prop({ type: Number, default: 0 })
  failedLoginAttempts: number;

  @ApiProperty({ description: 'Account temporary lock until timestamp (15m after 5 failed attempts)', required: false })
  @Prop({ type: Date, default: null })
  lockedUntil?: Date;

  @ApiProperty({ description: 'Phone number verification status', default: false })
  @Prop({ type: Boolean, default: false })
  isPhoneVerified: boolean;

  @ApiProperty({ description: 'Optional invoice company / tax info for VAT receipt', required: false })
  @Prop({
    type: {
      buyerTaxCode: { type: String },
      companyName: { type: String },
      companyAddress: { type: String },
    },
    default: null,
  })
  invoiceInfo?: {
    buyerTaxCode?: string;
    companyName?: string;
    companyAddress?: string;
  };

  @ApiProperty({ description: 'Firebase Cloud Messaging push notification token', required: false })
  @Prop({ type: String })
  fcmToken?: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
