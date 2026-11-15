import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NotificationType, NotificationChannel } from '../../common/enums';

export type NotificationTemplateDocument = HydratedDocument<NotificationTemplate>;

@Schema({ collection: 'notification_templates', timestamps: true })
export class NotificationTemplate {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string; // Vd: WALLET_TOPUP_SUCCESS, BOOKING_REMINDER_60M

  @Prop({ required: true })
  titleTemplate: string;

  @Prop({ required: true })
  bodyTemplate: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ type: [String], enum: NotificationChannel, default: [NotificationChannel.IN_APP, NotificationChannel.FCM] })
  channels: NotificationChannel[];

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);
