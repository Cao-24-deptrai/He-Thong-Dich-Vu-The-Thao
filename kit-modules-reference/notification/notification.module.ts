import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema.js';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema.js';
import {
  NotificationLog,
  NotificationLogSchema,
} from './schemas/notification-log.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { NotificationService } from './services/notification.service.js';
import { NotificationEventConsumerService } from './services/notification-event-consumer.service.js';
import {
  MockPushAdapterService,
  MockZnsAdapterService,
  MockEmailAdapterService,
} from './services/mock-channel-adapter.service.js';
import { NotificationsController } from './controllers/notifications.controller.js';
import { AdminNotificationsController } from './controllers/admin-notifications.controller.js';
import { FacilityModule } from '../facility/facility.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    FacilityModule,
    OutboxModule,
    AuthModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationService,
    NotificationEventConsumerService,
    MockPushAdapterService,
    MockZnsAdapterService,
    MockEmailAdapterService,
  ],
  exports: [
    NotificationService,
    NotificationEventConsumerService,
    MongooseModule,
  ],
})
export class NotificationModule {}
