import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationService } from './notification.service.js';
import { Notification } from '../schemas/notification.schema.js';
import { NotificationTemplate } from '../schemas/notification-template.schema.js';
import { NotificationLog } from '../schemas/notification-log.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  MockPushAdapterService,
  MockZnsAdapterService,
  MockEmailAdapterService,
} from './mock-channel-adapter.service.js';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
} from '@sports/contracts';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotificationModel: any;
  let mockTemplateModel: any;
  let mockLogModel: any;
  let mockUserModel: any;
  let mockSettingsService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;
  let mockPushAdapter: any;
  let mockZnsAdapter: any;
  let mockEmailAdapter: any;

  const inMemoryNotifications: any[] = [];
  const inMemoryTemplates: any[] = [];
  const inMemoryLogs: any[] = [];
  const inMemoryUsers: any[] = [];

  beforeEach(async () => {
    inMemoryNotifications.length = 0;
    inMemoryTemplates.length = 0;
    inMemoryLogs.length = 0;
    inMemoryUsers.length = 0;

    mockNotificationModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryNotifications.findIndex((n) => n.id === doc.id);
          if (index >= 0) inMemoryNotifications[index] = doc;
          else inMemoryNotifications.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockNotificationModel.create = jest.fn().mockImplementation(async (data) => {
      const doc = mockNotificationModel(data);
      inMemoryNotifications.push(doc);
      return doc;
    });

    mockNotificationModel.find = jest.fn().mockImplementation((filter) => {
      let result = [...inMemoryNotifications];
      if (filter?.userId) {
        result = result.filter((n) => n.userId?.toString() === filter.userId.toString());
      }
      if (filter?.isRead !== undefined) {
        result = result.filter((n) => n.isRead === filter.isRead);
      }
      return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(result),
      };
    });

    mockNotificationModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryNotifications.find(
          (n) => n._id.toString() === query._id?.toString() && n.userId.toString() === query.userId?.toString(),
        ) || null;
      }),
    }));

    mockNotificationModel.countDocuments = jest.fn().mockImplementation((filter) => {
      let result = [...inMemoryNotifications];
      if (filter?.userId) {
        result = result.filter((n) => n.userId?.toString() === filter.userId.toString());
      }
      if (filter?.isRead !== undefined) {
        result = result.filter((n) => n.isRead === filter.isRead);
      }
      return {
        exec: jest.fn().mockResolvedValue(result.length),
      };
    });

    mockNotificationModel.updateMany = jest.fn().mockImplementation((filter, update) => ({
      exec: jest.fn().mockImplementation(async () => {
        let count = 0;
        for (const n of inMemoryNotifications) {
          if (n.userId.toString() === filter.userId.toString() && n.isRead === filter.isRead) {
            n.isRead = update.$set.isRead;
            n.readAt = update.$set.readAt;
            count++;
          }
        }
        return { modifiedCount: count };
      }),
    }));

    mockTemplateModel = {
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryTemplates.length),
      })),
      insertMany: jest.fn().mockImplementation(async (items) => {
        inMemoryTemplates.push(...items);
        return items;
      }),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryTemplates.find((t) => t.code === query.code) || null;
        }),
      })),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryTemplates),
      })),
    };

    mockLogModel = {
      create: jest.fn().mockImplementation(async (data) => {
        const doc = {
          ...data,
          _id: new Types.ObjectId(),
          id: new Types.ObjectId().toString(),
          createdAt: new Date(),
        };
        inMemoryLogs.push(doc);
        return doc;
      }),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryLogs.find((l) => l.idempotencyKey === query.idempotencyKey) || null;
        }),
      })),
      find: jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(inMemoryLogs),
      })),
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryLogs.length),
      })),
      aggregate: jest.fn().mockImplementation(async () => {
        const total = inMemoryLogs
          .filter((l) => l.channel === NotificationChannel.ZNS && l.status !== NotificationStatus.FAILED)
          .reduce((sum, l) => sum + (l.cost || 0), 0);
        return [{ _id: null, totalCost: total }];
      }),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryUsers.find((u) => u.id === id.toString()) || null;
        }),
      })),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
    };

    mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    mockPushAdapter = {
      channel: NotificationChannel.PUSH,
      send: jest.fn().mockResolvedValue({
        success: true,
        provider: 'FCM_MOCK',
        providerMsgId: 'fcm-123',
        cost: 0,
      }),
    };

    mockZnsAdapter = {
      channel: NotificationChannel.ZNS,
      send: jest.fn().mockResolvedValue({
        success: true,
        provider: 'ZALO_ZNS_MOCK',
        providerMsgId: 'zns-123',
        cost: 300,
      }),
    };

    mockEmailAdapter = {
      channel: NotificationChannel.EMAIL,
      send: jest.fn().mockResolvedValue({
        success: true,
        provider: 'EMAIL_MOCK',
        providerMsgId: 'email-123',
        cost: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
        { provide: getModelToken(NotificationTemplate.name), useValue: mockTemplateModel },
        { provide: getModelToken(NotificationLog.name), useValue: mockLogModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: MockPushAdapterService, useValue: mockPushAdapter },
        { provide: MockZnsAdapterService, useValue: mockZnsAdapter },
        { provide: MockEmailAdapterService, useValue: mockEmailAdapter },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    await service.onModuleInit();
  });

  describe('Template & Rendering', () => {
    it('should seed default templates on module init', () => {
      expect(inMemoryTemplates.length).toBeGreaterThan(0);
      const bookingConfirmed = inMemoryTemplates.find(
        (t) => t.code === NotificationEventType.BOOKING_CONFIRMED,
      );
      expect(bookingConfirmed).toBeDefined();
      expect(bookingConfirmed.isMandatory).toBe(true);
    });

    it('should correctly render variable placeholders {{variable}}', () => {
      const template = 'Chào {{fullName}}, đơn {{bookingCode}} lúc {{startTime}}.';
      const rendered = service.renderTemplate(template, {
        fullName: 'Nguyễn Văn A',
        bookingCode: 'BKG-001',
        startTime: '18:00',
      });
      expect(rendered).toBe('Chào Nguyễn Văn A, đơn BKG-001 lúc 18:00.');
    });
  });

  describe('send notification flow', () => {
    it('should return idempotent replay when key already logged', async () => {
      inMemoryLogs.push({
        idempotencyKey: 'idemp_key_1',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.SENT,
      });

      const res = await service.send({
        userId: new Types.ObjectId().toString(),
        eventCode: NotificationEventType.BOOKING_CONFIRMED,
        variables: {},
        idempotencyKey: 'idemp_key_1',
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe(NotificationChannel.PUSH);
      expect(mockPushAdapter.send).not.toHaveBeenCalled();
    });

    it('should deliver via primary channel (PUSH) and save In-App notification', async () => {
      const userId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: userId,
        id: userId.toString(),
        phone: '0901234567',
        fullName: 'Khách A',
        fcmTokens: ['token_abc'],
        notificationPreferences: { push: true, zns: true, email: true },
      });

      const res = await service.send({
        userId: userId.toString(),
        eventCode: NotificationEventType.BOOKING_CONFIRMED,
        variables: {
          fullName: 'Khách A',
          bookingCode: 'BKG-123456',
          courtName: 'Sân Pickleball VIP 1',
          startTime: '17:30',
          amount: 150000,
        },
        idempotencyKey: 'idemp_send_success',
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe(NotificationChannel.PUSH);
      expect(mockPushAdapter.send).toHaveBeenCalled();
      // Should save In-App notification
      expect(inMemoryNotifications).toHaveLength(1);
      expect(inMemoryNotifications[0].title).toBe('Đặt sân thành công');
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'notification.sent' }),
      );
    });

    it('should fallback to ZNS when primary channel (PUSH) fails (F09.3)', async () => {
      mockPushAdapter.send.mockRejectedValue(new Error('FCM token expired'));

      const userId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: userId,
        id: userId.toString(),
        phone: '0901234567',
        fullName: 'Khách B',
        notificationPreferences: { push: true, zns: true, email: true },
      });

      const res = await service.send({
        userId: userId.toString(),
        eventCode: NotificationEventType.BOOKING_CONFIRMED,
        variables: {
          fullName: 'Khách B',
          bookingCode: 'BKG-777',
          courtName: 'Sân Tennis 1',
          startTime: '08:00',
          amount: 200000,
        },
        idempotencyKey: 'idemp_fallback_zns',
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe(NotificationChannel.ZNS);
      expect(mockZnsAdapter.send).toHaveBeenCalled();
      const lastLog = inMemoryLogs.find((l) => l.idempotencyKey === 'idemp_fallback_zns');
      expect(lastLog?.status).toBe(NotificationStatus.FALLBACK);
      expect(lastLog?.cost).toBe(300);
    });

    it('should skip ZNS and fallback to EMAIL when daily ZNS budget is exceeded (F09.6)', async () => {
      mockPushAdapter.send.mockRejectedValue(new Error('FCM unreachable'));
      // Giả lập vượt ngân sách ZNS (đã dùng 500.000 / 500.000)
      mockLogModel.aggregate.mockResolvedValueOnce([{ _id: null, totalCost: 500000 }]);

      const userId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: userId,
        id: userId.toString(),
        phone: '0901234567',
        email: 'khachc@example.com',
        fullName: 'Khách C',
        notificationPreferences: { push: true, zns: true, email: true },
      });

      const res = await service.send({
        userId: userId.toString(),
        eventCode: NotificationEventType.BOOKING_CONFIRMED,
        variables: {
          fullName: 'Khách C',
          bookingCode: 'BKG-888',
          courtName: 'Sân Bóng Rổ',
          startTime: '19:00',
          amount: 180000,
        },
        idempotencyKey: 'idemp_skip_zns_over_budget',
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe(NotificationChannel.EMAIL);
      expect(mockZnsAdapter.send).not.toHaveBeenCalled();
      expect(mockEmailAdapter.send).toHaveBeenCalled();
    });

    it('should ignore customer preferences for mandatory events like OTP and BOOKING_CONFIRMED', async () => {
      const userId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: userId,
        id: userId.toString(),
        phone: '0901234567',
        fullName: 'Khách D',
        // Khách cố tình tắt hết kênh
        notificationPreferences: { push: false, zns: false, email: false },
      });

      const res = await service.send({
        userId: userId.toString(),
        eventCode: NotificationEventType.BOOKING_CONFIRMED,
        variables: {
          fullName: 'Khách D',
          bookingCode: 'BKG-999',
          courtName: 'Sân Cầu Lông 1',
          startTime: '20:00',
          amount: 120000,
        },
        idempotencyKey: 'idemp_mandatory_override',
      });

      expect(res.success).toBe(true);
      expect(mockPushAdapter.send).toHaveBeenCalled();
    });

    it('should honor customer preferences when event is not mandatory', async () => {
      const userId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: userId,
        id: userId.toString(),
        phone: '0901234567',
        fullName: 'Khách E',
        // Tắt push, chỉ bật email
        notificationPreferences: { push: false, zns: false, email: true },
      });

      const res = await service.send({
        userId: userId.toString(),
        eventCode: NotificationEventType.BOOKING_REMINDER,
        variables: {
          fullName: 'Khách E',
          bookingCode: 'BKG-111',
          courtName: 'Sân 5-1',
          startTime: '16:00',
        },
        idempotencyKey: 'idemp_honor_prefs',
      });

      // BOOKING_REMINDER không bật email, khách tắt push và zns -> không gửi được kênh nào
      expect(res.success).toBe(false);
      expect(mockPushAdapter.send).not.toHaveBeenCalled();
    });
  });

  describe('In-App Notification Center', () => {
    it('should return unread count and paginated notifications', async () => {
      const userId = new Types.ObjectId();
      inMemoryNotifications.push(
        {
          _id: new Types.ObjectId(),
          id: 'n1',
          userId,
          title: 'Tin 1',
          body: 'Nội dung 1',
          type: NotificationEventType.BOOKING_CONFIRMED,
          isRead: false,
          createdAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          id: 'n2',
          userId,
          title: 'Tin 2',
          body: 'Nội dung 2',
          type: NotificationEventType.PAYMENT_SUCCESS,
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(),
        },
      );

      const count = await service.getUnreadCount(userId.toString());
      expect(count).toBe(1);

      const list = await service.findMyNotifications(userId.toString(), { page: 1, limit: 10 });
      expect(list.total).toBe(2);
      expect(list.unreadCount).toBe(1);
    });

    it('should mark a single notification as read', async () => {
      const userId = new Types.ObjectId();
      const notifId = new Types.ObjectId();
      const notifDoc = mockNotificationModel({
        _id: notifId,
        id: notifId.toString(),
        userId,
        title: 'Tin chưa đọc',
        body: 'Nội dung',
        type: NotificationEventType.BOOKING_CONFIRMED,
        isRead: false,
      });
      inMemoryNotifications.push(notifDoc);

      const res = await service.markAsRead(userId.toString(), notifId.toString());
      expect(res.isRead).toBe(true);
      expect(res.readAt).toBeDefined();
    });

    it('should mark all notifications as read for a user', async () => {
      const userId = new Types.ObjectId();
      inMemoryNotifications.push(
        mockNotificationModel({
          _id: new Types.ObjectId(),
          userId,
          title: 'Tin 1',
          body: 'Body 1',
          type: NotificationEventType.BOOKING_CONFIRMED,
          isRead: false,
        }),
        mockNotificationModel({
          _id: new Types.ObjectId(),
          userId,
          title: 'Tin 2',
          body: 'Body 2',
          type: NotificationEventType.BOOKING_CONFIRMED,
          isRead: false,
        }),
      );

      const res = await service.markAllAsRead(userId.toString());
      expect(res.updatedCount).toBe(2);
    });
  });

  describe('Preferences', () => {
    it('should update and return user notification preferences', async () => {
      const userId = new Types.ObjectId();
      const userDoc = {
        _id: userId,
        id: userId.toString(),
        notificationPreferences: { push: true, zns: true, email: true },
        save: jest.fn().mockResolvedValue(true),
      };
      inMemoryUsers.push(userDoc);

      const updated = await service.updatePreferences(userId.toString(), {
        push: true,
        zns: false,
        email: true,
      });

      expect(updated.zns).toBe(false);
      expect(userDoc.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found when getting preferences', async () => {
      await expect(
        service.getPreferences(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Admin Operations', () => {
    it('should return daily cost report with breakdown and remaining budget', async () => {
      inMemoryLogs.push(
        {
          channel: NotificationChannel.PUSH,
          cost: 0,
          createdAt: new Date(),
        },
        {
          channel: NotificationChannel.ZNS,
          cost: 300,
          createdAt: new Date(),
        },
        {
          channel: NotificationChannel.ZNS,
          cost: 300,
          createdAt: new Date(),
        },
      );

      const report = await service.getDailyCostReport();
      expect(report.totalMessages).toBe(3);
      expect(report.totalCost).toBe(600);
      expect(report.dailyLimit).toBe(500000);
      expect(report.remainingBudget).toBe(499400);
      expect(report.channelBreakdown[NotificationChannel.ZNS]?.count).toBe(2);
      expect(report.channelBreakdown[NotificationChannel.ZNS]?.cost).toBe(600);
    });
  });
});
