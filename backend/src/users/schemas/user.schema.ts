import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, MembershipTier } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
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

  @ApiProperty({ description: 'Wallet available balance in VND', example: 1250000, default: 0 })
  @Prop({ type: Number, default: 0 })
  walletBalance: number;

  @ApiProperty({ description: 'Held balance for ongoing gaming sessions in VND', example: 0, default: 0 })
  @Prop({ type: Number, default: 0 })
  heldBalance: number;

  @ApiProperty({ description: 'Accumulated spending loyalty points', example: 1850, default: 0 })
  @Prop({ type: Number, default: 0 })
  loyaltyPoints: number;

  @ApiProperty({ enum: MembershipTier, default: MembershipTier.MEMBER })
  @Prop({
    type: String,
    enum: Object.values(MembershipTier),
    default: MembershipTier.MEMBER,
  })
  membershipTier: MembershipTier;

  @ApiProperty({ description: 'Tổng chi tiêu trong 12 tháng trượt (VND, BR-16, BR-17)', default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  rolling12MonthSpend: number;

  @ApiProperty({ description: 'Tổng chi tiêu trọn đời (VND)', default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  totalLifetimeSpend: number;

  @ApiProperty({ description: 'Thời điểm thăng hạng gần nhất', required: false })
  @Prop({ type: Date })
  tierUpgradedAt?: Date;

  @ApiProperty({ description: 'Thời điểm đánh giá lại hạng (12 tháng sau khi thăng hạng)', required: false })
  @Prop({ type: Date })
  tierExpiresAt?: Date;

  @ApiProperty({ description: 'Face ID biometric vector string', required: false })
  @Prop({ type: String })
  faceIdVector?: string;

  @ApiProperty({ description: 'Is Face ID activated for turnstile access', default: false })
  @Prop({ type: Boolean, default: false })
  isFaceIdActive: boolean;

  @ApiProperty({ description: 'Avatar image URL', required: false })
  @Prop({ type: String })
  avatarUrl?: string;

  @ApiProperty({ description: 'Active status', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Firebase Cloud Messaging push notification token', required: false })
  @Prop({ type: String })
  fcmToken?: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ membershipTier: 1, rolling12MonthSpend: 1 });
UserSchema.index({ loyaltyPoints: 1 });
