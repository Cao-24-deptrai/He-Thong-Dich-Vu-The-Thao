import { z } from 'zod';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
} from '@sports/shared';

export { NotificationChannel, NotificationStatus, NotificationEventType };

// --- 1. Tùy chọn nhận thông báo của người dùng (Preferences) ---
export const notificationPreferencesSchema = z.object({
  push: z.boolean().default(true),
  zns: z.boolean().default(true),
  email: z.boolean().default(true),
});

export type NotificationPreferencesDto = z.input<typeof notificationPreferencesSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

// --- 2. Chi tiết thông báo In-App (In-App Notification) ---
export const notificationDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  type: z.nativeEnum(NotificationEventType),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean(),
  readAt: z.string().optional(),
  createdAt: z.string(),
});

export type NotificationDetail = z.infer<typeof notificationDetailSchema>;

// --- 3. Bộ lọc danh sách thông báo ---
export const notificationListQuerySchema = z.object({
  unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  page: z.preprocess((val) => (val ? parseInt(String(val), 10) : 1), z.number().int().positive().default(1)),
  limit: z.preprocess((val) => (val ? parseInt(String(val), 10) : 20), z.number().int().positive().max(100).default(20)),
});

export type NotificationListQueryDto = z.input<typeof notificationListQuerySchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationDetailSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

// --- 4. Mẫu thông báo (Notification Template) ---
export const channelTemplateSchema = z.object({
  titleTemplate: z.string().optional(),
  bodyTemplate: z.string(),
  isEnabled: z.boolean().default(true),
});

export type ChannelTemplateDto = z.infer<typeof channelTemplateSchema>;

export const notificationTemplateSchema = z.object({
  id: z.string(),
  code: z.nativeEnum(NotificationEventType),
  name: z.string(),
  description: z.string().optional(),
  channels: z.record(z.nativeEnum(NotificationChannel), channelTemplateSchema),
  variables: z.array(z.string()),
  isMandatory: z.boolean().default(false),
});

export type NotificationTemplate = z.infer<typeof notificationTemplateSchema>;

export const updateNotificationTemplateSchema = z.object({
  name: z.string().optional(),
  channels: z.record(z.nativeEnum(NotificationChannel), channelTemplateSchema),
});

export type UpdateNotificationTemplateDto = z.input<typeof updateNotificationTemplateSchema>;

// --- 5. Nhật ký gửi tin & Báo cáo chi phí (Log & Cost) ---
export const notificationLogSchema = z.object({
  id: z.string(),
  recipient: z.string(),
  channel: z.nativeEnum(NotificationChannel),
  eventCode: z.nativeEnum(NotificationEventType),
  status: z.nativeEnum(NotificationStatus),
  provider: z.string(),
  cost: z.number().int().nonnegative(),
  providerMsgId: z.string().optional(),
  error: z.string().optional(),
  retryCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type NotificationLog = z.infer<typeof notificationLogSchema>;

export const dailyCostReportSchema = z.object({
  date: z.string(),
  totalMessages: z.number().int().nonnegative(),
  totalCost: z.number().int().nonnegative(),
  channelBreakdown: z.record(
    z.string(),
    z.object({
      count: z.number().int().nonnegative(),
      cost: z.number().int().nonnegative(),
    }),
  ),
  dailyLimit: z.number().int().nonnegative(),
  remainingBudget: z.number().int().nonnegative(),
});

export type DailyCostReport = z.infer<typeof dailyCostReportSchema>;
