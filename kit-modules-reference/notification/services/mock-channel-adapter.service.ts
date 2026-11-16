import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  NotificationChannel,
} from '@sports/contracts';
import {
  NotificationChannelAdapter,
  SendNotificationParams,
  SendNotificationResult,
} from './channel-adapter.interface.js';

@Injectable()
export class MockPushAdapterService implements NotificationChannelAdapter {
  private readonly logger = new Logger(MockPushAdapterService.name);
  readonly channel = NotificationChannel.PUSH;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    this.logger.log(`[PUSH] Sent to ${params.recipient}: ${params.title} - ${params.body}`);
    return {
      success: true,
      provider: 'FCM_MOCK',
      providerMsgId: `fcm-${crypto.randomUUID()}`,
      cost: 0,
    };
  }
}

@Injectable()
export class MockZnsAdapterService implements NotificationChannelAdapter {
  private readonly logger = new Logger(MockZnsAdapterService.name);
  readonly channel = NotificationChannel.ZNS;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    this.logger.log(`[ZNS] Sent to ${params.recipient}: ${params.body}`);
    return {
      success: true,
      provider: 'ZALO_ZNS_MOCK',
      providerMsgId: `zns-${crypto.randomUUID()}`,
      cost: 300, // 300 VND per ZNS message
    };
  }
}

@Injectable()
export class MockEmailAdapterService implements NotificationChannelAdapter {
  private readonly logger = new Logger(MockEmailAdapterService.name);
  readonly channel = NotificationChannel.EMAIL;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    this.logger.log(`[EMAIL] Sent to ${params.recipient}: ${params.title}`);
    return {
      success: true,
      provider: 'EMAIL_MOCK',
      providerMsgId: `email-${crypto.randomUUID()}`,
      cost: 0,
    };
  }
}
