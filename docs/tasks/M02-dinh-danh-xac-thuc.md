# Kế hoạch triển khai: M02 Định danh, xác thực, phân quyền (Authentication, RBAC & Audit)

Người phụ trách: T1 (Tech Lead) · Giai đoạn: GĐ1 · Ngày công ước lượng (spec 8.2): 45 ngày công

## 1. Phạm vi
- **Làm:**
  - `F02.1`: Đăng ký bằng số điện thoại (bắt buộc, duy nhất), họ tên; xác minh OTP.
  - `F02.2`: Đăng nhập bằng số điện thoại + mật khẩu (Argon2id). Cấp JWT access token (15m) + refresh token (30d) xoay vòng. Yêu cầu OTP khi thiết bị mới. Khóa 15 phút sau 5 lần đăng nhập sai.
  - `F02.3`: Tài khoản nhân viên (bắt buộc OTP mỗi phiên đăng nhập).
  - `F02.4`: Lễ tân tạo nhanh tài khoản cho khách vãng lai tại quầy (nhập SĐT, họ tên).
  - `F02.5`: Phân quyền RBAC động theo khóa quyền chi tiết (`permissions`) & vai trò chuẩn (`Role` enum).
  - `F02.6`: Quản lý phiên/thiết bị (`devices`), đăng xuất từ xa, khóa/mở khóa tài khoản.
  - `F02.7`: Hồ sơ người dùng: cập nhật thông tin cá nhân, thông tin xuất hóa đơn (MST, công ty, địa chỉ), đổi mật khẩu.
  - `F02.8`: Quản lý sự đồng ý (consents): dữ liệu cá nhân, sinh trắc học, quảng cáo kèm thời điểm & phiên bản điều khoản.
  - `F02.10`: Nhật ký thao tác (`audit_logs`) chỉ ghi thêm (append-only), có hash chain nối tiếp (`prevHash`, `hash`) để phát hiện giả mạo.
- **Hoãn / chuyển sang module sau:**
  - `F02.9`: Ẩn danh hóa xóa tài khoản (thuộc tính năng hỗ trợ khách hàng nâng cao ở GĐ5).
  - Tích hợp ZNS thật (ở GĐ0/GĐ1 dùng OTP Mock / Console / Dev Provider có thể cấu hình chuyển sang ZNS khi có tài khoản sandbox).

## 2. Bất biến liên quan (từ rule 00-invariants & 02-security-privacy)
1. **Phân quyền tại backend**: RBAC kiểm tra chặt chẽ ở Guard backend, không tin giao diện. Mặc định từ chối.
2. **Bảo mật mật khẩu & Token**: Mật khẩu băm Argon2id; access token 15 phút; refresh token xoay vòng và lưu dạng hash.
3. **Bảo mật OTP**: OTP 6 chữ số, hiệu lực 5 phút, tối đa 5 lần nhập sai, gửi lại cách nhau tối thiểu 60 giây.
4. **Không log dữ liệu nhạy cảm**: Không log mật khẩu, OTP, token, số điện thoại che dạng `09xx***123`.
5. **Số điện thoại duy nhất**: Chuẩn hóa về định dạng duy nhất toàn hệ thống (`0901234567` hoặc `+84...`).
6. **Nhật ký thao tác (Audit)**: Mọi thay đổi vai trò, khóa tài khoản, đăng nhập thất bại liên tiếp đều ghi `audit_logs` có hash chain.

## 3. Giả định đang dùng (cần xác nhận)
| Mã | Giá trị mặc định đang dùng | Khóa `settings` | Đã xác nhận? |
|---|---|---|---|
| A12 | OTP gửi qua Zalo ZNS / SMS dự phòng; nhân viên luôn cần OTP; khách cần OTP khi đăng nhập thiết bị mới hoặc sau 30 ngày | `auth.otp.provider` | Chờ sandbox ZNS (tạm thời dev log) |
| A14 | Mẫu vân tay mã hóa AES-256-GCM, chỉ lưu khi có sự đồng ý rõ ràng | `security.biometric.enabled` | Đã chốt theo spec |
| A18 | Lễ tân tạo nhanh tài khoản bằng số điện thoại tại quầy cho khách vãng lai | `auth.quickCreate.enabled` | Đã chốt theo spec |

