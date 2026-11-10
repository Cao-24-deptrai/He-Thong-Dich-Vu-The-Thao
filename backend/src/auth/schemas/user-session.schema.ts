import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserSessionDocument = UserSession & Document;

@Schema({ timestamps: true })
export class UserSession {
  @ApiProperty({ description: 'Referenced User ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Unique device identifier', example: 'uuid-device-1234' })
  @Prop({ type: String, required: true })
  deviceId: string;

  @ApiProperty({ description: 'Device human-readable name', example: 'Chrome on Windows 11', required: false })
  @Prop({ type: String })
  deviceName?: string;

  @ApiProperty({ description: 'SHA-256 hashed refresh token for rotation verification' })
  @Prop({ type: String, required: true })
  refreshTokenHash: string;

  @ApiProperty({ description: 'Whether the device is trusted (does not require OTP every login)', default: false })
  @Prop({ type: Boolean, default: false })
  isTrusted: boolean;

  @ApiProperty({ description: 'Trusted validity end date', required: false })
  @Prop({ type: Date })
  trustedUntil?: Date;

  @ApiProperty({ description: 'Timestamp of last activity on this session' })
  @Prop({ type: Date, default: Date.now })
  lastActiveAt: Date;

  @ApiProperty({ description: 'Refresh token expiration date' })
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @ApiProperty({ description: 'Creation date' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Unique index: Mỗi thiết bị của 1 user chỉ có 1 session duy nhất tại 1 thời điểm
UserSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
// TTL index: Tự động dọn session khi đã hết hạn expiresAt
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
