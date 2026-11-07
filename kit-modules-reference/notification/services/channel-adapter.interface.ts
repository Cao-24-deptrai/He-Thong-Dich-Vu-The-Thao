import {
  NotificationChannel,
  NotificationEventType,
} from '@sports/contracts';

export interface SendNotificationParams {
  recipient: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel: NotificationChannel;
  eventCode: NotificationEventType;
}

export interface SendNotificationResult {
  success: boolean;
  provider: string;
  providerMsgId?: string;
  cost: number;
  error?: string;
}

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}

export const NOTIFICATION_CHANNEL_ADAPTERS = 'NOTIFICATION_CHANNEL_ADAPTERS';
