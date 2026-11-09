---
name: notification-events
description: Thêm và triển khai sự kiện thông báo (push FCM/APNs, Zalo ZNS, email, OTP) qua outbox và hàng đợi, mẫu thông báo, chuỗi kênh dự phòng, giới hạn chi phí ZNS. Dùng khi làm module notification/M09, thêm một sự kiện cần báo cho khách hoặc nhân viên, sửa mẫu tin, gửi OTP, nhắc lịch.
---

# notification-events

Đọc trước: spec **M09** và **Phụ lục B** (danh mục thông báo).

## Kênh và nguyên tắc
- Kênh: **push** (FCM/APNs), **Zalo ZNS/OA**, **email**. **Không dùng SMS.** OTP gửi qua ZNS, dự phòng email (A12).
- Gửi **bất đồng bộ**: nghiệp vụ ghi sự kiện vào `outbox` **trong cùng transaction**; worker BullMQ đọc, dựng thông báo, gửi. Không gọi nhà cung cấp trong request/transaction nghiệp vụ.
- Thông báo giao dịch bắt buộc (OTP, xác nhận thanh toán, hủy/hoàn) không bị tùy chọn của khách tắt; tin khuyến mãi tôn trọng lựa chọn từ chối.

## Thêm một sự kiện mới (checklist)
1. Đặt tên sự kiện `<module>.<noun>.<verb-past>` (ví dụ `booking.booking.confirmed`) và khóa mẫu `eventKey` (ví dụ `booking.confirmed`).
2. Thêm dòng vào **Phụ lục B** của `docs/SPEC.md` (người nhận, kênh mặc định, ghi chú).
3. Ở nơi phát sinh sự kiện: `outbox.add(eventType, payload, session)` trong transaction.
4. Consumer: ánh xạ `eventType → eventKey`, lấy người nhận, kiểm tra tùy chọn kênh, tạo bản ghi `notifications` (`QUEUED`).
5. Tạo mẫu (`notification_templates`) cho từng kênh: nội dung tiếng Việt, biến `{{name}}`, `{{startTime}}`; ZNS cần `zaloTemplateId` đã được Zalo duyệt.
6. Chuỗi dự phòng: push → ZNS → email theo mức ưu tiên của sự kiện (giao dịch quan trọng đi đủ chuỗi; nhắc nhở thường chỉ push).
7. Test với **kênh giả**: gửi thành công, lỗi tạm thời (thử lại 3 lần, giãn cách tăng dần), lỗi vĩnh viễn (chuyển kênh dự phòng), gửi lặp cùng sự kiện không tạo hai thông báo (khử trùng theo `eventId` + kênh).

## Quy tắc
- **Mẫu ZNS phải được Zalo duyệt trước khi dùng** (mất nhiều ngày): nộp sớm; trong dev dùng kênh giả.
- Giới hạn chi phí ZNS theo ngày (`settings`), vượt ngưỡng thì chuyển sang kênh rẻ hơn và cảnh báo quản lý. Ghi `cost` vào `notifications`.
- **Không đưa dữ liệu nhạy cảm vào nội dung** (không số dư đầy đủ trong push khóa màn hình, không OTP trong log, không toàn bộ số điện thoại).
- Nhắc lịch đặt sân: mặc định trước 2 giờ (`booking.reminderHoursBefore`); sắp hết hạn thẻ gym: 7 ngày và 1 ngày; hết hạn giữ chỗ: còn 2 phút.
- Cảnh báo vận hành cho quản lý/chủ/kỹ thuật (webhook lỗi, `MISMATCH`, hóa đơn lỗi, máy gaming mất kết nối, thiết bị cửa lỗi, gym > 90 người, tồn kho thấp) dùng cùng cơ chế, kênh push/email/Zalo nội bộ.
- Trung tâm thông báo trong app (đã đọc/chưa đọc) dùng collection `notifications`.

## Kiểm thử
Mỗi sự kiện mới có test: sự kiện → đúng người nhận, đúng kênh, đúng mẫu; thử lại/dự phòng; khử trùng. Không gửi thông báo thật trong test.
