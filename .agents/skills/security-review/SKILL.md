---
name: security-review
description: Rà soát bảo mật cho thay đổi chạm vào xác thực, OTP, phân quyền, tiền/ví, webhook thanh toán, sinh trắc học, dữ liệu cá nhân, Gaming client hoặc Bridge agent. Dùng trước khi báo hoàn thành PR loại này, hoặc khi người dùng nói "review bảo mật", "kiểm tra an toàn".
---

# security-review

Chạy khi thay đổi chạm vào: đăng nhập/OTP/phiên, RBAC, ví/tiền, thanh toán/webhook, vân tay/dữ liệu cá nhân, token thiết bị, WebSocket, upload. Nền tảng: rule `02-security-privacy` và `00-invariants`.

## Quy trình
1. Xác định **bề mặt tấn công** của thay đổi: endpoint nào mới/đổi, ai gọi được, dữ liệu nào đi qua.
2. Đi qua checklist bên dưới, chỉ mục liên quan.
3. Chạy công cụ (nếu có): `pnpm audit --prod`, `pnpm lint`, quét bí mật (ví dụ `gitleaks detect`), `pnpm test`, `pnpm test:race`.
4. Báo cáo theo mẫu cuối file. Mọi phát hiện **Nghiêm trọng/Cao** phải sửa trước khi hoàn thành.

## Checklist

**Xác thực và phiên**
- [ ] Mật khẩu băm Argon2id; không log/trả mật khẩu, OTP, token.
- [ ] OTP: 6 số, hiệu lực 5 phút, ≤ 5 lần sai, gửi lại cách 60 giây, ≤ 5 OTP/giờ/số; so sánh hằng thời gian; mã băm khi lưu.
- [ ] Nhân viên luôn OTP; mọi nạp/rút ví cần OTP; khóa 15 phút sau 5 lần đăng nhập sai.
- [ ] Refresh token xoay vòng, lưu băm, thu hồi theo thiết bị; access token 15 phút.

**Phân quyền**
- [ ] Mỗi endpoint có guard + khóa quyền (`x-permission`); mặc định từ chối.
- [ ] Kiểm tra **quyền sở hữu** (khách chỉ truy cập dữ liệu của mình; PT chỉ học viên của mình) — chống IDOR.
- [ ] Thu ngân không xem được doanh thu tổng (T17); không tự nâng quyền; đổi vai trò có audit.

**Tiền và toàn vẹn**
- [ ] Số tiền do server tính; không tin `amount` từ client; số nguyên.
- [ ] Transaction + điều kiện cập nhật + unique index; không có đọc-rồi-ghi cho số dư/tồn kho/bộ đếm.
- [ ] `Idempotency-Key` cho thao tác ghi; không có đường nào trừ ví âm hoặc nhận tiền hai lần.
- [ ] Thao tác nhạy cảm ghi `audit_logs` (ai, lúc nào, trước/sau, lý do).

**Webhook và tích hợp**
- [ ] Xác minh chữ ký trên raw body trước khi parse; khử trùng; kiểm tra IP nếu hỗ trợ; ghi `payment_events`.
- [ ] Số tiền khớp tuyệt đối, lệch → `MISMATCH`. Không tin dữ liệu chuyển hướng từ trình duyệt.
- [ ] Bí mật nằm trong biến môi trường/secrets manager; sandbox ≠ production.

**Dữ liệu cá nhân và sinh trắc**
- [ ] Thu thập tối thiểu; đồng ý rõ ràng được lưu (thời điểm + phiên bản điều khoản); rút đồng ý → xóa mẫu vân tay.
- [ ] Mẫu vân tay mã hóa cấp trường (AES-256-GCM, khóa ở KMS), không log, không rời thiết bị dạng thô.
- [ ] Log đã che số điện thoại/token; pino redaction đúng đường dẫn mới thêm.
- [ ] Quyền xóa/ẩn danh tài khoản hoạt động; dữ liệu tài chính được giữ theo quy định.

**Đầu vào và hạ tầng**
- [ ] zod validate tại biên (controller, webhook, WebSocket, đồng bộ từ client .NET); chặn toán tử `$` trong input vào truy vấn Mongo.
- [ ] Giới hạn tốc độ cho đăng nhập, OTP, đặt sân, đăng ký; CAPTCHA đăng ký.
- [ ] CORS chặt, header bảo mật, không lộ stack trace; WebSocket xác thực khi bắt tay + kiểm tra quyền theo kênh.
- [ ] Phụ thuộc mới: kiểm tra giấy phép và lỗ hổng; ghim phiên bản.

**Gaming client và Bridge agent**
- [ ] Token riêng từng thiết bị, thu hồi được; mã nhị phân có chữ ký số; cập nhật có xác minh chữ ký.
- [ ] Không tin đồng hồ client; số tiền do server quyết định; hàng đợi offline mã hóa.
- [ ] Danh sách thành viên cache ở agent được mã hóa; không chứa dữ liệu thừa.

## Mẫu báo cáo
```
## Rà soát bảo mật: <thay đổi>
Bề mặt: ...
| Mức | Phát hiện | Vị trí | Đề xuất |
| Nghiêm trọng/Cao/Trung bình/Thấp | ... | file:dòng | ... |
Đã chạy: <lệnh + kết quả>
Chưa kiểm tra được: <lý do>
Kết luận: đạt / cần sửa trước khi hoàn thành
```
