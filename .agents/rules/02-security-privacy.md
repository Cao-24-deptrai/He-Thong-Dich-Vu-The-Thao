---
trigger: always_on
description: Quy tắc bảo mật và dữ liệu cá nhân bắt buộc (xác thực, OTP, phân quyền, webhook, log, sinh trắc học).
---

# Bảo mật và dữ liệu cá nhân

- **Phân quyền ở backend** (RBAC theo khóa quyền như `booking.cancel.any`, `wallet.adjust`). Không tin ẩn/hiện nút ở giao diện. Mặc định từ chối.
- **Xác thực**: mật khẩu băm Argon2id; access token 15 phút; refresh token xoay vòng, lưu dạng băm. OTP 6 số, hiệu lực 5 phút, tối đa 5 lần sai, gửi lại cách 60 giây. Nhân viên luôn cần OTP khi đăng nhập; mọi nạp/rút ví cần OTP.
- **Webhook**: xác minh chữ ký trên **raw body**, kiểm tra IP nếu cổng hỗ trợ, khử trùng, không tin dữ liệu chưa xác minh.
- **Không log** mật khẩu, OTP, token, số thẻ, mẫu vân tay, toàn bộ số điện thoại (che dạng `09xx***123`). Cấu hình redaction của pino ngay từ đầu.
- **Sinh trắc học (vân tay)**: chỉ lưu khi có sự đồng ý rõ ràng (ghi thời điểm + phiên bản điều khoản); mã hóa cấp trường AES-256-GCM, khóa trong KMS/secrets manager; rút đồng ý thì xóa mẫu. Là tùy chọn, không bắt buộc.
- **Dữ liệu cá nhân**: thu thập tối thiểu; nhân viên thu ngân chỉ thấy số điện thoại đã che một phần; xuất dữ liệu cần quyền riêng.
- **Đầu vào**: validate mọi thứ bằng zod ở biên (controller, webhook, WebSocket, client .NET→server). Truy vấn MongoDB không ghép chuỗi từ input; chặn toán tử `$` trong input người dùng.
- **Giới hạn tốc độ** cho đăng nhập, OTP, đặt sân, đăng ký; CAPTCHA ở đăng ký.
- **Bí mật** chỉ trong biến môi trường/secrets manager; mỗi thiết bị (Gaming client, Bridge agent) có token riêng, thu hồi được.
- PR chạm vào xác thực, phân quyền, tiền, webhook, sinh trắc học: chạy skill `security-review` trước khi báo hoàn thành.
