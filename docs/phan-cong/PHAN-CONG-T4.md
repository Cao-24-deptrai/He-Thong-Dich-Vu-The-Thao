# PHAN-CONG-T4: Frontend Web

**Kỹ năng:** Next.js, React, TypeScript, biểu đồ

**Khối lượng (kế hoạch 8.3):** M17 (45) + M18 (65) + M19 (65) + M11 giao diện (10) = 185 ngày công (99%)

**Người dự phòng (kế hoạch 8.6):** T5 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (11 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E01 | Xác thực & phân quyền | Frontend / Mobile | Web | Auth, phân quyền | Vy |
| E02 | Danh mục sân & bảng giá | Frontend / Mobile | — | Cơ sở vật chất M03 | Khang |
| E03 | Đặt sân, giữ chỗ & lịch cố định | Frontend / Mobile | Web | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Vy |
| E04 | Thanh toán VietQR, cứu đơn & hoàn tiền | Frontend / Mobile | — | Thanh toán M06; US-013 phối hợp với T1 | Huyền |
| E07 | Thuê dụng cụ | Frontend / Mobile | — | Thuê dụng cụ M13 | Trung |
| E08 | Ví nội bộ & sổ cái | Frontend / Mobile | — | Ví nội bộ M07 | Ngọc |
| E09 | Thuế & hóa đơn điện tử | Frontend / Mobile | — | Hóa đơn M08, thuế | Ngọc |
| E11 | Gym Face ID & hồ bơi | Frontend / Mobile | — | Gym M10, hồ bơi | Khang |
| E13 | Khuyến mãi & hạng khách | Frontend / Mobile | — | Voucher M15 | Khang |
| E15 | Đánh giá & cộng đồng | Frontend / Mobile | — | Đánh giá, cáp kèo | Trung |
| E16 | Báo cáo & kiểm toán | Frontend / Mobile | Báo cáo M17 | Dashboard M17 | Huyền |

### Hiện có trong kit cho các epic này

- **E01 Xác thực & phân quyền:** api: `modules/auth` (đăng ký, OTP, phiên, RBAC, audit-log) · web: `app/(auth)` · admin: `app/(auth)`, `app/users` · mobile: `screens/auth`
- **E02 Danh mục sân & bảng giá:** api: `modules/facility` (resource, price-rule, closure, giờ mở cửa, settings) · admin: `app/facilities`, `app/settings`
- **E03 Đặt sân, giữ chỗ & lịch cố định:** api: `modules/booking` (hold/confirm/cancel, 3 lớp, `POST recurring`, matchmaking) · web: `app/booking`, `app/my-bookings` · mobile: `screens/booking` · admin: `app/bookings`
- **E04 Thanh toán VietQR, cứu đơn & hoàn tiền:** api: `modules/payment` (payment, webhook, vietqr) · mobile: `components/VietQrModal.tsx` · admin: `app/finance`
- **E07 Thuê dụng cụ:** api: `modules/rental` (equipment, rental-ticket) · pos: `app/rentals` · admin: `app/rentals`
- **E08 Ví nội bộ & sổ cái:** api: `modules/wallet` (wallet, wallet-ledger) · web: `app/wallet` · mobile: `screens/wallet` · admin: `app/finance`
- **E09 Thuế & hóa đơn điện tử:** api: `modules/invoice` (adapter interface + mock adapter) · web: `app/invoices` · admin: `app/invoices`
- **E11 Gym Face ID & hồ bơi:** api: `modules/gym` (package, membership, access-event) · web: `app/gym` · mobile: `screens/gym` · admin: `app/gym` · **Face ID và hồ bơi: chưa có trong SPEC lẫn mã**
- **E13 Khuyến mãi & hạng khách:** api: `modules/promotion` (voucher, combo, user-package) · admin: `app/promotions` · **"hạng khách": chưa có trong SPEC lẫn mã**
- **E15 Đánh giá & cộng đồng:** **Chưa có module đánh giá.** "Cáp kèo" tương ứng F04.7 (ghép trận/tìm đối thủ) đã có phần đầu trong `modules/booking` (file của T1)
- **E16 Báo cáo & kiểm toán:** api: `modules/analytics` (daily-stats, report), `auth/services/audit-log.service.ts` · admin: `app/page.tsx` (dashboard), `app/finance`

## 2. Mã nguồn bạn sở hữu

- `apps/admin/` (30 tệp, 17 màn hình/trang)
- `apps/web/` (26 tệp, 12 màn hình/trang)
- Thư mục chưa có trong kit, sẽ thuộc bạn: `packages/ui/` (khi tạo)

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M17-bao-cao-dashboard.md`, `docs/tasks/M18-web-khach.md`, `docs/tasks/M19-trang-quan-tri.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M04-dat-san.md`, `docs/tasks/M06-thanh-toan.md`, `docs/tasks/M10-phong-gym.md`, `docs/tasks/M11-pt-va-lop-hoc.md`, `docs/tasks/M13-cho-thue-dung-cu.md`, `docs/tasks/M15-voucher-va-combo.md`, `docs/tasks/M16-giai-dau.md`, `docs/tasks/M03-co-so-vat-chat-bang-gia.md`, `docs/tasks/M02-dinh-danh-xac-thuc.md`, `docs/tasks/M08-hoa-don-dien-tu.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `reporting-daily-stats`, `court-booking-engine`, `gym-membership-access`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T4` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `frontend-web`, `ux-vi-localization`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Cùng designer chốt hệ thống thiết kế; bộ thư viện giao diện dùng chung; mẫu giao diện web |
| GĐ1 | Khung web khách và quản trị; đăng ký/đăng nhập/OTP; quản lý tài nguyên, giá, cấu hình |
| GĐ2 | Lịch trống, đặt sân, thanh toán, lượt đặt của tôi trên web; lịch quản lý, quản lý khách, màn hình thanh toán và đối soát |
| GĐ3 | Ví, thẻ gym (mua, gia hạn, nâng cấp, QR, số người đang tập); trang quản trị gym, kho, nhân sự, lớp; hóa đơn; giao diện lớp học (phần web) |
| GĐ4 | Gaming (đặt phòng, nạp tiền, lịch sử); sơ đồ máy cho quản trị; voucher, combo; trang giải đấu công khai; **toàn bộ báo cáo R1 đến R9 và bảng điều khiển** |
| GĐ5 | Hoàn thiện, khả năng truy cập, hiệu năng trình duyệt, sửa lỗi UAT |
| GĐ6 | Hỗ trợ, tài liệu hướng dẫn cho quản trị |

## 5. Chỗ lệch cần xác nhận liên quan đến T4

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E11 | Face ID và hồ bơi | Kế hoạch v1.0 (mục 1.5) ghi **nhận diện khuôn mặt và quản lý camera nằm ngoài phạm vi**, và SPEC không có hồ bơi. Kit không có mã cho cả hai. Theo AGENTS.md: phải sửa SPEC/ADR trước rồi mới làm. |
| E13 | Hạng khách | Kế hoạch v1.0 ghi **không làm tích điểm, hạng thành viên**. Kit chỉ có voucher, combo, user-package. Cần xác nhận "hạng khách" nghĩa là gì trước khi làm. |
| E15 | Đánh giá & cộng đồng | Chưa có trong kế hoạch lẫn kit. "Cáp kèo" khớp F04.7 (tìm đối thủ), mã đang nằm trong `modules/booking` của T1. Phần **đánh giá** là phạm vi mới. |
| Kit | Thư mục chưa tồn tại | AGENTS.md nhắc `packages/ui`, `gaming-client/`, `bridge-agent/`, `infra/` nhưng kit chưa có. Khi tạo: `packages/ui` → T4, `gaming-client/` và `bridge-agent/` → T6, `infra/` → T7. |
| Kit | Đánh số tài liệu task | Trong `docs/tasks/` M05 là "Ví nội bộ" (kế hoạch gọi là M07) và không có file M07; "đặt cố định" (M05 trong kế hoạch) nằm trong F04.6 của M04. Đã sửa dòng "Người phụ trách" của M04, M05 (ví) và M17 cho khớp ảnh. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
