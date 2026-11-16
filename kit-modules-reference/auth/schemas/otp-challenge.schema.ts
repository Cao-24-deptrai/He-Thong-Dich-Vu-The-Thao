import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpChallengeDocument = OtpChallenge & Document;

@Schema({ collection: 'otp_challenges', timestamps: { createdAt: true, updatedAt: false } })
export class OtpChallenge {
  @Prop({ required: true, index: true })
  phone!: string;

  @Prop({ required: true })
  codeHash!: string;

  @Prop({ required: true, enum: ['REGISTER', 'LOGIN', 'RESET_PASSWORD', 'VERIFY_PHONE'] })
  purpose!: string;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: 5 })
  maxAttempts!: number;

  @Prop({ required: true, index: { expires: 0 } }) // MongoDB TTL index tự động dọn dẹp khi hết hạn
  expiresAt!: Date;

  @Prop()
  usedAt?: Date;

  createdAt!: Date;
}

export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);
OtpChallengeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
