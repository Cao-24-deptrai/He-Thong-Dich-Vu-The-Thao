# PHAN-CONG-T3: Backend Nghiệp vụ

**Kỹ năng:** NestJS, MongoDB, thiết kế nghiệp vụ

**Khối lượng (kế hoạch 8.3):** M03 (35) + M05 (20) + M10 (60) + M12 (45) + M13 (20) = 180 ngày công (96%)

**Người dự phòng (kế hoạch 8.6):** T1 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (8 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E02 | Danh mục sân & bảng giá | Backend | — | Cơ sở vật chất M03 | Khang |
| E03 | Đặt sân, giữ chỗ & lịch cố định | Hỗ trợ (theo ghi chú ảnh) | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Booking Engine M04; đặt cố định M05 do T3 hỗ trợ | Vy |
| E05 | Vé QR & soát vé | Backend | — | US-010 do T1, quét vé do T3 | Vy |
| E06 | Quầy POS, kho & ca thu ngân | Backend | — | POS & Kho M12, ca thu ngân | Huyền |
| E07 | Thuê dụng cụ | Backend | — | Thuê dụng cụ M13 | Trung |
| E11 | Gym Face ID & hồ bơi | Backend | — | Gym M10, hồ bơi | Khang |
| E15 | Đánh giá & cộng đồng | Backend | — | Đánh giá, cáp kèo | Trung |
| E16 | Báo cáo & kiểm toán | Backend | lấp đầy | Dashboard M17 | Huyền |

### Hiện có trong kit cho các epic này

- **E02 Danh mục sân & bảng giá:** api: `modules/facility` (resource, price-rule, closure, giờ mở cửa, settings) · admin: `app/facilities`, `app/settings`
- **E03 Đặt sân, giữ chỗ & lịch cố định:** api: `modules/booking` (hold/confirm/cancel, 3 lớp, `POST recurring`, matchmaking) · web: `app/booking`, `app/my-bookings` · mobile: `screens/booking` · admin: `app/bookings`
- **E05 Vé QR & soát vé:** api: QR trong `booking` (check-in), `gym` (qr-token), `rental` · web: `components/qr-code.tsx` · mobile: `components/DynamicQrPass.tsx` · **chưa có app "Staff Desk" riêng**; đầu đọc QR/camera chưa có (bridge-agent chưa tạo)
- **E06 Quầy POS, kho & ca thu ngân:** api: `modules/canteen` (product, order, inventory, cashier-shift) · pos: `app/orders`, `app/shifts`, `app/hardware`, `lib/bridge.ts` · admin: `app/pos`, `app/inventory` · **bridge-agent chưa tạo**
- **E07 Thuê dụng cụ:** api: `modules/rental` (equipment, rental-ticket) · pos: `app/rentals` · admin: `app/rentals`
- **E11 Gym Face ID & hồ bơi:** api: `modules/gym` (package, membership, access-event) · web: `app/gym` · mobile: `screens/gym` · admin: `app/gym` · **Face ID và hồ bơi: chưa có trong SPEC lẫn mã**
- **E15 Đánh giá & cộng đồng:** **Chưa có module đánh giá.** "Cáp kèo" tương ứng F04.7 (ghép trận/tìm đối thủ) đã có phần đầu trong `modules/booking` (file của T1)
- **E16 Báo cáo & kiểm toán:** api: `modules/analytics` (daily-stats, report), `auth/services/audit-log.service.ts` · admin: `app/page.tsx` (dashboard), `app/finance`

## 2. Mã nguồn bạn sở hữu

- `apps/api/src/modules/canteen/` (15 tệp, trong đó 4 tệp test)
- `apps/api/src/modules/facility/` (21 tệp, trong đó 4 tệp test)
- `apps/api/src/modules/gym/` (10 tệp, trong đó 2 tệp test)
- `apps/api/src/modules/rental/` (11 tệp, trong đó 3 tệp test)
- `packages/contracts/src/`: `canteen.ts`, `facility.ts`, `gym.ts`, `rental.ts`

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M03-co-so-vat-chat-bang-gia.md`, `docs/tasks/M10-phong-gym.md`, `docs/tasks/M12-canteen-ban-le-kho.md`, `docs/tasks/M13-cho-thue-dung-cu.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M04-dat-san.md`, `docs/tasks/M16-giai-dau.md`, `docs/tasks/M17-bao-cao-dashboard.md`, `docs/tasks/M22-bridge-agent.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `gym-membership-access`, `pos-inventory-shift`, `court-booking-engine`, `reporting-daily-stats`, `nestjs-module-scaffold`, `concurrency-test-kit`, `tournament-engine`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T3` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `backend-nestjs`, `mongodb-data`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Phân tích nghiệp vụ gym, kho, cho thuê; chuẩn bị danh mục dữ liệu khởi tạo |
| GĐ1 | M03: tài nguyên, sân ghép, giờ mở cửa, khung giờ, bảng giá, khóa sân, cấu hình |
| GĐ2 | Hoàn thiện khóa sân và xử lý xung đột; bắt đầu mô hình dữ liệu gym; hỗ trợ M04 phần giá và sân ghép |
| GĐ3 | M10 gói và thẻ gym, gia hạn, nâng cấp, kiểm soát vào ra, bộ đếm; M12 sản phẩm, kho, nhập/xuất, kiểm kê, ca; M13 dụng cụ cho thuê |
| GĐ4 | M05 đặt sân cố định; hỗ trợ nghiệp vụ gym cho báo cáo; hỗ trợ M16 xếp lịch |
| GĐ5 | Sửa lỗi UAT các module mình phụ trách; nhập dữ liệu thật |
| GĐ6 | Hỗ trợ nghiệp vụ tại quầy, sửa lỗi nóng |

## 5. Chỗ lệch cần xác nhận liên quan đến T3

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E11 | Face ID và hồ bơi | Kế hoạch v1.0 (mục 1.5) ghi **nhận diện khuôn mặt và quản lý camera nằm ngoài phạm vi**, và SPEC không có hồ bơi. Kit không có mã cho cả hai. Theo AGENTS.md: phải sửa SPEC/ADR trước rồi mới làm. |
| E15 | Đánh giá & cộng đồng | Chưa có trong kế hoạch lẫn kit. "Cáp kèo" khớp F04.7 (tìm đối thủ), mã đang nằm trong `modules/booking` của T1. Phần **đánh giá** là phạm vi mới. |
| E05 | Staff Desk | Ảnh giao T5 làm "Staff Desk" nhưng kit không có app này. Giả định tạm: màn hình soát vé nằm trong `apps/pos`. Cần xác nhận. |
| E05 | Mã US-010, US-013 | Ảnh nhắc US-010 và US-013 nhưng kế hoạch và kit không đánh số user story. Cần bảng ánh xạ US ↔ chức năng (F-code) từ người lập ảnh. |
| Kit | Đánh số tài liệu task | Trong `docs/tasks/` M05 là "Ví nội bộ" (kế hoạch gọi là M07) và không có file M07; "đặt cố định" (M05 trong kế hoạch) nằm trong F04.6 của M04. Đã sửa dòng "Người phụ trách" của M04, M05 (ví) và M17 cho khớp ảnh. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
