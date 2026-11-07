import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
} from '@sports/contracts';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ required: true, trim: true, index: true })
  recipient: string;

  @Prop({ required: true, enum: NotificationChannel, index: true })
  channel: NotificationChannel;

  @Prop({ required: true, enum: NotificationEventType, index: true })
  eventCode: NotificationEventType;

  @Prop({ required: true, enum: NotificationStatus, index: true })
  status: NotificationStatus;

  @Prop({ required: true, trim: true })
  provider: string;

  @Prop({ required: true, default: 0 })
  cost: number;

  @Prop({ trim: true })
  providerMsgId?: string;

  @Prop({ trim: true })
  error?: string;

  @Prop({ required: true, default: 0 })
  retryCount: number;

  @Prop({ required: true, unique: true, trim: true })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

NotificationLogSchema.index({ channel: 1, createdAt: -1 });
NotificationLogSchema.index({ createdAt: -1 });
