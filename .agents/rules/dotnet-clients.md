---
trigger: glob
globs: "gaming-client/**, bridge-agent/**"
description: Quy ước .NET cho Gaming client (WPF, kiosk, offline) và Bridge agent (thiết bị, đồng bộ).
---

# Gaming client và Bridge agent (.NET)

## Chung
- C# với `nullable enable`, `TreatWarningsAsErrors`. Giao tiếp server: HTTPS + WebSocket, token riêng cho từng thiết bị, thu hồi được. Không nhúng bí mật trong mã nhị phân; mã nhị phân **có chữ ký số**.
- **Không tin đồng hồ hệ thống.** Thời gian tham chiếu từ máy chủ; khi offline dùng `Stopwatch` (đồng hồ đơn điệu). Mọi sự kiện có `eventId` (GUID) và `seq` tăng dần để máy chủ khử trùng.
- **Hàng đợi sự kiện offline**: SQLite + mã hóa DPAPI, ghi trước khi gửi, xóa sau khi máy chủ xác nhận. Mất điện giữa chừng không được làm mất hay nhân đôi sự kiện.
- Mọi lỗi mạng đều có retry với backoff + jitter; không vòng lặp nóng. Log cục bộ xoay vòng, không ghi dữ liệu nhạy cảm.
- Cập nhật tự động theo đợt, có quay lui khi lỗi.

## Gaming client
- Chế độ kiosk toàn màn hình, chạy khi khởi động, không thoát được khi chưa có phiên; chặn tổ hợp phím thoát, phát hiện tiến trình bị tắt (watchdog). Không dùng cách làm hạ thấp an ninh toàn bộ hệ điều hành.
- Một tài khoản một phiên; tiền tính theo phút do **máy chủ** quyết định, client chỉ hiển thị ước tính.
- Cảnh báo còn 10/5/1 phút; hết phần tạm giữ thì khóa sau thời gian ân hạn cấu hình; mất mạng thì tiếp tục đến hết phần tạm giữ đã có. Chi tiết: skill `gaming-session-billing`.

## Bridge agent
- Mỗi thiết bị (RFID, vân tay, QR, cửa, máy in) là một adapter sau interface chung; thiết bị lỗi không làm sập agent.
- Giữ bản sao **mã hóa** danh sách thành viên còn hạn để cửa vẫn hoạt động khi mất mạng; đồng bộ lại sự kiện vào/ra khi có mạng. Chi tiết: skill `gym-membership-access`.
- Mẫu vân tay không rời thiết bị ở dạng thô; xử lý theo rule `02-security-privacy`.
