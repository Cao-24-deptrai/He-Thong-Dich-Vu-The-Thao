# PHAN-CONG-T7: QA và DevOps

**Kỹ năng:** Kiểm thử tự động, k6, Terraform, Docker, CI/CD, giám sát, bảo mật

**Khối lượng (kế hoạch 8.3):** M23 (110) + M24 (40) + M25 (30) = 180 ngày công (96%)

**Người dự phòng (kế hoạch 8.6):** T6 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (17 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E01 | Xác thực & phân quyền | QA / DevOps | — | Auth, phân quyền | Vy |
| E02 | Danh mục sân & bảng giá | QA / DevOps | — | Cơ sở vật chất M03 | Khang |
| E03 | Đặt sân, giữ chỗ & lịch cố định | QA / DevOps | — | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Vy |
| E04 | Thanh toán VietQR, cứu đơn & hoàn tiền | QA / DevOps | — | Thanh toán M06; US-013 phối hợp với T1 | Huyền |
| E05 | Vé QR & soát vé | QA / DevOps | — | US-010 do T1, quét vé do T3 | Vy |
| E06 | Quầy POS, kho & ca thu ngân | QA / DevOps | — | POS & Kho M12, ca thu ngân | Huyền |
| E07 | Thuê dụng cụ | QA / DevOps | — | Thuê dụng cụ M13 | Trung |
| E08 | Ví nội bộ & sổ cái | QA / DevOps | — | Ví nội bộ M07 | Ngọc |
| E09 | Thuế & hóa đơn điện tử | QA / DevOps | — | Hóa đơn M08, thuế | Ngọc |
| E10 | Thông báo đa kênh | QA / DevOps | — | Thông báo M09 | Ngọc |
| E11 | Gym Face ID & hồ bơi | QA / DevOps | — | Gym M10, hồ bơi | Khang |
| E12 | Khu Gaming & thiết bị | QA / DevOps | — | T2 hỗ trợ phần ví tạm giữ | Phong |
| E13 | Khuyến mãi & hạng khách | QA / DevOps | — | Voucher M15 | Khang |
| E14 | PT, lớp học | QA / DevOps | — | Giải đấu M16, Lớp học/PT M11 | Phong |
| E15 | Đánh giá & cộng đồng | QA / DevOps | — | Đánh giá, cáp kèo | Trung |
| E16 | Báo cáo & kiểm toán | QA / DevOps | — | Dashboard M17 | Huyền |
| E17 | Hạng mục nền (Enabler) | Backend | DevOps | Toàn đội hỗ trợ UAT, Go-Live | Phong |
| E17 | Hạng mục nền (Enabler) | QA / DevOps | — | Toàn đội hỗ trợ UAT, Go-Live | Phong |

### Hiện có trong kit cho các epic này

- **E01 Xác thực & phân quyền:** api: `modules/auth` (đăng ký, OTP, phiên, RBAC, audit-log) · web: `app/(auth)` · admin: `app/(auth)`, `app/users` · mobile: `screens/auth`
- **E02 Danh mục sân & bảng giá:** api: `modules/facility` (resource, price-rule, closure, giờ mở cửa, settings) · admin: `app/facilities`, `app/settings`
- **E03 Đặt sân, giữ chỗ & lịch cố định:** api: `modules/booking` (hold/confirm/cancel, 3 lớp, `POST recurring`, matchmaking) · web: `app/booking`, `app/my-bookings` · mobile: `screens/booking` · admin: `app/bookings`
- **E04 Thanh toán VietQR, cứu đơn & hoàn tiền:** api: `modules/payment` (payment, webhook, vietqr) · mobile: `components/VietQrModal.tsx` · admin: `app/finance`
- **E05 Vé QR & soát vé:** api: QR trong `booking` (check-in), `gym` (qr-token), `rental` · web: `components/qr-code.tsx` · mobile: `components/DynamicQrPass.tsx` · **chưa có app "Staff Desk" riêng**; đầu đọc QR/camera chưa có (bridge-agent chưa tạo)
- **E06 Quầy POS, kho & ca thu ngân:** api: `modules/canteen` (product, order, inventory, cashier-shift) · pos: `app/orders`, `app/shifts`, `app/hardware`, `lib/bridge.ts` · admin: `app/pos`, `app/inventory` · **bridge-agent chưa tạo**
- **E07 Thuê dụng cụ:** api: `modules/rental` (equipment, rental-ticket) · pos: `app/rentals` · admin: `app/rentals`
- **E08 Ví nội bộ & sổ cái:** api: `modules/wallet` (wallet, wallet-ledger) · web: `app/wallet` · mobile: `screens/wallet` · admin: `app/finance`
- **E09 Thuế & hóa đơn điện tử:** api: `modules/invoice` (adapter interface + mock adapter) · web: `app/invoices` · admin: `app/invoices`
- **E10 Thông báo đa kênh:** api: `modules/notification` (template, log, mock channel adapter, consumer outbox) · web: `app/notifications` · mobile: `screens/notifications`
- **E11 Gym Face ID & hồ bơi:** api: `modules/gym` (package, membership, access-event) · web: `app/gym` · mobile: `screens/gym` · admin: `app/gym` · **Face ID và hồ bơi: chưa có trong SPEC lẫn mã**
- **E12 Khu Gaming & thiết bị:** api: `modules/gaming` (machine, session, price-rule), `modules/bridge` · admin: `app/gaming`, `app/bridge` · **gaming-client (C#/.NET) chưa tạo**
- **E13 Khuyến mãi & hạng khách:** api: `modules/promotion` (voucher, combo, user-package) · admin: `app/promotions` · **"hạng khách": chưa có trong SPEC lẫn mã**
- **E14 PT, lớp học:** api: `modules/pt-class`, `modules/tournament` · web: `app/pt-classes`, `app/tournaments` · mobile: `screens/pt`, `screens/tournaments` · admin: `app/pt-classes`, `app/tournaments`
- **E15 Đánh giá & cộng đồng:** **Chưa có module đánh giá.** "Cáp kèo" tương ứng F04.7 (ghép trận/tìm đối thủ) đã có phần đầu trong `modules/booking` (file của T1)
- **E16 Báo cáo & kiểm toán:** api: `modules/analytics` (daily-stats, report), `auth/services/audit-log.service.ts` · admin: `app/page.tsx` (dashboard), `app/finance`
- **E17 Hạng mục nền (Enabler):** `.github/workflows/ci.yml`, `docker-compose.yml`, `modules/testing` · **infra/ (Terraform) và gaming-client chưa tạo**

## 2. Mã nguồn bạn sở hữu

- `.github` (1 tệp)
- `apps/api/src/modules/testing/` (2 tệp, trong đó 2 tệp test)
- `docker-compose.yml` (1 tệp)
- `docker-compose.yml`
- Thư mục chưa có trong kit, sẽ thuộc bạn: `infra/` (Terraform, khi tạo)

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M23-kiem-thu-tu-dong-hoa.md`, `docs/tasks/M24-devops-giam-sat.md`, `docs/tasks/M25-trien-khai-dao-tao.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M01-nen-tang-ky-thuat.md`, `docs/tasks/M04-dat-san.md`, `docs/tasks/M05-vi-noi-bo.md`, `docs/tasks/M06-thanh-toan.md`, `docs/tasks/M10-phong-gym.md`, `docs/tasks/M11-pt-va-lop-hoc.md`, `docs/tasks/M12-canteen-ban-le-kho.md`, `docs/tasks/M14-khu-gaming.md`, `docs/tasks/M16-giai-dau.md`, `docs/tasks/M22-bridge-agent.md`, `docs/tasks/M02-dinh-danh-xac-thuc.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `concurrency-test-kit`, `security-review`, `court-booking-engine`, `wallet-ledger`, `payment-provider-integration`, `gaming-session-billing`, `gym-membership-access`, `pos-inventory-shift`, `tournament-engine`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T7` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `release-checklist`, `backend-nestjs`, `mongodb-data`, `frontend-web`, `mobile-react-native`, `dotnet-clients`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Chiến lược kiểm thử, môi trường, công cụ; tiêu chí nghiệm thu; chuẩn bị Terraform |
| GĐ1 | CI/CD, môi trường dev/staging, sao lưu, giám sát cơ bản; bộ kiểm thử API tự động đầu tiên |
| GĐ2 | Kiểm thử tranh chấp đặt chỗ, thanh toán, hồi quy tự động cho M04, M06; kiểm thử giao diện (Playwright) |
| GĐ3 | Kiểm thử ví đồng thời, bộ đếm gym, offline cửa; kiểm thử POS và kho; chuẩn bị môi trường production |
| GĐ4 | Kiểm thử gaming (mất mạng, mất điện), giải đấu, đặt cố định; chuẩn bị thử tải |
| GĐ5 | Thử tải (k6), điều phối pentest, thử khôi phục, môi trường production, quét bảo mật; tổ chức UAT |
| GĐ6 | Triển khai production, giám sát go-live, quy trình trực, hỗ trợ đào tạo |

## 5. Chỗ lệch cần xác nhận liên quan đến T7

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E17 | Ô đỏ T7 (DevOps) | Ô này tô đỏ trong ảnh. Cần xác nhận ý nghĩa. |
| Kit | Thư mục chưa tồn tại | AGENTS.md nhắc `packages/ui`, `gaming-client/`, `bridge-agent/`, `infra/` nhưng kit chưa có. Khi tạo: `packages/ui` → T4, `gaming-client/` và `bridge-agent/` → T6, `infra/` → T7. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
