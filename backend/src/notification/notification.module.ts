import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationTemplate, NotificationTemplateSchema } from './schemas/notification-template.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationService],
  exports: [NotificationService, MongooseModule],
})
export class NotificationModule {}
