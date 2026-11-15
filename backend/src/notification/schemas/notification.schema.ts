import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationType, NotificationStatus, NotificationChannel } from '../../common/enums';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ required: true, enum: NotificationType, default: NotificationType.SYSTEM, index: true })
  type: NotificationType;

  @Prop({ enum: NotificationChannel, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.SENT })
  status: NotificationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
