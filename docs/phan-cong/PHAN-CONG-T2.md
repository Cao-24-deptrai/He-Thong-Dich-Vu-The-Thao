# PHAN-CONG-T2: Backend Thanh toán và Tài chính

**Kỹ năng:** NestJS, tích hợp cổng thanh toán, webhook, kế toán cơ bản

**Khối lượng (kế hoạch 8.3):** M06 (50) + M07 (30) + M08 (25) + M09 (30) + M15 (35) = 170 ngày công (91%)

**Người dự phòng (kế hoạch 8.6):** T1 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (7 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E04 | Thanh toán VietQR, cứu đơn & hoàn tiền | Backend | — | Thanh toán M06; US-013 phối hợp với T1 | Huyền |
| E08 | Ví nội bộ & sổ cái | Backend | — | Ví nội bộ M07 | Ngọc |
| E09 | Thuế & hóa đơn điện tử | Backend | — | Hóa đơn M08, thuế | Ngọc |
| E10 | Thông báo đa kênh | Backend | — | Thông báo M09 | Ngọc |
| E12 | Khu Gaming & thiết bị | Hỗ trợ (theo ghi chú ảnh) | T2 hỗ trợ phần ví tạm giữ | T2 hỗ trợ phần ví tạm giữ | Phong |
| E13 | Khuyến mãi & hạng khách | Backend | — | Voucher M15 | Khang |
| E16 | Báo cáo & kiểm toán | Backend | doanh thu | Dashboard M17 | Huyền |

### Hiện có trong kit cho các epic này

- **E04 Thanh toán VietQR, cứu đơn & hoàn tiền:** api: `modules/payment` (payment, webhook, vietqr) · mobile: `components/VietQrModal.tsx` · admin: `app/finance`
- **E08 Ví nội bộ & sổ cái:** api: `modules/wallet` (wallet, wallet-ledger) · web: `app/wallet` · mobile: `screens/wallet` · admin: `app/finance`
- **E09 Thuế & hóa đơn điện tử:** api: `modules/invoice` (adapter interface + mock adapter) · web: `app/invoices` · admin: `app/invoices`
- **E10 Thông báo đa kênh:** api: `modules/notification` (template, log, mock channel adapter, consumer outbox) · web: `app/notifications` · mobile: `screens/notifications`
- **E12 Khu Gaming & thiết bị:** api: `modules/gaming` (machine, session, price-rule), `modules/bridge` · admin: `app/gaming`, `app/bridge` · **gaming-client (C#/.NET) chưa tạo**
- **E13 Khuyến mãi & hạng khách:** api: `modules/promotion` (voucher, combo, user-package) · admin: `app/promotions` · **"hạng khách": chưa có trong SPEC lẫn mã**
- **E16 Báo cáo & kiểm toán:** api: `modules/analytics` (daily-stats, report), `auth/services/audit-log.service.ts` · admin: `app/page.tsx` (dashboard), `app/finance`

## 2. Mã nguồn bạn sở hữu

- `apps/api/src/modules/analytics/` (9 tệp, trong đó 2 tệp test)
- `apps/api/src/modules/invoice/` (9 tệp, trong đó 1 tệp test)
- `apps/api/src/modules/notification/` (12 tệp, trong đó 1 tệp test)
- `apps/api/src/modules/payment/` (11 tệp, trong đó 2 tệp test)
- `apps/api/src/modules/promotion/` (13 tệp, trong đó 3 tệp test)
- `apps/api/src/modules/wallet/` (9 tệp, trong đó 2 tệp test)
- `packages/contracts/src/`: `analytics.ts`, `invoice.ts`, `notification.ts`, `payment.ts`, `promotion.ts`, `wallet.ts`

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M05-vi-noi-bo.md`, `docs/tasks/M06-thanh-toan.md`, `docs/tasks/M08-hoa-don-dien-tu.md`, `docs/tasks/M09-thong-bao.md`, `docs/tasks/M15-voucher-va-combo.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M14-khu-gaming.md`, `docs/tasks/M17-bao-cao-dashboard.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `wallet-ledger`, `payment-provider-integration`, `einvoice-adapter`, `notification-events`, `reporting-daily-stats`, `nestjs-module-scaffold`, `gaming-session-billing`, `security-review`, `concurrency-test-kit`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T2` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `backend-nestjs`, `mongodb-data`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Mở tài khoản sandbox các đối tác; nguyên mẫu webhook VietQR/ví điện tử; chọn nhà cung cấp hóa đơn điện tử |
| GĐ1 | Khung module payment, notification (hàng đợi, mẫu); nộp mẫu ZNS đi duyệt |
| GĐ2 | M06: tiền mặt, VietQR, MoMo, ZaloPay, VNPay, webhook, khử trùng, MISMATCH, hoàn tiền; M09 push/email/ZNS và nhắc lịch |
| GĐ3 | M07 ví (sổ cái, trừ có điều kiện, nạp, rút, điều chỉnh, đối soát); M08 hóa đơn điện tử (adapter, hàng đợi, hủy/điều chỉnh) |
| GĐ4 | M15 voucher, gói combo, quy tắc ví theo danh mục; chuẩn bị thanh toán lệ phí giải; thanh toán tại màn hình gaming |
| GĐ5 | Chuyển sang môi trường thật của cổng và nhà cung cấp hóa đơn; thử tiền thật; đối soát cuối |
| GĐ6 | Theo dõi thanh toán, hóa đơn trong những ngày đầu; xử lý giao dịch không khớp |

## 5. Chỗ lệch cần xác nhận liên quan đến T2

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E13 | Hạng khách | Kế hoạch v1.0 ghi **không làm tích điểm, hạng thành viên**. Kit chỉ có voucher, combo, user-package. Cần xác nhận "hạng khách" nghĩa là gì trước khi làm. |
| E05 | Mã US-010, US-013 | Ảnh nhắc US-010 và US-013 nhưng kế hoạch và kit không đánh số user story. Cần bảng ánh xạ US ↔ chức năng (F-code) từ người lập ảnh. |
| E04 | "Cứu đơn" | Hiểu là xử lý đơn thanh toán kẹt/lệch (webhook đến muộn, MISMATCH, hoàn tiền vào ví theo kế hoạch 3.6). Cần xác nhận. |
| E12 | Ô đỏ T6 (Gaming Server) | Ô này tô đỏ trong ảnh, và T6 vừa làm Gaming Server, Gaming Client, phần cứng. Tải E12 dồn lên một người; cần xác nhận ý nghĩa ô đỏ. |
| Kit | Đánh số tài liệu task | Trong `docs/tasks/` M05 là "Ví nội bộ" (kế hoạch gọi là M07) và không có file M07; "đặt cố định" (M05 trong kế hoạch) nằm trong F04.6 của M04. Đã sửa dòng "Người phụ trách" của M04, M05 (ví) và M17 cho khớp ảnh. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
