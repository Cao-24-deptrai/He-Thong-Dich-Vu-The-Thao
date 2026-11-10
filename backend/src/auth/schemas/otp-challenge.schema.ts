import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OtpChallengeDocument = OtpChallenge & Document;

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
  STAFF_LOGIN = 'STAFF_LOGIN',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class OtpChallenge {
  @ApiProperty({ description: 'Phone number recipient', example: '0912345678' })
  @Prop({ type: String, required: true, index: true })
  phone: string;

  @ApiProperty({ description: 'SHA-256 hash of the 6-digit OTP code' })
  @Prop({ type: String, required: true })
  codeHash: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @Prop({ type: String, enum: Object.values(OtpPurpose), default: OtpPurpose.LOGIN })
  purpose: OtpPurpose;

  @ApiProperty({ description: 'Current number of verification attempts', default: 0 })
  @Prop({ type: Number, default: 0 })
  attempts: number;

  @ApiProperty({ description: 'Maximum allowed failed attempts before challenge is voided', default: 5 })
  @Prop({ type: Number, default: 5 })
  maxAttempts: number;

  @ApiProperty({ description: 'OTP challenge expiration timestamp (TTL 5 minutes)' })
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @ApiProperty({ description: 'Timestamp when this OTP was successfully verified', required: false })
  @Prop({ type: Date, default: null })
  usedAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);

// Compound index for querying the latest challenge for a phone + purpose
OtpChallengeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
// TTL index: Tự động xóa bản ghi khi hết hạn expiresAt
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
