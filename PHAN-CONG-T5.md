# PHAN-CONG-T5: Mobile và POS

**Kỹ năng:** React Native, React, TypeScript

**Khối lượng (kế hoạch 8.3):** M20 (75) + M21 (50) + M16 (35) + M11 (25) = 185 ngày công (99%)

**Người dự phòng (kế hoạch 8.6):** T4 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (11 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E01 | Xác thực & phân quyền | Frontend / Mobile | Mobile | Auth, phân quyền | Vy |
| E03 | Đặt sân, giữ chỗ & lịch cố định | Frontend / Mobile | Mobile | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Vy |
| E05 | Vé QR & soát vé | Frontend / Mobile | Staff Desk, Mobile | US-010 do T1, quét vé do T3 | Vy |
| E06 | Quầy POS, kho & ca thu ngân | Frontend / Mobile | POS | POS & Kho M12, ca thu ngân | Huyền |
| E07 | Thuê dụng cụ | Frontend / Mobile | — | Thuê dụng cụ M13 | Trung |
| E08 | Ví nội bộ & sổ cái | Frontend / Mobile | — | Ví nội bộ M07 | Ngọc |
| E10 | Thông báo đa kênh | Frontend / Mobile | FCM trên Mobile | Thông báo M09 | Ngọc |
| E11 | Gym Face ID & hồ bơi | Frontend / Mobile | — | Gym M10, hồ bơi | Khang |
| E12 | Khu Gaming & thiết bị | Backend | — | T2 hỗ trợ phần ví tạm giữ | Phong |
| E14 | PT, lớp học | Backend | — | Giải đấu M16, Lớp học/PT M11 | Phong |
| E14 | PT, lớp học | Frontend / Mobile | — | Giải đấu M16, Lớp học/PT M11 | Phong |
| E17 | Hạng mục nền (Enabler) | Backend | — | Toàn đội hỗ trợ UAT, Go-Live | Phong |

### Hiện có trong kit cho các epic này

- **E01 Xác thực & phân quyền:** api: `modules/auth` (đăng ký, OTP, phiên, RBAC, audit-log) · web: `app/(auth)` · admin: `app/(auth)`, `app/users` · mobile: `screens/auth`
- **E03 Đặt sân, giữ chỗ & lịch cố định:** api: `modules/booking` (hold/confirm/cancel, 3 lớp, `POST recurring`, matchmaking) · web: `app/booking`, `app/my-bookings` · mobile: `screens/booking` · admin: `app/bookings`
- **E05 Vé QR & soát vé:** api: QR trong `booking` (check-in), `gym` (qr-token), `rental` · web: `components/qr-code.tsx` · mobile: `components/DynamicQrPass.tsx` · **chưa có app "Staff Desk" riêng**; đầu đọc QR/camera chưa có (bridge-agent chưa tạo)
- **E06 Quầy POS, kho & ca thu ngân:** api: `modules/canteen` (product, order, inventory, cashier-shift) · pos: `app/orders`, `app/shifts`, `app/hardware`, `lib/bridge.ts` · admin: `app/pos`, `app/inventory` · **bridge-agent chưa tạo**
- **E07 Thuê dụng cụ:** api: `modules/rental` (equipment, rental-ticket) · pos: `app/rentals` · admin: `app/rentals`
- **E08 Ví nội bộ & sổ cái:** api: `modules/wallet` (wallet, wallet-ledger) · web: `app/wallet` · mobile: `screens/wallet` · admin: `app/finance`
- **E10 Thông báo đa kênh:** api: `modules/notification` (template, log, mock channel adapter, consumer outbox) · web: `app/notifications` · mobile: `screens/notifications`
- **E11 Gym Face ID & hồ bơi:** api: `modules/gym` (package, membership, access-event) · web: `app/gym` · mobile: `screens/gym` · admin: `app/gym` · **Face ID và hồ bơi: chưa có trong SPEC lẫn mã**
- **E12 Khu Gaming & thiết bị:** api: `modules/gaming` (machine, session, price-rule), `modules/bridge` · admin: `app/gaming`, `app/bridge` · **gaming-client (C#/.NET) chưa tạo**
- **E14 PT, lớp học:** api: `modules/pt-class`, `modules/tournament` · web: `app/pt-classes`, `app/tournaments` · mobile: `screens/pt`, `screens/tournaments` · admin: `app/pt-classes`, `app/tournaments`
- **E17 Hạng mục nền (Enabler):** `.github/workflows/ci.yml`, `docker-compose.yml`, `modules/testing` · **infra/ (Terraform) và gaming-client chưa tạo**

## 2. Mã nguồn bạn sở hữu

- `apps/api/src/modules/pt-class/` (21 tệp, trong đó 5 tệp test)
- `apps/api/src/modules/tournament/` (16 tệp, trong đó 4 tệp test)
- `apps/mobile/` (27 tệp, 12 màn hình/trang)
- `apps/pos/` (23 tệp, 5 màn hình/trang)
- `packages/contracts/src/`: `pt-class.ts`, `tournament.ts`

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M11-pt-va-lop-hoc.md`, `docs/tasks/M16-giai-dau.md`, `docs/tasks/M20-app-mobile.md`, `docs/tasks/M21-giao-dien-pos.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M04-dat-san.md`, `docs/tasks/M09-thong-bao.md`, `docs/tasks/M10-phong-gym.md`, `docs/tasks/M12-canteen-ban-le-kho.md`, `docs/tasks/M13-cho-thue-dung-cu.md`, `docs/tasks/M14-khu-gaming.md`, `docs/tasks/M22-bridge-agent.md`, `docs/tasks/M02-dinh-danh-xac-thuc.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `tournament-engine`, `pos-inventory-shift`, `notification-events`, `court-booking-engine`, `gym-membership-access`, `nestjs-module-scaffold`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T5` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `frontend-web`, `mobile-react-native`, `ux-vi-localization`, `backend-nestjs`, `mongodb-data`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Khung React Native, chọn thư viện (điều hướng, quét QR, push), nguyên mẫu quét QR |
| GĐ1 | Điều hướng, đăng nhập/OTP, nhận push; khung POS (đăng nhập, mở ca) |
| GĐ2 | Đặt sân, thanh toán, lượt đặt, QR check-in trên app; POS đặt sân hộ, check-in |
| GĐ3 | App: ví, thẻ gym, QR vào gym, số người đang tập, lớp học, PT; POS: bán hàng, ca, thuê dụng cụ, mua thẻ gym, nạp ví; M11 lớp học và PT (phần backend 25 ngày) |
| GĐ4 | App: gaming (phòng riêng, QR đăng nhập máy), giải đấu (đăng ký đội, nhánh đấu); **M16 giải đấu (đăng ký, bốc thăm, xếp lịch, kết quả)**; POS: quản lý máy gaming |
| GĐ5 | Đưa app lên TestFlight và Google Play nội bộ; sửa lỗi; chuẩn bị hồ sơ duyệt cửa hàng ứng dụng |
| GĐ6 | Phát hành lên App Store và Google Play; hỗ trợ đào tạo POS |

## 5. Chỗ lệch cần xác nhận liên quan đến T5

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E11 | Face ID và hồ bơi | Kế hoạch v1.0 (mục 1.5) ghi **nhận diện khuôn mặt và quản lý camera nằm ngoài phạm vi**, và SPEC không có hồ bơi. Kit không có mã cho cả hai. Theo AGENTS.md: phải sửa SPEC/ADR trước rồi mới làm. |
| E05 | Staff Desk | Ảnh giao T5 làm "Staff Desk" nhưng kit không có app này. Giả định tạm: màn hình soát vé nằm trong `apps/pos`. Cần xác nhận. |
| E12 | Ô đỏ T6 (Gaming Server) | Ô này tô đỏ trong ảnh, và T6 vừa làm Gaming Server, Gaming Client, phần cứng. Tải E12 dồn lên một người; cần xác nhận ý nghĩa ô đỏ. |
| E17 | Ô đỏ T7 (DevOps) | Ô này tô đỏ trong ảnh. Cần xác nhận ý nghĩa. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
