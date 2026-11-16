import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema.js';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '../schemas/notification-template.schema.js';
import {
  NotificationLog,
  NotificationLogDocument,
} from '../schemas/notification-log.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
  NotificationPreferencesDto,
  DailyCostReport,
} from '@sports/contracts';
import {
  MockPushAdapterService,
  MockZnsAdapterService,
  MockEmailAdapterService,
} from './mock-channel-adapter.service.js';
import { NotificationChannelAdapter } from './channel-adapter.interface.js';

export interface SendNotificationPayload {
  userId: string;
  eventCode: NotificationEventType;
  variables: Record<string, string | number>;
  idempotencyKey: string;
  forceChannels?: NotificationChannel[];
  extraData?: Record<string, unknown>;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private readonly adapters = new Map<NotificationChannel, NotificationChannelAdapter>();

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationTemplate.name)
    private readonly templateModel: Model<NotificationTemplateDocument>,
    @InjectModel(NotificationLog.name)
    private readonly logModel: Model<NotificationLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly settingsService: SettingsService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
    pushAdapter: MockPushAdapterService,
    znsAdapter: MockZnsAdapterService,
    emailAdapter: MockEmailAdapterService,
  ) {
    this.adapters.set(NotificationChannel.PUSH, pushAdapter);
    this.adapters.set(NotificationChannel.ZNS, znsAdapter);
    this.adapters.set(NotificationChannel.EMAIL, emailAdapter);
  }

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  /**
   * Khởi tạo mẫu thông báo mặc định theo Phụ lục B nếu CSDL trống
   */
  async seedDefaultTemplates() {
    const count = await this.templateModel.countDocuments().exec();
    if (count > 0) return;

    const defaultTemplates: Partial<NotificationTemplate>[] = [
      {
        code: NotificationEventType.OTP_CODE,
        name: 'Mã xác thực OTP',
        isMandatory: true,
        variables: ['otp', 'expiryMinutes'],
        channels: {
          [NotificationChannel.PUSH]: { isEnabled: false, bodyTemplate: '' },
          [NotificationChannel.IN_APP]: { isEnabled: false, bodyTemplate: '' },
          [NotificationChannel.ZNS]: {
            isEnabled: true,
            bodyTemplate:
              'Mã xác thực của bạn tại Tổ hợp Thể thao là {{otp}}. Mã có hiệu lực trong {{expiryMinutes}} phút. Tuyệt đối không chia sẻ mã này.',
          },
          [NotificationChannel.EMAIL]: {
            isEnabled: true,
            titleTemplate: '[Tổ hợp Thể thao] Mã xác thực OTP',
            bodyTemplate:
              'Chào bạn, mã xác thực OTP của bạn là {{otp}}. Mã có hiệu lực trong {{expiryMinutes}} phút.',
          },
        },
      },
      {
        code: NotificationEventType.BOOKING_HELD,
        name: 'Giữ chỗ sân thành công',
        isMandatory: false,
        variables: ['fullName', 'courtName', 'startTime', 'holdExpiresAt'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Giữ chỗ sân',
            bodyTemplate:
              'Sân {{courtName}} lúc {{startTime}} đã được giữ chỗ. Vui lòng thanh toán cọc trước {{holdExpiresAt}}.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Giữ chỗ sân',
            bodyTemplate:
              'Sân {{courtName}} lúc {{startTime}} đã được giữ chỗ. Vui lòng thanh toán cọc trước {{holdExpiresAt}}.',
          },
          [NotificationChannel.ZNS]: { isEnabled: false, bodyTemplate: '' },
          [NotificationChannel.EMAIL]: { isEnabled: false, bodyTemplate: '' },
        },
      },
      {
        code: NotificationEventType.BOOKING_CONFIRMED,
        name: 'Đặt sân thành công',
        isMandatory: true,
        variables: ['fullName', 'bookingCode', 'courtName', 'startTime', 'amount'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Đặt sân thành công',
            bodyTemplate:
              'Đơn {{bookingCode}} tại {{courtName}} lúc {{startTime}} đã được xác nhận. Số tiền: {{amount}}đ.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Đặt sân thành công',
            bodyTemplate:
              'Đơn {{bookingCode}} tại {{courtName}} lúc {{startTime}} đã được xác nhận. Số tiền: {{amount}}đ.',
          },
          [NotificationChannel.ZNS]: {
            isEnabled: true,
            bodyTemplate:
              'Quý khách {{fullName}} đã đặt sân {{courtName}} thành công lúc {{startTime}}. Mã đặt sân: {{bookingCode}}.',
          },
          [NotificationChannel.EMAIL]: {
            isEnabled: true,
            titleTemplate: '[Tổ hợp Thể thao] Xác nhận đặt sân {{bookingCode}}',
            bodyTemplate:
              'Chào {{fullName}}, đơn {{bookingCode}} tại {{courtName}} lúc {{startTime}} đã xác nhận thành công.',
          },
        },
      },
      {
        code: NotificationEventType.BOOKING_REMINDER,
        name: 'Nhắc lịch trước giờ chơi',
        isMandatory: false,
        variables: ['fullName', 'bookingCode', 'courtName', 'startTime'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Nhắc lịch chơi thể thao',
            bodyTemplate:
              'Bạn có lịch đặt sân {{courtName}} lúc {{startTime}}. Vui lòng đến sớm 15 phút.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Nhắc lịch chơi thể thao',
            bodyTemplate:
              'Bạn có lịch đặt sân {{courtName}} lúc {{startTime}}. Vui lòng đến sớm 15 phút.',
          },
          [NotificationChannel.ZNS]: {
            isEnabled: true,
            bodyTemplate:
              'Nhắc lịch: Quý khách {{fullName}} có ca chơi tại {{courtName}} lúc {{startTime}}. Chúc quý khách buổi tập vui vẻ!',
          },
          [NotificationChannel.EMAIL]: { isEnabled: false, bodyTemplate: '' },
        },
      },
      {
        code: NotificationEventType.BOOKING_CANCELLED,
        name: 'Hủy đặt sân & Hoàn tiền',
        isMandatory: true,
        variables: ['fullName', 'bookingCode', 'refundAmount'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Hủy đặt sân thành công',
            bodyTemplate:
              'Đơn {{bookingCode}} đã được hủy. Tiền hoàn: {{refundAmount}}đ đã cộng vào ví của bạn.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Hủy đặt sân thành công',
            bodyTemplate:
              'Đơn {{bookingCode}} đã được hủy. Tiền hoàn: {{refundAmount}}đ đã cộng vào ví của bạn.',
          },
          [NotificationChannel.ZNS]: {
            isEnabled: true,
            bodyTemplate:
              'Đơn {{bookingCode}} của quý khách {{fullName}} đã hủy. Tiền hoàn: {{refundAmount}}đ.',
          },
          [NotificationChannel.EMAIL]: {
            isEnabled: true,
            titleTemplate: '[Tổ hợp Thể thao] Xác nhận hủy đơn {{bookingCode}}',
            bodyTemplate:
              'Chào {{fullName}}, đơn {{bookingCode}} đã hủy thành công. Tiền hoàn: {{refundAmount}}đ.',
          },
        },
      },
      {
        code: NotificationEventType.PAYMENT_SUCCESS,
        name: 'Thanh toán thành công',
        isMandatory: true,
        variables: ['fullName', 'paymentCode', 'amount', 'method'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Thanh toán thành công',
            bodyTemplate:
              'Giao dịch {{paymentCode}} trị giá {{amount}}đ qua {{method}} đã thành công.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Thanh toán thành công',
            bodyTemplate:
              'Giao dịch {{paymentCode}} trị giá {{amount}}đ qua {{method}} đã thành công.',
          },
          [NotificationChannel.ZNS]: { isEnabled: false, bodyTemplate: '' },
          [NotificationChannel.EMAIL]: { isEnabled: false, bodyTemplate: '' },
        },
      },
      {
        code: NotificationEventType.PAYMENT_MISMATCH,
        name: 'Lệch tiền hoặc thanh toán muộn',
        isMandatory: true,
        variables: ['fullName', 'paymentCode', 'receivedAmount', 'reason'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Cảnh báo thanh toán',
            bodyTemplate:
              'Giao dịch {{paymentCode}} nhận {{receivedAmount}}đ: {{reason}}. Tiền đã hoàn về ví.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Cảnh báo thanh toán',
            bodyTemplate:
              'Giao dịch {{paymentCode}} nhận {{receivedAmount}}đ: {{reason}}. Tiền đã hoàn về ví.',
          },
          [NotificationChannel.ZNS]: {
            isEnabled: true,
            bodyTemplate:
              'Giao dịch {{paymentCode}} của {{fullName}} có sự cố: {{reason}}. Tiền đã hoàn về ví nội bộ.',
          },
          [NotificationChannel.EMAIL]: { isEnabled: false, bodyTemplate: '' },
        },
      },
      {
        code: NotificationEventType.WALLET_TOPUP,
        name: 'Nạp ví thành công',
        isMandatory: true,
        variables: ['fullName', 'amount', 'newBalance'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Nạp ví thành công',
            bodyTemplate:
              'Bạn đã nạp thành công {{amount}}đ vào ví. Số dư khả dụng: {{newBalance}}đ.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Nạp ví thành công',
            bodyTemplate:
              'Bạn đã nạp thành công {{amount}}đ vào ví. Số dư khả dụng: {{newBalance}}đ.',
          },
          [NotificationChannel.ZNS]: { isEnabled: false, bodyTemplate: '' },
          [NotificationChannel.EMAIL]: { isEnabled: false, bodyTemplate: '' },
        },
      },
      {
        code: NotificationEventType.INVOICE_ISSUED,
        name: 'Phát hành hóa đơn điện tử',
        isMandatory: false,
        variables: ['fullName', 'invoiceNumber', 'lookupCode', 'pdfUrl'],
        channels: {
          [NotificationChannel.IN_APP]: {
            isEnabled: true,
            titleTemplate: 'Hóa đơn điện tử',
            bodyTemplate:
              'Hóa đơn điện tử số {{invoiceNumber}} đã được phát hành. Mã tra cứu: {{lookupCode}}.',
          },
          [NotificationChannel.PUSH]: {
            isEnabled: true,
            titleTemplate: 'Hóa đơn điện tử',
            bodyTemplate:
              'Hóa đơn điện tử số {{invoiceNumber}} đã được phát hành. Mã tra cứu: {{lookupCode}}.',
          },
          [NotificationChannel.EMAIL]: {
            isEnabled: true,
            titleTemplate: '[Tổ hợp Thể thao] Hóa đơn điện tử số {{invoiceNumber}}',
            bodyTemplate:
              'Chào {{fullName}}, hóa đơn điện tử số {{invoiceNumber}} đã phát hành. Tra cứu tại: {{pdfUrl}}',
          },
          [NotificationChannel.ZNS]: { isEnabled: false, bodyTemplate: '' },
        },
      },
    ];

    await this.templateModel.insertMany(defaultTemplates);
    this.logger.log('Seeded default notification templates successfully');
  }

  /**
   * Thay thế biến số dạng {{key}} trong mẫu tin
   */
  renderTemplate(
    templateStr: string,
    variables: Record<string, string | number>,
  ): string {
    return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }

  /**
   * 1. Gửi thông báo đa kênh kèm Fallback & Retry (F09.1, F09.3)
   */
  async send(payload: SendNotificationPayload): Promise<{ success: boolean; channel?: NotificationChannel }> {
    // 1. Kiểm tra Idempotency
    const existingLog = await this.logModel
      .findOne({ idempotencyKey: payload.idempotencyKey })
      .exec();
    if (existingLog) {
      this.logger.log(`Idempotent notification replay for: ${payload.idempotencyKey}`);
      return { success: existingLog.status !== NotificationStatus.FAILED, channel: existingLog.channel };
    }

    // 2. Tìm người dùng nhận thông báo
    const user = await this.userModel.findById(payload.userId).exec();
    if (!user) {
      this.logger.warn(`User ${payload.userId} not found for notification`);
      return { success: false };
    }

    // 3. Lấy mẫu thông báo
    const template = await this.templateModel
      .findOne({ code: payload.eventCode })
      .exec();
    if (!template) {
      this.logger.warn(`Template not found for event: ${payload.eventCode}`);
      return { success: false };
    }

    // 4. Lưu vào trung tâm thông báo In-App (nếu có cấu hình)
    const inAppConfig = template.channels[NotificationChannel.IN_APP];
    if (inAppConfig && inAppConfig.isEnabled) {
      const inAppTitle = this.renderTemplate(
        inAppConfig.titleTemplate || template.name,
        payload.variables,
      );
      const inAppBody = this.renderTemplate(
        inAppConfig.bodyTemplate,
        payload.variables,
      );

      await this.notificationModel.create({
        userId: user._id,
        title: inAppTitle,
        body: inAppBody,
        type: payload.eventCode,
        data: payload.extraData,
        isRead: false,
      });
    }

    // 5. Chuỗi kênh gửi tin (Channel Chain): PUSH -> ZNS -> EMAIL
    const candidateChannels: NotificationChannel[] = payload.forceChannels || [
      NotificationChannel.PUSH,
      NotificationChannel.ZNS,
      NotificationChannel.EMAIL,
    ];

    const prefs = user.notificationPreferences || { push: true, zns: true, email: true };

    let lastError: string | undefined;
    let selectedChannel: NotificationChannel | undefined;
    let finalStatus = NotificationStatus.FAILED;
    let providerName = 'NONE';
    let messageCost = 0;
    let providerMsgId: string | undefined;

    // Tính chi phí ZNS đã dùng trong ngày
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyZnsLimit = this.settingsService.get<number>(
      'zns.dailyCostLimit',
      500000,
    );

    for (let i = 0; i < candidateChannels.length; i++) {
      const ch = candidateChannels[i]!;
      const chConfig = template.channels[ch];
      if (!chConfig || !chConfig.isEnabled) continue;

      // Kiểm tra tùy chọn nhận tin (Preferences): nếu không phải Mandatory và khách tắt kênh thì bỏ qua
      if (!template.isMandatory) {
        if (ch === NotificationChannel.PUSH && prefs.push === false) continue;
        if (ch === NotificationChannel.ZNS && prefs.zns === false) continue;
        if (ch === NotificationChannel.EMAIL && prefs.email === false) continue;
      }

      // Kiểm tra ngân sách ZNS nếu chọn kênh ZNS
      if (ch === NotificationChannel.ZNS) {
        const spentToday = await this.getZnsCostSpentToday(todayStr);
        if (spentToday + 300 > dailyZnsLimit) {
          this.logger.warn(`Daily ZNS budget exceeded (${spentToday}/${dailyZnsLimit}). Skipping ZNS fallback.`);
          continue; // Fallback sang kênh tiếp theo (Email)
        }
      }

      const adapter = this.adapters.get(ch);
      if (!adapter) continue;

      const title = this.renderTemplate(
        chConfig.titleTemplate || template.name,
        payload.variables,
      );
      const body = this.renderTemplate(chConfig.bodyTemplate, payload.variables);

      let recipient = user.phone;
      if (ch === NotificationChannel.EMAIL) recipient = user.email || user.phone;
      if (ch === NotificationChannel.PUSH) {
        recipient = user.fcmTokens?.length ? user.fcmTokens[0]! : user.phone;
      }

      // Retry tối đa 3 lần cho kênh hiện tại
      let sendSuccess = false;
      let attempts = 0;

      while (!sendSuccess && attempts < 3) {
        attempts++;
        try {
          const res = await adapter.send({
            recipient,
            title,
            body,
            data: payload.extraData,
            channel: ch,
            eventCode: payload.eventCode,
          });

          if (res.success) {
            sendSuccess = true;
            selectedChannel = ch;
            providerName = res.provider;
            messageCost = res.cost;
            providerMsgId = res.providerMsgId;
            finalStatus = i > 0 ? NotificationStatus.FALLBACK : NotificationStatus.SENT;
            break;
          } else {
            lastError = res.error || 'Adapter failed';
          }
        } catch (err: any) {
          lastError = err.message;
        }
      }

      if (sendSuccess) {
        break; // Gửi thành công trên kênh này -> Dừng chuỗi dự phòng
      }
    }

    // Ghi nhật ký NotificationLog
    await this.logModel.create({
      recipient: user.phone,
      channel: selectedChannel || NotificationChannel.PUSH,
      eventCode: payload.eventCode,
      status: finalStatus,
      provider: providerName,
      cost: messageCost,
      providerMsgId,
      error: lastError,
      retryCount: 0,
      idempotencyKey: payload.idempotencyKey,
    });

    if (finalStatus !== NotificationStatus.FAILED) {
      await this.outboxService.recordEvent({
        eventType: 'notification.sent',
        aggregateType: 'notification',
        aggregateId: user.id,
        payload: {
          channel: selectedChannel,
          eventCode: payload.eventCode,
          cost: messageCost,
        },
      });
      return { success: true, channel: selectedChannel };
    }

    await this.outboxService.recordEvent({
      eventType: 'notification.failed',
      aggregateType: 'notification',
      aggregateId: user.id,
      payload: {
        eventCode: payload.eventCode,
        error: lastError,
      },
    });

    return { success: false };
  }

  private async getZnsCostSpentToday(todayStr: string): Promise<number> {
    const start = new Date(`${todayStr}T00:00:00.000Z`);
    const end = new Date(`${todayStr}T23:59:59.999Z`);

    const result = await this.logModel.aggregate([
      {
        $match: {
          channel: NotificationChannel.ZNS,
          status: { $in: [NotificationStatus.SENT, NotificationStatus.FALLBACK] },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
        },
      },
    ]);

    return result[0]?.totalCost || 0;
  }

  /**
   * 2. Danh sách thông báo In-App cá nhân
   */
  async findMyNotifications(
    userId: string,
    query: { unreadOnly?: boolean; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.unreadOnly) {
      filter.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel
        .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
        .exec(),
    ]);

    return {
      items: items.map((doc) => ({
        id: doc.id,
        userId: doc.userId.toString(),
        title: doc.title,
        body: doc.body,
        type: doc.type,
        data: doc.data,
        isRead: doc.isRead,
        readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
        createdAt: doc.createdAt.toISOString(),
      })),
      total,
      unreadCount,
      page,
      limit,
    };
  }

  /**
   * 3. Số thông báo chưa đọc
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
      .exec();
  }

  /**
   * 4. Đánh dấu đã đọc một thông báo
   */
  async markAsRead(userId: string, notificationId: string) {
    const notif = await this.notificationModel
      .findOne({
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!notif) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();

    return {
      id: notif.id,
      userId: notif.userId.toString(),
      title: notif.title,
      body: notif.body,
      type: notif.type,
      data: notif.data,
      isRead: notif.isRead,
      readAt: notif.readAt.toISOString(),
      createdAt: notif.createdAt.toISOString(),
    };
  }

  /**
   * 5. Đánh dấu đọc toàn bộ thông báo
   */
  async markAllAsRead(userId: string) {
    const res = await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      )
      .exec();

    return { updatedCount: res.modifiedCount };
  }

  /**
   * 6. Lấy và cập nhật tùy chọn nhận tin (Preferences)
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user.notificationPreferences || { push: true, zns: true, email: true };
  }

  async updatePreferences(
    userId: string,
    dto: NotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.notificationPreferences = {
      push: dto.push !== undefined ? dto.push : true,
      zns: dto.zns !== undefined ? dto.zns : true,
      email: dto.email !== undefined ? dto.email : true,
    };

    await user.save();
    return user.notificationPreferences;
  }

  /**
   * 7. Quản lý mẫu thông báo (Admin)
   */
  async findAllTemplates() {
    return this.templateModel.find().exec();
  }

  async updateTemplate(
    code: NotificationEventType,
    dto: { name?: string; channels: any },
    actorId?: string,
  ) {
    const template = await this.templateModel.findOne({ code }).exec();
    if (!template) {
      throw new NotFoundException('Không tìm thấy mẫu thông báo');
    }

    if (dto.name) template.name = dto.name;
    if (dto.channels) template.channels = dto.channels;

    const saved = await template.save();

    await this.auditLogService.record({
      actorId,
      action: 'UPDATE_NOTIFICATION_TEMPLATE',
      targetType: 'notification_template',
      targetId: saved.id,
      after: { code: saved.code, name: saved.name },
    });

    return saved;
  }

  /**
   * 8. Báo cáo chi phí ZNS & nhật ký gửi tin (Admin)
   */
  async findAllLogs(query: {
    channel?: NotificationChannel;
    status?: NotificationStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.channel) filter.channel = query.channel;
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.logModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.logModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async getDailyCostReport(dateStr?: string): Promise<DailyCostReport> {
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(`${targetDate}T23:59:59.999Z`);

    const logs = await this.logModel
      .find({ createdAt: { $gte: start, $lte: end } })
      .exec();

    let totalCost = 0;
    const breakdown: Record<string, { count: number; cost: number }> = {};

    for (const log of logs) {
      totalCost += log.cost;
      if (!breakdown[log.channel]) {
        breakdown[log.channel] = { count: 0, cost: 0 };
      }
      breakdown[log.channel]!.count += 1;
      breakdown[log.channel]!.cost += log.cost;
    }

    const dailyLimit = this.settingsService.get<number>(
      'zns.dailyCostLimit',
      500000,
    );

    return {
      date: targetDate,
      totalMessages: logs.length,
      totalCost,
      channelBreakdown: breakdown,
      dailyLimit,
      remainingBudget: Math.max(0, dailyLimit - totalCost),
    };
  }
}
