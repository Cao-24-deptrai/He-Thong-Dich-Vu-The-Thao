# Phân công 7 thành viên và cách chia bộ kit

Nguồn: ảnh phân công Epic E01–E17 (bảng T1–T7 + chú giải màu theo tên) và kế hoạch triển khai v1.0. Bộ kit được chia thành 7 phần, mỗi phần ứng với một vai T1–T7 trong ảnh.

## 1. Ma trận Epic × vai (đúng như ảnh)

| Epic | Tên | Backend | Frontend / Mobile | Gaming / IoT / phần cứng | QA / DevOps | Chủ epic (màu) |
|---|---|---|---|---|---|---|
| E01 | Xác thực & phân quyền | T1 | T4 (Web), T5 (Mobile) | — | T7 | Vy |
| E02 | Danh mục sân & bảng giá | T3 | T4 | — | T7 | Khang |
| E03 | Đặt sân, giữ chỗ & lịch cố định | T1 | T4 (Web), T5 (Mobile) | — | T7 | Vy |
| E04 | Thanh toán VietQR, cứu đơn & hoàn tiền | T2 | T4 | — | T7 | Huyền |
| E05 | Vé QR & soát vé | T1, T3 | T5 (Staff Desk, Mobile) | T6 (đầu đọc QR, camera) | T7 | Vy |
| E06 | Quầy POS, kho & ca thu ngân | T3 | T5 (POS) | T6 (Bridge Agent quầy) | T7 | Huyền |
| E07 | Thuê dụng cụ | T3 | T5, T4 | — | T7 | Trung |
| E08 | Ví nội bộ & sổ cái | T2 | T4, T5 | — | T7 | Ngọc |
| E09 | Thuế & hóa đơn điện tử | T2 | T4 | — | T7 | Ngọc |
| E10 | Thông báo đa kênh | T2 | T5 (FCM trên Mobile) | — | T7 | Ngọc |
| E11 | Gym Face ID & hồ bơi | T3 | T4, T5 | T6 (Face ID, cửa xoay) | T7 | Khang |
| E12 | Khu Gaming & thiết bị | T6 (Gaming Server), T5 | T6 (Gaming Client) | T6 | T7 | Phong |
| E13 | Khuyến mãi & hạng khách | T2 | T4 | — | T7 | Khang |
| E14 | PT, lớp học | T5 | T5 | — | T7 | Phong |
| E15 | Đánh giá & cộng đồng | T3 | T4 | — | T7 | Trung |
| E16 | Báo cáo & kiểm toán | T2 (doanh thu), T3 (lấp đầy), T1 (kiểm toán) | T4 (Báo cáo M17) | — | T7 | Huyền |
| E17 | Hạng mục nền (Enabler) | T7 (DevOps), T5 | — | T6 (phần cứng, 100 máy Gaming) | T7 | Phong |

Chú giải màu trong ảnh: Khang (vàng), Anh (cam), Vy (xanh dương), Phong (xanh lá), Trung (xám), Ngọc (tím), Huyền (xanh ngọc). **Anh** (cam) không tô epic nào trong ảnh, nên chưa gắn được với vai nào.

## 2. Tóm tắt từng vai

| Vai | Chức danh | Epic tham gia | Khối lượng theo kế hoạch |
|---|---|---|---|
| T1 | Tech Lead, Backend lõi | E01, E03, E04, E05, E16 | M01 (30) + M02 (45) + M04 (90) + điều phối/review (20) = 185 ngày công (99%) |
| T2 | Backend Thanh toán và Tài chính | E04, E08, E09, E10, E12, E13, E16 | M06 (50) + M07 (30) + M08 (25) + M09 (30) + M15 (35) = 170 ngày công (91%) |
| T3 | Backend Nghiệp vụ | E02, E03, E05, E06, E07, E11, E15, E16 | M03 (35) + M05 (20) + M10 (60) + M12 (45) + M13 (20) = 180 ngày công (96%) |
| T4 | Frontend Web | E01, E02, E03, E04, E07, E08, E09, E11, E13, E15, E16 | M17 (45) + M18 (65) + M19 (65) + M11 giao diện (10) = 185 ngày công (99%) |
| T5 | Mobile và POS | E01, E03, E05, E06, E07, E08, E10, E11, E12, E14, E17 | M20 (75) + M21 (50) + M16 (35) + M11 (25) = 185 ngày công (99%) |
| T6 | Gaming và Thiết bị | E05, E06, E11, E12, E17 | M14a (55) + M14b (80) + M22 (30) + M16 esports (20) = 185 ngày công (99%) |
| T7 | QA và DevOps | E01, E02, E03, E04, E05, E06, E07, E08, E09, E10, E11, E12, E13, E14, E15, E16, E17 | M23 (110) + M24 (40) + M25 (30) = 180 ngày công (96%) |

## 3. Chủ epic theo màu

| Tên | Màu | Epic |
|---|---|---|
| Khang | vàng | E02, E11, E13 |
| Anh | cam | — |
| Vy | xanh dương | E01, E03, E05 |
| Phong | xanh lá | E12, E14, E17 |
| Trung | xám | E07, E15 |
| Ngọc | tím | E08, E09, E10 |
| Huyền | xanh ngọc | E04, E06, E16 |

## 4. Mã nguồn thuộc về ai