## 4. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `{ phone, fullName, password, consents }` | `{ status: "PENDING_OTP", challengeId }` | `PHONE_EXISTS`, `INVALID_PHONE` |
| POST | `/api/v1/auth/verify-otp` | `{ challengeId, code }` | `{ user, accessToken, refreshToken }` | `OTP_INVALID`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS` |
| POST | `/api/v1/auth/send-otp` | `{ phone, purpose }` | `{ challengeId, waitSeconds }` | `OTP_RATE_LIMITED` |
| POST | `/api/v1/auth/login` | `{ phone, password, deviceId, deviceName }` | `{ user, accessToken, refreshToken }` hoặc `{ requiresOtp: true, challengeId }` | `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` |
| POST | `/api/v1/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` | `INVALID_REFRESH_TOKEN` |
| POST | `/api/v1/auth/logout` | `{ refreshToken }` | `{ success: true }` | None |
| GET | `/api/v1/users/me` | None (Bearer) | `UserProfile` | `UNAUTHORIZED` |
| PATCH | `/api/v1/users/me` | `{ fullName, invoiceInfo, consents }` | `UserProfile` | `UNAUTHORIZED` |
| POST | `/api/v1/users/quick-create` | `{ phone, fullName }` | `{ user, activationSent: true }` | `FORBIDDEN`, `PHONE_EXISTS` |
| GET | `/api/v1/admin/users` | `{ page, limit, role, search }` | `{ items, total }` | `FORBIDDEN` |
| PATCH | `/api/v1/admin/users/:id/role` | `{ role, permissions }` | `{ user }` | `FORBIDDEN`, `CANNOT_CHANGE_OWNER` |
| POST | `/api/v1/admin/users/:id/lock` | `{ reason }` | `{ user }` | `FORBIDDEN` |
| GET | `/api/v1/admin/audit-logs` | `{ page, limit, targetType, actorId }` | `{ items, total }` | `FORBIDDEN` |

## 5. Dữ liệu
- **Collection mới:**
  - `users`: `{ _id, type, phone, email, fullName, passwordHash, status, role, permissions, invoiceInfo, consents, failedLoginAttempts, lockedUntil, createdAt, updatedAt }`
  - `user_sessions` (devices): `{ _id, userId, deviceId, deviceName, refreshTokenHash, isTrusted, trustedUntil, lastActiveAt, expiresAt }`
  - `otp_challenges`: `{ _id, phone, codeHash, purpose, attempts, maxAttempts, expiresAt, usedAt, createdAt }`
  - `audit_logs`: `{ _id, actorId, actorRole, action, targetType, targetId, before, after, ip, userAgent, prevHash, hash, createdAt }`
- **Chỉ mục unique:**
  - `users`: `{ phone: 1 }` (unique)
  - `user_sessions`: `{ userId: 1, deviceId: 1 }` (unique)
  - `otp_challenges`: `{ phone: 1, purpose: 1, createdAt: -1 }` (TTL index trên `expiresAt`)
  - `audit_logs`: `{ targetType: 1, targetId: 1, createdAt: -1 }`
- **Thao tác cần transaction:**
  - Đổi vai trò hoặc khóa tài khoản: cập nhật `users` + thu hồi `user_sessions` + ghi `audit_logs` trong cùng transaction.

## 6. Nghiệp vụ và ngoại lệ
- Khóa tài khoản tạm thời 15 phút nếu nhập sai mật khẩu 5 lần liên tiếp.
- Nhân viên (`STAFF`, `CASHIER`, `MANAGER`, `OWNER`) luôn phải xác thực OTP mỗi khi đăng nhập.
- Mọi thao tác quản trị nhạy cảm (đổi quyền, khóa tài khoản) bắt buộc ghi `audit_logs` có hash chain liên kết bản ghi trước.

## 7. Việc cần làm (theo thứ tự)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Auth/Users/Audit trong `packages/contracts`.
- [x] 2. Tạo Mongoose schemas và indexes: `User`, `UserSession`, `OtpChallenge`, `AuditLog`.
- [x] 3. Cài đặt tiện ích mã hóa: băm mật khẩu Argon2id, băm refresh token SHA-256, hash chain cho audit logs.
- [x] 4. Xây dựng `OtpService`: sinh OTP 6 số, kiểm tra rate limit 60s, kiểm tra tối đa 5 lần thử.
- [x] 5. Xây dựng `AuditLogService`: ghi log thao tác với hash chain bảo vệ tính toàn vẹn.
- [x] 6. Xây dựng `AuthService`: đăng ký, đăng nhập thiết bị mới, refresh token xoay vòng, logout, brute-force lock.
- [x] 7. Xây dựng Guards & Decorators: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `@CurrentUser()`, `@RequirePermissions()`, `@RequireRoles()`.
- [x] 8. Xây dựng `AuthController`, `UsersController`, `AdminUsersController`.
- [x] 9. Viết unit test kiểm tra:
  - Khóa tài khoản sau 5 lần sai (brute-force 15 phút).
  - Phân quyền: Cashier gọi API admin bị từ chối 403 (RolesGuard, PermissionsGuard).
  - Ghi audit log khi thay đổi vai trò (Hash chain linkage).
- [x] 10. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`) đạt 100% thành công.

## 8. Tiêu chí nghiệm thu (từ Spec M02)
- Khách đăng ký, đăng nhập, xác thực OTP thành công.
- Đăng nhập sai 5 lần liên tiếp tài khoản tự động bị khóa 15 phút.
- Phân quyền RBAC hoạt động chuẩn xác: Cashier không thể truy cập API quản trị doanh thu/vai trò (HTTP 403).
- Mọi thay đổi vai trò hoặc khóa tài khoản đều được ghi lại trong `audit_logs`.

## 9. Rủi ro / câu hỏi mở
- Cổng gửi OTP (Zalo ZNS): Trong giai đoạn phát triển cục bộ sẽ dùng DevOtpProvider (in mã OTP ra log hoặc trả về trong response môi trường dev/test) cho tới khi có tài khoản sandbox Zalo ZNS chính thức từ chủ đầu tư.
