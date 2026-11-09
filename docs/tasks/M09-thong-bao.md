# Kế hoạch triển khai: M09 Thông báo (Notifications Engine - Push, Email, Zalo ZNS/OA & In-App Center)

Người phụ trách: T2 (Backend) · Giai đoạn: GĐ2 · Ngày công ước lượng (spec 8.2): 30 ngày công

## 1. Phạm vi
- **Làm:**
  - `F09.1`: Đa kênh thông báo: Push notification (FCM/APNs), Zalo ZNS/OA, Email (SMTP/Resend), và In-App Notification Center.
  - `F09.2`: Quản lý mẫu thông báo (Templates) có biến số (`{{variable}}`), quản lý chỉnh sửa được, hỗ trợ mẫu riêng cho từng kênh theo Phụ lục B.
  - `F09.3`: Hàng đợi gửi tin có cơ chế thử lại (tối đa 3 lần) và chuỗi dự phòng kênh (Channel Fallback: Push thất bại -> ZNS -> Email).
  - `F09.4`: Tùy chọn kênh nhận tin của từng khách hàng (`notificationPreferences`), không áp dụng cho tin bắt buộc (OTP, hóa đơn, thanh toán, hoàn tiền).
  - `F09.5`: Trung tâm thông báo trong app: Danh sách thông báo cá nhân, đếm số tin chưa đọc, đánh dấu đã đọc (`markAsRead`, `markAllAsRead`).
  - `F09.6`: Nhật ký gửi tin (`NotificationLog`), trạng thái giao nhận, theo dõi chi phí ZNS theo ngày và hạn mức chi phí/ngày cấu hình được.
  - `F09.7`: Tiêu thụ sự kiện Outbox tự động từ các module M02, M04, M05, M06, M08.

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Thông báo bắt buộc không thể tắt**: Mã xác thực OTP, cảnh báo bảo mật tài khoản, xác nhận thanh toán/hoàn tiền và hóa đơn không cho phép người dùng tắt nhận.
2. **Idempotency gửi tin**: Mỗi sự kiện gửi tin có `idempotencyKey` duy nhất, không gửi trùng lặp cùng một tin cho khách hàng khi có retry.
3. **Giới hạn ngân sách ZNS**: Chi phí ZNS trong ngày không được vượt quá `zns.dailyCostLimit` cấu hình trong hệ thống để tránh phát sinh chi phí đột biến.
4. **Bảo mật dữ liệu cá nhân (Rule 02)**: Che số điện thoại, email và không đưa thông tin bí mật (mật khẩu, khóa riêng) vào nội dung tin nhắn gửi qua bên thứ ba.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/notifications/me` | `{ page, limit, unreadOnly }` | `NotificationList` | None |
| GET | `/api/v1/notifications/me/unread-count` | None | `{ count: number }` | None |
| PATCH | `/api/v1/notifications/me/:id/read` | None | `NotificationDetail` | `NOT_FOUND` |
| POST | `/api/v1/notifications/me/read-all` | None | `{ updatedCount: number }` | None |
| GET | `/api/v1/notifications/preferences` | None | `NotificationPreferences` | None |
| PUT | `/api/v1/notifications/preferences` | `NotificationPreferencesDto` | `NotificationPreferences` | `VALIDATION_FAILED` |
| GET | `/api/v1/admin/notifications/templates` | None | `TemplateList` | None |
| PUT | `/api/v1/admin/notifications/templates/:code` | `UpdateTemplateDto` | `TemplateDetail` | `NOT_FOUND` |
| GET | `/api/v1/admin/notifications/logs` | `{ channel, status, date, page, limit }` | `NotificationLogList` | None |
| GET | `/api/v1/admin/notifications/cost-report` | `{ date }` | `DailyCostReport` | None |

## 4. Cấu trúc CSDL
- **Collection `notifications` (In-App Center):**
  - `_id`: ObjectId
  - `userId`: ObjectId (index)
  - `title`: string
  - `body`: string
  - `type`: string (e.g. `BOOKING_CONFIRMED`, `PAYMENT_SUCCESS`, `REFUND`)
  - `data`?: Record<string, unknown>
  - `isRead`: boolean (default: false, compound index `{ userId: 1, isRead: 1 }`)
  - `readAt`?: Date
  - `createdAt`: Date
- **Collection `notification_templates`:**
  - `_id`: ObjectId
  - `code`: string (Unique index, e.g. `BOOKING_CONFIRMED`, `OTP_CODE`)
  - `name`: string
  - `channels`: Record<NotificationChannel, { titleTemplate?: string, bodyTemplate: string, isEnabled: boolean }>
  - `variables`: string[]
- **Collection `notification_logs`:**
  - `_id`: ObjectId
  - `recipient`: string (userId, phone, email)
  - `channel`: NotificationChannel (`PUSH`, `ZNS`, `EMAIL`, `IN_APP`)
  - `eventCode`: string
  - `status`: NotificationStatus (`PENDING`, `SENT`, `FAILED`, `FALLBACK`)
  - `provider`: string
  - `cost`: number (Integer VND)
  - `providerMessageId`?: string
  - `error`?: string
  - `retryCount`: number
  - `idempotencyKey`: string (Unique index)
  - `createdAt`: Date

## 5. Kế hoạch thực hiện
- [x] 1. Thêm Zod schemas & hợp đồng API cho Notification trong `packages/contracts/src/notification.ts`.
- [x] 2. Định nghĩa enums trong `@sports/shared` (`NotificationChannel`, `NotificationStatus`, `NotificationType`).
- [x] 3. Tạo Mongoose schemas: `Notification`, `NotificationTemplate`, `NotificationLog`.
- [x] 4. Xây dựng Kiến trúc Channel Adapters:
  - `PushNotificationAdapter` (FCM mock / live).
  - `ZaloZnsAdapter` (ZNS mock / live với tính chi phí).
  - `EmailNotificationAdapter` (Email mock / live).
  - `InAppNotificationAdapter`.
- [x] 5. Xây dựng `NotificationService`:
  - `send(payload)`: Áp dụng kiểm tra tùy chọn kênh của khách hàng, mẫu tin, cơ chế fallback và retry.
  - Xử lý template replacement `{{variable}}`.
  - Kiểm tra hạn mức chi phí ZNS hàng ngày.
- [x] 6. Xây dựng In-app Notification Controller (`NotificationsController`) và Admin Controller (`AdminNotificationsController`).
- [x] 7. Xây dựng `NotificationEventConsumer`: Lắng nghe các Outbox events từ hệ thống và gửi thông báo tương ứng theo Phụ lục B.
- [x] 8. Đăng ký `NotificationModule` vào `app.module.ts`.
- [x] 9. Viết Unit Tests & Fallback Tests cho Notification Module.
- [x] 10. Chạy toàn bộ test suites, typecheck, build.
