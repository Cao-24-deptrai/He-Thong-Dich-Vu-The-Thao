import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NotificationEventType, NotificationChannel } from '@sports/contracts';

export type NotificationTemplateDocument = HydratedDocument<NotificationTemplate>;

export interface ChannelTemplateConfig {
  titleTemplate?: string;
  bodyTemplate: string;
  isEnabled: boolean;
}

@Schema({ timestamps: true, collection: 'notification_templates' })
export class NotificationTemplate {
  @Prop({ required: true, unique: true, enum: NotificationEventType })
  code: NotificationEventType;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Object, required: true })
  channels: Record<NotificationChannel, ChannelTemplateConfig>;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ default: false })
  isMandatory: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);
