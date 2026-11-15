import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '../../common/enums';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ collection: 'notification_logs', timestamps: true })
export class NotificationLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Notification', index: true })
  notificationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationChannel, index: true })
  channel: NotificationChannel;

  @Prop()
  recipientTarget?: string; // Số ĐT (SMS/ZNS) hoặc FCM Device Token

  @Prop({ required: true, enum: NotificationStatus, default: NotificationStatus.SENT })
  status: NotificationStatus;

  @Prop({ type: Object })
  providerResponse?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  createdAt: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
NotificationLogSchema.index({ createdAt: -1 });
