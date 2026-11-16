import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationTemplate, NotificationTemplateDocument } from './schemas/notification-template.schema';
import { NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';
import { NotificationType, NotificationStatus, NotificationChannel } from '../common/enums';
import { SendBroadcastNotificationDto, SendDirectNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notifModel: Model<NotificationDocument>,
    @InjectModel(NotificationTemplate.name) private readonly templateModel: Model<NotificationTemplateDocument>,
    @InjectModel(NotificationLog.name) private readonly logModel: Model<NotificationLogDocument>,
  ) {}

  async findMyNotifications(userId: string, filter?: { unreadOnly?: boolean; type?: string; page?: number; limit?: number }) {
    const userObjectId = new Types.ObjectId(userId);
    const query: any = { userId: userObjectId };
    if (filter?.unreadOnly) {
      query.isRead = false;
    }
    if (filter?.type) {
      query.type = filter.type;
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notifModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.notifModel.countDocuments(query).exec(),
      this.notifModel.countDocuments({ userId: userObjectId, isRead: false }).exec(),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.notifModel.updateOne(
      { _id: new Types.ObjectId(notificationId), userId: userObjectId },
      { $set: { isRead: true, readAt: new Date() } },
    ).exec();
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.notifModel.updateMany(
      { userId: userObjectId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    ).exec();
    return { success: true };
  }

  async sendDirect(dto: SendDirectNotificationDto) {
    const userObjectId = new Types.ObjectId(dto.userId);
    const notif = new this.notifModel({
      userId: userObjectId,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      channel: dto.channel || NotificationChannel.IN_APP,
      data: dto.data,
      isRead: false,
      status: NotificationStatus.SENT,
    });
    await notif.save();

    // Log outbound message
    const log = new this.logModel({
      notificationId: notif._id,
      userId: userObjectId,
      channel: dto.channel || NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      providerResponse: { messageId: `MSG-${Date.now()}` },
    });
    await log.save();

    return { success: true, notification: notif };
  }

  async sendBroadcast(dto: SendBroadcastNotificationDto) {
    // Demo broadcast: Lưu log chiến dịch
    this.logger.log(`Bắn thông báo đa kênh: "${dto.title}" tới nhóm ${dto.targetAudience || 'ALL'}`);
    return {
      success: true,
      broadcastId: `BC-${Date.now()}`,
      sentCount: 150,
      channels: dto.channels,
      title: dto.title,
    };
  }

  async getRecentLogs(limit = 50) {
    return this.logModel.find().populate('userId', 'fullName phone').sort({ createdAt: -1 }).limit(limit).lean().exec();
  }
}
