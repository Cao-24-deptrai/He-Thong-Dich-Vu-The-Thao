import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSessionDocument = UserSession & Document;

@Schema({ collection: 'user_sessions', timestamps: { createdAt: true, updatedAt: false } })
export class UserSession {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  deviceId!: string;

  @Prop({ required: true, default: 'Web Browser' })
  deviceName!: string;

  @Prop({ required: true })
  refreshTokenHash!: string;

  @Prop({ default: false })
  isTrusted!: boolean;

  @Prop()
  trustedUntil?: Date;

  @Prop({ default: Date.now })
  lastActiveAt!: Date;

  @Prop({ required: true, index: { expires: 0 } }) // MongoDB TTL index
  expiresAt!: Date;

  createdAt!: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);
UserSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