| T | Vai trò | Mã nguồn sở hữu |
|---|---|---|
| T1 | Tech Lead, Backend lõi | `.gitignore`<br>`.nvmrc`<br>`AGENTS.md`<br>`README-ANTIGRAVITY.md`<br>`apps/api (cấu hình)`<br>`apps/api (khung: main, app.module, common, config, database, redis)`<br>`apps/api/src/modules/auth`<br>`apps/api/src/modules/booking`<br>`apps/api/src/modules/health`<br>`apps/api/src/modules/outbox`<br>`package.json`<br>`packages`<br>contracts: auth, booking, healthcheck, index, problem-details<br>`packages/shared`<br>`pnpm-lock.yaml`<br>`pnpm-workspace.yaml`<br>`tsconfig.base.json`<br>`turbo.json`<br>gốc repo (package.json, turbo, pnpm, tsconfig, AGENTS.md, README, docs/SPEC.md, docs/adr) |
| T2 | Backend Thanh toán và Tài chính | `apps/api/src/modules/analytics`<br>`apps/api/src/modules/invoice`<br>`apps/api/src/modules/notification`<br>`apps/api/src/modules/payment`<br>`apps/api/src/modules/promotion`<br>`apps/api/src/modules/wallet`<br>contracts: analytics, invoice, notification, payment, promotion, wallet |
| T3 | Backend Nghiệp vụ | `apps/api/src/modules/canteen`<br>`apps/api/src/modules/facility`<br>`apps/api/src/modules/gym`<br>`apps/api/src/modules/rental`<br>contracts: canteen, facility, gym, rental |
| T4 | Frontend Web | `apps/admin`<br>`apps/web` |
| T5 | Mobile và POS | `apps/api/src/modules/pt-class`<br>`apps/api/src/modules/tournament`<br>`apps/mobile`<br>`apps/pos`<br>contracts: pt-class, tournament |
| T6 | Gaming và Thiết bị | `apps/api/src/modules/bridge`<br>`apps/api/src/modules/gaming`<br>contracts: bridge, gaming |
| T7 | QA và DevOps | `.github`<br>`apps/api/src/modules/testing`<br>`docker-compose.yml`<br>`docker-compose.yml` |

## 5. Cách 7 phần ghép lại

- Mỗi phần = **bản tham chiếu dùng chung** (khung API, `packages/shared`, mọi `packages/contracts`, module `auth`/`outbox`/`health`, `docs/SPEC.md`, ADR, rule nền) + **phần sở hữu** + **rule/skill/task hỗ trợ** + `PHAN-CONG-Tn.md` + rule `03-vai-tro-Tn.md`.
- Giải nén cả 7 phần vào cùng một thư mục sẽ ra lại đúng bộ kit gốc (cộng các file phân công). Các file dùng chung giống hệt nhau nên không xung đột.
- Từng phần **không build riêng được**: `app.module.ts` import mọi module. Hãy cho cả đội làm trên một kho git; phần này dùng để mỗi người mở Antigravity với đúng ngữ cảnh và phạm vi của mình.
- Đã sửa dòng "Người phụ trách" của `docs/tasks` M04, M05 (ví) và M17 cho khớp ảnh. Không sửa mã nguồn.

## 6. Chỗ lệch cần xác nhận

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E11 | Face ID và hồ bơi | Kế hoạch v1.0 (mục 1.5) ghi **nhận diện khuôn mặt và quản lý camera nằm ngoài phạm vi**, và SPEC không có hồ bơi. Kit không có mã cho cả hai. Theo AGENTS.md: phải sửa SPEC/ADR trước rồi mới làm. |
| E13 | Hạng khách | Kế hoạch v1.0 ghi **không làm tích điểm, hạng thành viên**. Kit chỉ có voucher, combo, user-package. Cần xác nhận "hạng khách" nghĩa là gì trước khi làm. |
| E15 | Đánh giá & cộng đồng | Chưa có trong kế hoạch lẫn kit. "Cáp kèo" khớp F04.7 (tìm đối thủ), mã đang nằm trong `modules/booking` của T1. Phần **đánh giá** là phạm vi mới. |
| E05 | Staff Desk | Ảnh giao T5 làm "Staff Desk" nhưng kit không có app này. Giả định tạm: màn hình soát vé nằm trong `apps/pos`. Cần xác nhận. |
| E05 | Mã US-010, US-013 | Ảnh nhắc US-010 và US-013 nhưng kế hoạch và kit không đánh số user story. Cần bảng ánh xạ US ↔ chức năng (F-code) từ người lập ảnh. |
| E04 | "Cứu đơn" | Hiểu là xử lý đơn thanh toán kẹt/lệch (webhook đến muộn, MISMATCH, hoàn tiền vào ví theo kế hoạch 3.6). Cần xác nhận. |
| E12 | Ô đỏ T6 (Gaming Server) | Ô này tô đỏ trong ảnh, và T6 vừa làm Gaming Server, Gaming Client, phần cứng. Tải E12 dồn lên một người; cần xác nhận ý nghĩa ô đỏ. |
| E17 | Ô đỏ T7 (DevOps) | Ô này tô đỏ trong ảnh. Cần xác nhận ý nghĩa. |
| Kit | Thư mục chưa tồn tại | AGENTS.md nhắc `packages/ui`, `gaming-client/`, `bridge-agent/`, `infra/` nhưng kit chưa có. Khi tạo: `packages/ui` → T4, `gaming-client/` và `bridge-agent/` → T6, `infra/` → T7. |
| Kit | Đánh số tài liệu task | Trong `docs/tasks/` M05 là "Ví nội bộ" (kế hoạch gọi là M07) và không có file M07; "đặt cố định" (M05 trong kế hoạch) nằm trong F04.6 của M04. Đã sửa dòng "Người phụ trách" của M04, M05 (ví) và M17 cho khớp ảnh. |
