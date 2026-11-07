# PHAN-CONG-T1: Tech Lead, Backend lõi

**Kỹ năng:** NestJS, MongoDB (transaction, index), Redis, kiến trúc, đồng thời

**Khối lượng (kế hoạch 8.3):** M01 (30) + M02 (45) + M04 (90) + điều phối/review (20) = 185 ngày công (99%)

**Người dự phòng (kế hoạch 8.6):** T3 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (5 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E01 | Xác thực & phân quyền | Backend | — | Auth, phân quyền | Vy |
| E03 | Đặt sân, giữ chỗ & lịch cố định | Backend | — | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Vy |
| E04 | Thanh toán VietQR, cứu đơn & hoàn tiền | Hỗ trợ (theo ghi chú ảnh) | Thanh toán M06; US-013 phối hợp với T1 | Thanh toán M06; US-013 phối hợp với T1 | Huyền |
| E05 | Vé QR & soát vé | Backend | — | US-010 do T1, quét vé do T3 | Vy |
| E16 | Báo cáo & kiểm toán | Backend | kiểm toán | Dashboard M17 | Huyền |

### Hiện có trong kit cho các epic này

- **E01 Xác thực & phân quyền:** api: `modules/auth` (đăng ký, OTP, phiên, RBAC, audit-log) · web: `app/(auth)` · admin: `app/(auth)`, `app/users` · mobile: `screens/auth`
- **E03 Đặt sân, giữ chỗ & lịch cố định:** api: `modules/booking` (hold/confirm/cancel, 3 lớp, `POST recurring`, matchmaking) · web: `app/booking`, `app/my-bookings` · mobile: `screens/booking` · admin: `app/bookings`
- **E04 Thanh toán VietQR, cứu đơn & hoàn tiền:** api: `modules/payment` (payment, webhook, vietqr) · mobile: `components/VietQrModal.tsx` · admin: `app/finance`
- **E05 Vé QR & soát vé:** api: QR trong `booking` (check-in), `gym` (qr-token), `rental` · web: `components/qr-code.tsx` · mobile: `components/DynamicQrPass.tsx` · **chưa có app "Staff Desk" riêng**; đầu đọc QR/camera chưa có (bridge-agent chưa tạo)
- **E16 Báo cáo & kiểm toán:** api: `modules/analytics` (daily-stats, report), `auth/services/audit-log.service.ts` · admin: `app/page.tsx` (dashboard), `app/finance`

## 2. Mã nguồn bạn sở hữu

- `.gitignore` (1 tệp)
- `.nvmrc` (1 tệp)
- `AGENTS.md` (1 tệp)
- `README-ANTIGRAVITY.md` (1 tệp)
- `apps/api (cấu hình)` (5 tệp)
- `apps/api (khung: main, app.module, common, config, database, redis)` (12 tệp)
- `apps/api/src/modules/auth/` (21 tệp, trong đó 5 tệp test)
- `apps/api/src/modules/booking/` (13 tệp, trong đó 3 tệp test)
- `apps/api/src/modules/health/` (4 tệp, trong đó 1 tệp test)
- `apps/api/src/modules/outbox/` (4 tệp, trong đó 0 tệp test)
- `package.json` (1 tệp)
- `packages` (2 tệp)
- `packages/contracts/src/`: `auth.ts`, `booking.ts`, `healthcheck.ts`, `index.ts`, `problem-details.ts`
- `packages/shared` (9 tệp)
- `pnpm-lock.yaml` (1 tệp)
- `pnpm-workspace.yaml` (1 tệp)
- `tsconfig.base.json` (1 tệp)
- `turbo.json` (1 tệp)
- Gốc repo: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `AGENTS.md`, `README-ANTIGRAVITY.md`, `docs/SPEC.md`, `docs/adr/`
- Khung API dùng chung (`main.ts`, `app.module.ts`, `common/`, `config/`, `database/`, `redis/`) và `packages/shared`
- Module nền: `auth`, `outbox`, `health`

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M01-nen-tang-ky-thuat.md`, `docs/tasks/M02-dinh-danh-xac-thuc.md`, `docs/tasks/M04-dat-san.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M06-thanh-toan.md`, `docs/tasks/M14-khu-gaming.md`, `docs/tasks/M16-giai-dau.md`, `docs/tasks/M17-bao-cao-dashboard.md`, `docs/tasks/M03-co-so-vat-chat-bang-gia.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `nestjs-module-scaffold`, `court-booking-engine`, `security-review`, `wallet-ledger`, `gym-membership-access`, `concurrency-test-kit`, `tournament-engine`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T1` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `backend-nestjs`, `mongodb-data`, `release-checklist`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Thiết kế kiến trúc và sơ đồ dữ liệu; nguyên mẫu kiểm thử tranh chấp đặt chỗ 3 lớp; quy ước mã nguồn và quy trình review; chủ trì chốt giả định kỹ thuật |
| GĐ1 | Khung NestJS, kết nối MongoDB/Redis, idempotency, outbox, logging; M02 hoàn chỉnh (đăng ký, đăng nhập, OTP, phiên, RBAC, audit) |
| GĐ2 | M04: giữ chỗ, sân ghép, transaction, hủy, đổi lịch, check-in, no-show, thêm giờ; tối ưu chỉ mục; hỗ trợ T2 ráp thanh toán xác nhận |
| GĐ3 | Review bảo mật module tiền; hỗ trợ M10 (bộ đếm Lua) và đối soát ví; tối ưu hiệu năng |
| GĐ4 | Hỗ trợ M14 đồng bộ offline; tích hợp khóa tài nguyên cho M16 và M05 với công cụ đặt chỗ |
| GĐ5 | Dẫn đầu thử tải, sửa lỗi hiệu năng và lỗi nghiêm trọng; rà soát bảo mật cùng T7 |
| GĐ6 | Trực kỹ thuật go-live, xử lý sự cố, bàn giao kỹ thuật |

## 5. Chỗ lệch cần xác nhận liên quan đến T1

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E15 | Đánh giá & cộng đồng | Chưa có trong kế hoạch lẫn kit. "Cáp kèo" khớp F04.7 (tìm đối thủ), mã đang nằm trong `modules/booking` của T1. Phần **đánh giá** là phạm vi mới. |
| E05 | Staff Desk | Ảnh giao T5 làm "Staff Desk" nhưng kit không có app này. Giả định tạm: màn hình soát vé nằm trong `apps/pos`. Cần xác nhận. |
| E05 | Mã US-010, US-013 | Ảnh nhắc US-010 và US-013 nhưng kế hoạch và kit không đánh số user story. Cần bảng ánh xạ US ↔ chức năng (F-code) từ người lập ảnh. |
| E04 | "Cứu đơn" | Hiểu là xử lý đơn thanh toán kẹt/lệch (webhook đến muộn, MISMATCH, hoàn tiền vào ví theo kế hoạch 3.6). Cần xác nhận. |
| Kit | Đánh số tài liệu task | Trong `docs/tasks/` M05 là "Ví nội bộ" (kế hoạch gọi là M07) và không có file M07; "đặt cố định" (M05 trong kế hoạch) nằm trong F04.6 của M04. Đã sửa dòng "Người phụ trách" của M04, M05 (ví) và M17 cho khớp ảnh. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
