# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG PHANTA SPORTS - DÀNH RIÊNG CHO NGỌC (T2)
## VAI TRÒ: KỸ SƯ BACKEND THANH TOÁN & TÀI CHÍNH (PAYMENTS & FINANCIAL BACKEND ENGINEER)

---

### THÔNG TIN TỔNG QUAN & PHÂN CÔNG
- **Họ và tên kỹ sư**: Võ Hoàng Anh Ngọc (GitHub: `anhngoc-06`)
- **Mã phân công**: **T2 - Backend Thanh toán và Tài chính**
- **Tổng khối lượng phụ trách**: **170 ngày công** (chiếm 91% tổng thời gian dự án 44 tuần)
- **Người dự phòng chéo (Backup)**: Tech Lead T1 (Cao Nguyên Anh)
- **Phạm vi sở hữu mã nguồn chính thức**:
  - `apps/api/src/modules/payment/` (hoặc `backend/src/payments/`) - M06: Thanh toán VietQR PayOS, Webhook Idempotency, Cứu đơn trễ, Hoàn tiền theo nguồn
  - `apps/api/src/modules/wallet/` (hoặc `backend/src/wallet/`) - M07: Ví nội bộ & Sổ cái kế toán kép Append-only, Nạp/trừ/rút ví có OTP
  - `apps/api/src/modules/invoice/` (hoặc `backend/src/invoice/`) - M08: Thuế VAT theo ngày thanh toán & Hóa đơn điện tử tự động MISA/Viettel Adapter
  - `apps/api/src/modules/notification/` (hoặc `backend/src/notification/`) - M09: Động cơ thông báo đa kênh Push FCM, Zalo ZNS, Email, Outbox Consumer
  - `apps/api/src/modules/promotion/` (hoặc `backend/src/promotion/`) - M15: Khuyến mãi Voucher nguyên tử findOneAndUpdate, Gói Combo, Hạng khách hàng
  - `apps/api/src/modules/analytics/` (hoặc `backend/src/analytics/`) - M17: Báo cáo doanh thu đa chiều theo 2 cơ sở (Cash Basis & Accrual Basis)
  - `packages/contracts/src/`: `payment.ts`, `wallet.ts`, `invoice.ts`, `notification.ts`, `promotion.ts`, `analytics.ts`
- **Các Epic chủ trì (Chủ Epic - Màu Tím)**:
  1. **Epic E08**: Ví nội bộ & Sổ cái kế toán kép (M07)
  2. **Epic E09**: Thuế VAT & Hóa đơn điện tử tự động (M08)
  3. **Epic E10**: Động cơ Thông báo đa kênh & Outbox (M09)
- **Các Epic phối hợp chính**:
  4. **Epic E04**: Thanh toán VietQR PayOS, Cứu đơn trễ & Hoàn tiền (M06 - Chủ Epic: Huyền)
  5. **Epic E12**: Khu Gaming & Thiết bị - Hỗ trợ phần Tạm giữ ví cuốn chiếu Rolling Hold (M14 - Chủ Epic: Phong)
  6. **Epic E13**: Khuyến mãi & Hạng khách hàng (M15 - Chủ Epic: Khang)
  7. **Epic E16**: Báo cáo & Kiểm toán - Phụ trách Báo cáo doanh thu tài chính (M17 - Chủ Epic: Huyền)
  8. **Epic E17**: Hạng mục nền - Thiết lập Sandbox, CI/CD kiểm thử tài chính

---

## 1. CÁC NGUYÊN TẮC BẤT BIẾN TÀI CHÍNH (FINANCIAL INVARIANTS - BẮT BUỘC TUÂN THỦ)
Mọi dòng mã backend do Ngọc viết bắt buộc phải vượt qua bộ quy tắc bất biến trong Rule `00-invariants.md`:
1. **Số nguyên tiền tệ VND (Int64)**: Tuyệt đối không dùng số thực (`float`/`double`) cho tiền. Mọi phép tính tiền đều dùng số nguyên VND (`Number.isSafeInteger(amount)`).
2. **Số dư ví không bao giờ âm (Negative Balance Prevention)**: Lệnh trừ ví bắt buộc dùng câu lệnh nguyên tử có điều kiện `balance >= amount` trong MongoDB Transaction:
   ```typescript
   await this.walletModel.findOneAndUpdate(
     { userId, balance: { $gte: amount } },
     { $inc: { balance: -amount }, $set: { version: wallet.version + 1 } },
     { session, new: true }
   );
   ```
3. **Sổ cái bất biến (Append-only Ledger)**: Bảng `WALLET_LEDGER` chỉ cấp quyền `INSERT`. Tuyệt đối cấm `UPDATE` và `DELETE`. Mọi điều chỉnh sai sót bắt buộc ghi bút toán điều chỉnh `ADJUST` kèm lý do và ghi `audit_outbox`.
4. **Idempotency xuyên suốt**: Mọi API biến động tiền hoặc tiếp nhận webhook bắt buộc kiểm tra `idempotencyKey` / `transactionId`. Webhook ngân hàng bắn lặp 10 lần chỉ xử lý cộng/trừ tiền đúng 1 lần duy nhất (AC-25, Runbook T03).
5. **Thuế VAT chốt theo ngày thanh toán (BR-06)**: Thuế suất áp dụng tính theo thời điểm ngân hàng ghi nhận giao dịch (`transactionDateTime`), bất kể ngày đặt hay ngày thi đấu. Biểu thuế mới phải cấu hình trước ít nhất 24 giờ.
6. **Bảo tồn đẳng thức kế toán**: Bất kỳ thời điểm nào:
   $$\text{balance} \ge 0, \quad \text{heldBalance} \ge 0$$
   $$\text{balance} + \text{heldBalance} = \sum \text{wallet\_ledger.amount}$$

---

## 2. MA TRẬN 7 GIAI ĐOẠN - MỖI GIAI ĐOẠN 1 EPIC TRỌNG TÂM CHO NGỌC

| Giai đoạn | Tuần | Milestone | Epic trọng tâm của Ngọc | Module chính | Mục tiêu đầu ra kiểm chứng được |
|:---:|:---:|:---:|:---|:---:|:---|
| **GĐ0** | Tuần 1–3 | **MS0** | **Epic E17-T2: Chuẩn bị Nền tảng Tài chính & Sandboxes** | M06, M08, M09, Contracts | Hoàn tất sandbox PayOS, MISA, ZNS; ký duyệt hợp đồng API Types; nguyên mẫu webhook Idempotency |
| **GĐ1** | Tuần 4–8 | **MS1** | **Epic E10: Nền tảng Thông báo Đa kênh & Outbox Consumer** *(Chủ Epic)* | M09 (Notification) | Hàng đợi BullMQ gửi FCM Push, ZNS, Email; nhận sự kiện Outbox từ Auth/Booking; kiểm soát trần ngân sách ZNS |
| **GĐ2** | Tuần 9–16 | **MS2** | **Epic E04: Động cơ Thanh toán VietQR, Cứu Đơn Trễ & Hoàn Tiền** | M06 (Payment) | Tự sinh mã VietQR PayOS trong 3s; xử lý webhook cứu đơn trễ BR-11a trong 1 transaction; hoàn tiền theo nguồn thu BR-15a |
| **GĐ3** | Tuần 17–26 | **MS3** | **Epic E08 & E09: Ví Nội Bộ Sổ Cái Kép & Hóa Đơn Điện Tử Tự Động** *(Chủ Epic)* | M07 (Wallet), M08 (Invoice) | Sổ cái bất biến Append-only, trừ ví không âm (1000 requests đồng thời); Rút ví OTP phương án A; Xuất hóa đơn MISA tự động |
| **GĐ4** | Tuần 27–35 | **MS4** | **Epic E13: Khuyến Mãi Voucher, Gói Combo & Hỗ Trợ Gaming Rolling Hold** | M15 (Promotion), M14, M17 | Voucher nguyên tử `findOneAndUpdate`, perUserLimit; Tạm giữ cuốn chiếu ví Gaming 15p+5p (BR-24); Báo cáo doanh thu 2 cơ sở (AC-49) |
| **GĐ5** | Tuần 36–40 | **MS5** | **Epic E05-T2: Kiểm Thử Tải Tài Chính, Pentest & Chuyển Đổi Môi Trường Thật** | M06, M07, M08, M15 | Vượt qua 100% test suites tài chính T03, T04, T10, T11, T16, T18; tích hợp live credentials; thử tiền thật 10.000đ; UAT nghiệm thu |
| **GĐ6** | Tuần 41–44 | **MS6** | **Epic E06-T2: Triển Khai Golive, Giám Sát Dòng Tiền 24/7 & Hypercare** | Vận hành toàn bộ M06-M17 | Giám sát khớp lệnh PayOS < 3s, đối soát tự động hàng đêm, xử lý chênh lệch ca quầy, bảo đảm sổ cái kế toán không lệch 1 xu |

---

## 3. KẾ HOẠCH CHI TIẾT TỪNG BƯỚC CHO CÁC MODULE (MICRO-TASKS)

### GIAI ĐOẠN 0 (Tuần 1 – 3): Khởi Động, Thiết Kế Hợp Đồng API & Môi Trường Sandbox
#### Epic E17-T2: Thiết Lập Nền Tảng Tài Chính, Hợp Đồng Dữ Liệu & Sandbox Đối Tác
- **Mục tiêu**: Chuẩn bị đầy đủ tài khoản thử nghiệm đối tác, định nghĩa toàn bộ DTOs và API Contracts theo chuẩn OpenAPI Contract-First, và chạy thử nghiệm nguyên mẫu xử lý webhook PayOS chống xung đột.

##### Các bước thực hiện nhỏ:
- [ ] **Task 0.1: Đăng ký & Cấu hình Tài khoản Sandbox Đối tác (M06, M08, M09)**
  - *Mô tả*: Đăng ký sandbox PayOS (lấy `clientId`, `apiKey`, `checksumKey`), MoMo Test Gateway, sandbox MISA meInvoice, và tài khoản Zalo Cloud Account (ZCA).
  - *File cấu hình*: `backend/.env.example`, `backend/src/config/configuration.ts`.
  - *DoD*: Lấy đủ API Keys thử nghiệm, lưu bảo mật, kết nối thử thành công qua Postman/curl.
- [ ] **Task 0.2: Chuẩn hóa Hợp đồng API Contract-First (Packages Contracts)**
  - *Mô tả*: Cập nhật và xuất bản các Type Interfaces chuẩn trong `packages/contracts/src/`:
    - `payment.ts`: `CreatePaymentLinkDto`, `PaymentWebhookPayload`, `RefundRequestDto`.
    - `wallet.ts`: `WalletDto`, `WalletLedgerDto`, `TopupWalletDto`, `SpendWalletDto`, `WithdrawRequestDto`.
    - `invoice.ts`: `InvoiceDto`, `BuyerInfoDto`, `InvoiceItemDto`, `CancelInvoiceDto`.
    - `notification.ts`: `NotificationDto`, `SendNotificationDto`, `NotificationPreferencesDto`.
    - `promotion.ts`: `VoucherDto`, `ApplyVoucherDto`, `PackageComboDto`.
  - *DoD*: Chạy `pnpm build` tại `packages/contracts` không có lỗi cú pháp TypeScript, sẵn sàng cho Web/Mobile import dùng chung.
- [ ] **Task 0.3: Xây dựng Nguyên mẫu (Prototype) Webhook Idempotency & Checksum Verify (M06)**
  - *Mô tả*: Viết service độc lập kiểm thử xác thực chữ ký HMAC-SHA256 của PayOS; kiểm tra lọc trùng request bằng Redis Mutex `SET NX PX 3000` kết hợp MongoDB.
  - *DoD*: Bắn 10 request webhook cùng mã giao dịch `transactionId` mô phỏng qua Postman, kiểm tra chỉ có duy nhất 1 request xử lý, 9 request trả về HTTP 200 an toàn.
- [ ] **Task 0.4: Xây dựng Thuật toán Phân bổ Giảm giá Voucher theo Tỷ lệ Dòng (BR-07)**
  - *Mô tả*: Viết utility test-driven `allocateDiscount(items: OrderItem[], discountAmount: number)`:
    1. Chia `discountAmount` cho từng dòng theo tỷ lệ thành tiền trước VAT.
    2. Làm tròn xuống đến đơn vị đồng.
    3. Phần dư do làm tròn dồn vào dòng có giá trị lớn nhất (hòa thì lấy dòng đầu tiên).
    4. Tính `vatAmount = Math.round(taxable * vatRate)`.
  - *File*: `packages/shared/src/money/discount-allocator.ts`, test tại `money.spec.ts`.
  - *DoD*: Tổng số tiền giảm phân bổ bằng chính xác 100% `discountAmount`, tổng tiền đơn hàng khớp từng đồng.

---

### GIAI ĐOẠN 1 (Tuần 4 – 8): Nền Tảng Đa Kênh & Động Cơ Thông Báo
#### Epic E10: Động Cơ Thông Báo Đa Kênh (Notification Engine) & Outbox Consumer (Chủ Epic: Ngọc)
- **Mục tiêu**: Xây dựng trung tâm thông báo In-App, hệ thống gửi thông báo đẩy Firebase FCM, tin nhắn Zalo ZNS và Email có cơ chế thử lại thông minh BullMQ, đáp ứng FR-08 và Phụ lục B.

##### Các bước thực hiện nhỏ:
- [ ] **Task 1.1: Thiết kế Schemas MongoDB cho Module Thông báo (M09)**
  - *File*: `backend/src/notifications/schemas/`
    - `notification.schema.ts`: Lưu thông báo in-app (`userId`, `title`, `body`, `type`, `data`, `isRead`, `readAt`, `createdAt`). Chỉ mục compound: `{ userId: 1, isRead: 1 }`.
    - `notification-template.schema.ts`: Quản lý mẫu tin (`code`, `name`, `channels: { FCM, ZNS, EMAIL }`).
    - `notification-log.schema.ts`: Nhật ký gửi tin (`channel`, `status`, `cost`, `errorMessage`, `idempotencyKey`).
    - `notification-preference.schema.ts`: Cấu hình nhận tin của khách hàng.
  - *DoD*: Migration/Schema tự động tạo đúng compound indexes và quan hệ bảng.
- [ ] **Task 1.2: Triển khai Trình biên dịch Mẫu tin Động (Template Engine)**
  - *File*: `backend/src/notifications/services/template.service.ts`
  - *Nghiệp vụ*: Thay thế các biến số `{{fullName}}`, `{{courtName}}`, `{{startTime}}`, `{{totalPrice}}`, `{{qrCodeUrl}}`. Định dạng ngày giờ chuẩn `Asia/Ho_Chi_Minh` và số tiền `x.xxx.xxx đ`.
  - *DoD*: 100% test cases thay thế đúng biến số, trả về chuỗi thông báo chuẩn theo Phụ lục B.
- [ ] **Task 1.3: Tích hợp Các Kênh Thông báo Adapter (FCM, ZNS, Email)**
  - *File*: `backend/src/notifications/adapters/`
    - `fcm.adapter.ts`: Sử dụng `firebase-admin` gửi push FCM đến thiết bị di động của khách (lấy token từ `users.fcmToken`).
    - `zalo-zns.adapter.ts`: Gọi API Zalo Cloud Account gửi ZNS theo template ID đã duyệt; kiểm tra hạn mức chi phí ngày `zns.dailyCostLimit`.
    - `email.adapter.ts`: Gửi email HTML chuẩn responsive qua Resend hoặc SMTP Nodemailer.
  - *DoD*: Mock tests kiểm tra gửi thành công qua từng kênh; kiểm tra cơ chế Channel Fallback (FCM lỗi -> chuyển sang ZNS -> chuyển sang Email).
- [ ] **Task 1.4: Xây dựng Hàng đợi Xử lý Bất đồng bộ với BullMQ**
  - *File*: `backend/src/notifications/queues/notification.processor.ts`
  - *Nghiệp vụ*: Tiếp nhận tác vụ gửi tin từ Redis queue, thực thi retry tối đa 3 lần với giãn cách tăng dần (exponential backoff 5s, 15s, 45s). Đảm bảo tính Idempotency: không gửi trùng tin nhắn khi retry (Rule 00-invariants).
  - *DoD*: Thử ngắt mạng mock API, worker tự thử lại đúng 3 lần và ghi nhận log `FAILED` nếu vượt quá giới hạn.
- [ ] **Task 1.5: Triển khai Outbox Consumer kết nối với Auth và Booking**
  - *File*: `backend/src/notifications/services/outbox-consumer.service.ts`
  - *Nghiệp vụ*: Quét định kỳ bảng `outbox` để bắt các sự kiện nghiệp vụ:
    - `AUTH_OTP_REQUESTED`: Gửi OTP qua Zalo ZNS (dự phòng SMS).
    - `BOOKING_HELD`: Gửi push cảnh báo giữ chỗ sắp hết hạn khi còn 2 phút.
    - `BOOKING_CONFIRMED`: Gửi Push FCM và Zalo ZNS kèm link vé QR động.
  - *DoD*: Khi tạo đơn giữ chỗ hoặc thanh toán, thông báo được tự động kích hoạt trong < 1 giây.
- [ ] **Task 1.6: Xây dựng Hệ thống REST APIs Thông báo cho Client**
  - *File*: `backend/src/notifications/notifications.controller.ts`
  - *Endpoints*:
    - `GET /api/notifications/me`: Danh sách thông báo cá nhân có phân trang (Public/Auth).
    - `GET /api/notifications/me/unread-count`: Đếm số lượng thông báo chưa đọc.
    - `PATCH /api/notifications/me/:id/read`: Đánh dấu 1 tin đã đọc.
    - `POST /api/notifications/me/read-all`: Đánh dấu toàn bộ đã đọc.
    - `GET/PUT /api/notifications/preferences`: Xem và cập nhật tùy chọn nhận tin (khóa không cho tắt tin bắt buộc: OTP, biến động tiền, hóa đơn).
  - *DoD*: Swagger OpenAPI hiển thị đầy đủ contracts; test E2E kiểm tra phân quyền RBAC chỉ người dùng xem được tin của mình.

---

### GIAI ĐOẠN 2 (Tuần 9 – 16): Động Cơ Thanh Toán, Cứu Đơn Trễ & Hoàn Tiền
#### Epic E04: Động Cơ Thanh Toán VietQR PayOS, Xử Lý Cứu Đơn Trễ & Quy Trình Hoàn Tiền (Ngọc Backend, Phối hợp Huyền T4)
- **Mục tiêu**: Xây dựng toàn diện phân hệ thanh toán VietQR PayOS tự khớp lệnh trong 3 giây, cơ chế Late Webhook Rescue BR-11a cứu đơn trong 1 transaction, quy trình hoàn tiền theo nguồn thu BR-15a và quản lý biểu thuế VAT chốt theo ngày thanh toán BR-06.

##### Các bước thực hiện nhỏ:
- [ ] **Task 2.1: Thiết kế Schemas MongoDB Module Thanh toán (M06)**
  - *File*: `backend/src/payments/schemas/`
    - `payment.schema.ts`: `orderId`, `bookingId`, `amount`, `provider (PAYOS, MOMO, CASH, WALLET)`, `status (INIT, SUCCESS, FAILED, REFUNDED)`, `transactionId` (Unique partial filter `{ status: 'SUCCESS' }`), `paymentUrl`, `qrCode`, `paidAt`.
    - `payment-event.schema.ts`: Nhật ký webhook thô (raw payload, headers, checksum, receivedAt).
    - `refund.schema.ts`: `paymentId`, `amount`, `destination (SOURCE, WALLET, CASH)`, `status (PENDING, APPROVED, REJECTED, COMPLETED)`, `bankInfo (encrypted)`, `reason`.
    - `tax-rate.schema.ts`: `category`, `rate`, `effectiveFrom`.
  - *DoD*: Đánh chỉ mục bắt buộc theo mục 6.3 SRS: `payments { transactionId: 1 }` unique, `tax_rates { category: 1, effectiveFrom: -1 }`.
- [ ] **Task 2.2: Triển khai Quản lý Thuế suất VAT theo Ngày Thanh toán (BR-06, AC-61)**
  - *File*: `backend/src/payments/services/tax-rate.service.ts`
  - *Nghiệp vụ*:
    - Lấy thuế suất hiệu lực tại mốc `paymentDate` cho từng nhóm dịch vụ (`COURT_RENTAL`, `EQUIPMENT_RENTAL`, `GYM`, `POOL`, `RETAIL`).
    - API cập nhật thuế suất mới (`PUT /api/admin/tax-rates`): Bắt buộc ngày hiệu lực `effectiveFrom` phải cách thời điểm tạo ít nhất 24 giờ (`TAX_RATE_EFFECTIVE_TOO_SOON`).
    - Chặn sinh mã thanh toán PayOS có thời hạn vắt qua mốc đổi thuế (`PAYMENT_WINDOW_CROSSES_TAX_CHANGE`).
  - *DoD*: Unit test kiểm tra đơn đặt trước 14 ngày áp đúng thuế suất tại ngày thanh toán thành công.
- [ ] **Task 2.3: Xây dựng Service Tạo Link Thanh toán VietQR PayOS (BR-02, BR-07, AC-08)**
  - *File*: `backend/src/payments/services/payos.service.ts`
  - *Nghiệp vụ*:
    - Nhận yêu cầu thanh toán đơn `HELD`: Kiểm tra `holdExpiresAt > now`.
    - Gọi SDK PayOS tạo Payment Link chuẩn VietQR NAPAS 24/7 với `orderCode` số nguyên duy nhất.
    - Tự động tạo Job BullMQ hủy link thanh toán tại PayOS ngay khi chạm mốc `holdExpiresAt` (10 phút) theo BR-11.
  - *DoD*: Khách hàng nhận được URL/QR PayOS hiển thị đúng số tiền gồm VAT, quét app ngân hàng đọc đúng thông tin chuyển khoản trong < 1 giây.
- [ ] **Task 2.4: Xây dựng Webhook Receiver Xử lý Idempotency & Khoảng Đệm 60s (BR-10, AC-03, AC-22, AC-25)**
  - *File*: `backend/src/payments/controllers/payments-webhook.controller.ts` & `payments-webhook.service.ts`
  - *Nghiệp vụ*:
    - Xác thực chữ ký dữ liệu từ PayOS (`payos.verifyPaymentWebhookData(body)`).
    - Khử trùng lặp giao dịch: Kiểm tra `transactionId` trong bảng `payments`. Nếu đã xử lý, trả ngay HTTP 200.
    - Xử lý giao dịch về trong khoảng đối soát 60 giây (`holdExpiresAt < paidAt < releaseAt`): Xác nhận đơn sang `CONFIRMED` bình thường (AC-22).
    - Cập nhật đơn hàng sang `CONFIRMED`, phát WebSocket `slot:confirmed` đổi màu đỏ trên Web và Mobile trong < 300ms (AC-03).
  - *DoD*: Chạy kịch bản kiểm thử T03: Bắn liên tiếp 10 webhook giống hệt nhau, hệ thống chỉ cập nhật đơn và ghi nhận doanh thu 1 lần duy nhất.
- [ ] **Task 2.5: Hiện thực hóa Động cơ Cứu Đơn Thanh Toán Trễ (Late Webhook Rescue - BR-11a, AC-04, AC-77)**
  - *File*: `backend/src/payments/services/late-webhook-rescue.service.ts`
  - *Nghiệp vụ cốt lõi*: Khi nhận webhook thanh toán thành công cho đơn đã `EXPIRED` (sau mốc `releaseAt`):
    1. Khởi tạo một MongoDB Session & ACID Transaction duy nhất.
    2. Cố gắng khóa lại: (a) Slot sân tương ứng; (b) Tồn kho dụng cụ; (c) Lượt voucher đã áp dụng.
    3. **Quy tắc cứu đơn**:
       - Nếu slot sân đã bị khách khác chiếm HOẶC voucher hết ngân sách phát hành: Không cứu được -> Chuyển đơn sang `REFUND_PENDING`, kích hoạt hoàn tiền 100% (AC-04, AC-77).
       - Nếu slot sân còn trống VÀ voucher còn lượt, nhưng dụng cụ thiếu tồn kho: Vẫn cứu đơn sân thành `CONFIRMED`, đồng thời tạo bút toán hoàn riêng dòng thuê dụng cụ (kèm VAT tương ứng) cho khách (AC-77).
       - Nếu toàn bộ tài nguyên còn đủ: Cứu thành công toàn bộ đơn sang `CONFIRMED`.
    4. Commit transaction và ghi nhận vết kiểm toán `AUDIT_LOGS`.
  - *DoD*: Vượt qua Runbook T11; kịch bản giả lập đơn hết hạn bị tranh chấp slot tự động kích hoạt hoàn tiền 100% không phát sinh double-booking.
- [ ] **Task 2.6: Xây dựng Phân hệ Quản lý Hoàn tiền Đa nguồn (BR-13, BR-15, BR-15a, AC-26, AC-28)**
  - *File*: `backend/src/payments/services/refund.service.ts` & `backend/src/admin/controllers/admin-refunds.controller.ts`
  - *Nghiệp vụ*:
    - Khách hủy đơn từ 12 tiếng trở lên trước giờ đá: Hoàn tiền 100% (chuyển sang `REFUND_PENDING`), trả lại lượt voucher và nhả dụng cụ.
    - Khách hủy dưới 12 tiếng: Bắt buộc gửi cờ `acknowledgeNoRefund = true`; giải phóng slot sân và dụng cụ nhưng tiền không hoàn (ghi nhận phí hủy muộn, AC-26).
    - Xử lý hoàn tiền về đúng nguồn thu (BR-15a):
      - Đơn ví: Hoàn tự động 100% về ví nội bộ ngay lập tức.
      - Đơn tiền mặt: Ghi dòng chi tiền vào ca thu ngân đang mở.
      - Đơn VietQR: Đẩy vào danh sách chờ duyệt hoàn tiền. API cho khách nhập STK (`POST /api/bookings/:id/refund-info`) có mã hóa AES-256-GCM.
    - SLA Phê duyệt: Endpoint `POST /api/admin/refunds/:id/approve` dành riêng cho OWNER/MANAGER duyệt hoàn trong 03 ngày làm việc.
    - Cảnh báo tự động: Job nhắc khách cung cấp STK sau 3 ngày và 7 ngày; cảnh báo bôi đỏ nổi bật trên Dashboard các đơn hoàn tiền tồn đọng quá 30 ngày (AC-28).
  - *DoD*: Test luồng hủy đơn trước 12h và dưới 12h hoạt động chuẩn xác theo chính sách; tiền hoàn chuyển khoản được mã hóa STK an toàn đối với STAFF.
- [ ] **Task 2.7: Viết Bộ Test Suites E2E Thanh toán & Concurrency Stress Test**
  - *File*: `backend/test/payment-checkin.e2e-spec.ts`, `backend/test/late-webhook.race.spec.ts`.
  - *DoD*: 100% tests PASS, mô phỏng đúng các kịch bản AC-03, AC-04, AC-22, AC-25, AC-26, AC-28.

---

### GIAI ĐOẠN 3 (Tuần 17 – 26): Ví Nội Bộ Sổ Cái Bất Biến & Hóa Đơn Điện Tử Tự Động
#### Trọng tâm 1: Epic E08 - Phân Hệ Ví Nội Bộ & Sổ Cái Kế Toán Kép (Chủ Epic: Ngọc)
#### Trọng tâm 2: Epic E09 - Thuế & Hóa Đơn Điện Tử Tự Động Qua Adapter (Chủ Epic: Ngọc)
- **Mục tiêu**: Xây dựng hệ thống ví nội bộ số dư không bao giờ âm (BR-21, AC-37), sổ cái `WALLET_LEDGER` bất biến chỉ ghi thêm (BR-22), quy trình rút ví OTP bảo mật phương án A (BR-25, AC-68), và hệ thống tự động xuất hóa đơn điện tử hợp pháp cho mọi giao dịch ghi nhận doanh thu (BR-49, AC-46).

##### Các bước thực hiện nhỏ - Phân hệ Ví nội bộ (M07):
- [ ] **Task 3.1: Thiết kế Schemas MongoDB Ví & Sổ Cái Kế Toán Kép**
  - *File*: `backend/src/wallet/schemas/`
    - `wallet.schema.ts`: `userId` (Unique), `balance` (Int64 >= 0), `heldBalance` (Int64 >= 0), `version` (Optimistic lock). Chỉ cho phép `balance >= 0` và `heldBalance >= 0`.
    - `wallet-ledger.schema.ts`: `walletId`, `type (TOPUP, SPEND, REFUND, ADJUST, WITHDRAW, HOLD, RELEASE, SETTLE)`, `amount` (Int64), `balanceAfter`, `refType`, `refId`, `idempotencyKey` (Unique index).
    - `wallet-withdraw-request.schema.ts`: Quản lý yêu cầu rút ví (`amount`, `bankAccount`, `bankCode`, `accountHolderName`, `status: PENDING, APPROVED, REJECTED`, `otpVerified`).
  - *DoD*: Phân quyền collection MongoDB: Cấm tuyệt đối lệnh `update` và `delete` trên `wallet_ledger` (NFR-07).
- [ ] **Task 3.2: Triển khai Service Xử lý Biến động Số dư Ví Nguyên tử (BR-21, BR-22, AC-37, AC-38)**
  - *File*: `backend/src/wallet/services/wallet.service.ts`
  - *Nghiệp vụ*:
    - `topup(userId, amount, providerTxnId)`: Nạp tiền vào ví qua VietQR PayOS hoặc tại quầy (tối thiểu 20.000đ, tối đa số dư 20.000.000đ, AC-38).
    - `spend(userId, amount, category, orderId, idempotencyKey)`: Trừ ví thanh toán dịch vụ. Kiểm tra danh mục hợp lệ theo BR-23 (`COURT`, `EQUIPMENT`, `CANTEEN`, `GAMING_TIME`). Cấm thanh toán thẻ gym, PT, mua đồ thể thao bán đứt. Thực hiện atomic findOneAndUpdate và ghi 1 dòng vào `wallet_ledger` trong cùng transaction.
    - `refund(userId, amount, bookingId)`: Hoàn tiền ngay lập tức vào ví khi hủy đơn đặt sân hoặc bảo trì đột xuất.
    - `adjust(userId, amount, reason, adminId)`: Bút toán điều chỉnh số dư của Quản trị viên (bắt buộc nhập lý do, ghi `audit_outbox`).
  - *DoD*: Chạy kịch bản kiểm thử T04: 1.000 thao tác trừ ví đồng thời trên 1 tài khoản có số dư 1.000.000đ, số dư cuối cùng về đúng 0đ, không có bất kỳ thời điểm nào bị âm.
- [ ] **Task 3.3: Triển khai API Thanh Toán Đơn Đặt Sân Bằng Ví Nội Bộ (BR-23, AC-80)**
  - *File*: `backend/src/payments/services/wallet-payment.service.ts` & Controller `POST /api/payments/pay-by-wallet`
  - *Nghiệp vụ*: Nhận đơn `HELD`: Trong cùng 1 MongoDB Transaction:
    1. Kiểm tra số dư khả dụng `availableBalance = balance - heldBalance >= totalPrice`.
    2. Trừ tiền ví và ghi dòng `SPEND` vào sổ cái `wallet_ledger`.
    3. Cập nhật trạng thái đơn hàng sang `CONFIRMED`.
    4. Yêu cầu bắt buộc header `Idempotency-Key` (gửi lặp trả về kết quả cũ, không trừ tiền hai lần).
  - *DoD*: Test tích hợp thanh toán thành công, kiểm tra đơn sang CONFIRMED và sổ cái có đúng 1 dòng SPEND.
- [ ] **Task 3.4: Xây dựng Quy trình Rút Tiền Ví Nội Bộ (Phương án A - BR-25, AC-68, AC-88)**
  - *File*: `backend/src/wallet/services/wallet-withdraw.service.ts`
  - *Nghiệp vụ*:
    - Kiểm tra điều kiện: Chỉ cho rút phần tiền nạp chưa sử dụng (`refundable balance`), không cho rút tiền khuyến mãi hay tiền hoàn dạng tín dụng.
    - Khách đổi mật khẩu hoặc đổi SĐT: Tự động khóa quyền rút tiền trong 24 giờ (`wallet.withdrawCooldownHours`).
    - Khách gửi yêu cầu rút (`POST /api/wallet/withdraw-requests`): Bắt buộc xác thực OTP ZNS/SMS. Ngay khi tạo yêu cầu, chuyển số tiền rút từ `balance` sang `heldBalance` để khách không thể tiêu trước khi được duyệt.
    - Phê duyệt / Từ chối (OWNER/MANAGER):
      - Phê duyệt (`POST /api/admin/wallet/withdraw-requests/:id/approve`): Kiểm tra tên chủ tài khoản ngân hàng khớp với hồ sơ đăng ký. Trừ số tiền trong `heldBalance`, ghi dòng `WITHDRAW` vào sổ cái.
      - Từ chối (`POST /api/admin/wallet/withdraw-requests/:id/reject`): Bắt buộc nhập lý do. Trả lại số tiền từ `heldBalance` về số dư khả dụng.
  - *DoD*: Vượt qua Runbook T16: Không thể tiêu số tiền đang chờ duyệt rút, tiền khuyến mãi bị chặn rút, từ chối trả lại tiền nguyên vẹn.
- [ ] **Task 3.5: Xây dựng Công cụ Đối soát Sổ cái Tự động (Ledger Reconciliation)**
  - *File*: `backend/src/wallet/services/wallet-reconciliation.service.ts`
  - *Nghiệp vụ*: Quét định kỳ kiểm tra toàn bộ ví: Tính tổng tất cả các dòng giao dịch trong `wallet_ledger` và đối chiếu với `balance + heldBalance`. Phát hiện sai lệch cảnh báo khẩn cấp cho Quản trị viên.
  - *DoD*: Đạt chuẩn kiểm toán tài chính theo Luật Kế toán Việt Nam.

##### Các bước thực hiện nhỏ - Phân hệ Hóa đơn điện tử (M08):
- [ ] **Task 3.6: Thiết kế Schemas MongoDB Hóa đơn Điện tử**
  - *File*: `backend/src/invoices/schemas/invoice.schema.ts`
  - *Cấu trúc*: `invoiceCode` (Unique), `invoiceNumber`, `invoiceSeries`, `paymentId` (Unique), `orderId`, `orderType`, `buyerInfo: { buyerType, companyName, taxCode, address, email }`, `items`, `subtotal`, `vatAmount`, `totalAmount`, `status: PENDING, ISSUED, ADJUSTED, CANCELLED`, `provider: MISA, VIETTEL`, `pdfUrl`, `xmlUrl`.
  - *DoD*: Đảm bảo chỉ mục Unique trên `paymentId` để mỗi giao dịch thanh toán chỉ gắn với 1 hóa đơn gốc duy nhất.
- [ ] **Task 3.7: Thiết kế Kiến trúc Adapter Cắm Rút & Triển khai MISA meInvoice Adapter (FR-07)**
  - *File*: `backend/src/invoices/adapters/`
    - `invoice-adapter.interface.ts`: Khai báo các phương thức `issueInvoice`, `adjustInvoice`, `cancelInvoice`, `getInvoicePdf`.
    - `misa-me-invoice.adapter.ts`: Kết nối REST API MISA meInvoice; đóng gói payload JSON chuẩn cơ quan thuế; nhận về `invoiceNumber`, `invoiceSeries`, link PDF.
    - `mock-invoice.adapter.ts`: Dùng cho môi trường Unit Test và Dev cục bộ.
  - *DoD*: Tự động sinh số hóa đơn điện tử hợp lệ ở môi trường Sandbox của MISA.
- [ ] **Task 3.8: Xây dựng Hàng đợi Phát hành Hóa đơn Tự động bằng BullMQ (BR-49, AC-46, AC-78)**
  - *File*: `backend/src/invoices/queues/invoice.processor.ts`
  - *Nghiệp vụ*:
    - Bắt sự kiện thanh toán thành công (`payment.success`) hoặc trừ ví cho dịch vụ (`wallet.spent`): Đưa vào queue xuất hóa đơn.
    - **Quy tắc BR-49 (Cực kỳ quan trọng)**:
      - Tuyệt đối **KHÔNG** xuất hóa đơn khi khách nạp tiền vào ví (`TOPUP`).
      - Tuyệt đối **KHÔNG** xuất hóa đơn khi thu tiền cọc dụng cụ thể thao (`depositAmount`).
      - Thu thập thông tin xuất hóa đơn (`buyerTaxCode`, `companyName`, `companyAddress`) do khách nhập ở bước thanh toán. Nếu không nhập, mặc định phát hành hóa đơn cho "Khách lẻ không lấy hóa đơn".
    - Cơ chế thử lại: Nếu API nhà cung cấp hóa đơn bị timeout hoặc lỗi mạng, BullMQ tự động thử lại tối đa 3 lần với giãn cách tăng dần.
  - *DoD*: Kiểm thử thanh toán dịch vụ tự sinh hóa đơn; nạp 1.000.000đ vào ví kiểm tra không phát sinh hóa đơn (AC-78).
- [ ] **Task 3.9: Triển khai Cơ chế Xuất Hóa đơn Điều chỉnh & Hóa đơn Hủy khi Hoàn tiền (BR-49)**
  - *File*: `backend/src/invoices/services/invoice-adjustment.service.ts`
  - *Nghiệp vụ*: Khi có sự kiện duyệt hoàn tiền thành công (`refund.completed`) hoặc chuyển sân hoàn tiền chênh lệch bảo trì:
    - Tìm hóa đơn gốc đã phát hành theo `paymentId`.
    - Gọi API MISA phát hành hóa đơn điều chỉnh giảm (nếu hoàn 1 phần) hoặc lập biên bản hủy hóa đơn điện tử (nếu hoàn 100%).
  - *DoD*: Đảm bảo sổ sách kế toán của tổ hợp khớp hoàn toàn với báo cáo thuế của Tổng cục Thuế.
- [ ] **Task 3.10: Xây dựng APIs Tra cứu và Tải Bản Thể hiện PDF Hóa đơn (US-063)**
  - *File*: `backend/src/invoices/invoices.controller.ts`
  - *Endpoints*:
    - `GET /api/invoices`: Tra cứu hóa đơn của tôi (khách) hoặc toàn bộ hóa đơn (STAFF/ADMIN).
    - `GET /api/invoices/:id/pdf`: Lấy link xem và tải file PDF hóa đơn chính thức.
  - *DoD*: Client Web và Mobile hiển thị nút "Xem hóa đơn điện tử", tải bản PDF chuẩn A4.

---

### GIAI ĐOẠN 4 (Tuần 27 – 35): Khuyến Mãi Voucher, Gói Combo, Tạm Giữ Ví Gaming & Báo Cáo Doanh Thu
#### Trọng tâm 1: Epic E13 - Phân Hệ Khuyến Mãi Voucher, Gói Combo & Hạng Khách Hàng (Ngọc Backend, Phối hợp Khang T3)
#### Trọng tâm 2: Hỗ trợ Epic E12 - Khu Gaming: Triển khai Cơ chế Tạm giữ cuốn chiếu Ví Gaming (Phối hợp Phong T6)
#### Trọng tâm 3: Hỗ trợ Epic E16 - Báo cáo & Kiểm toán: Xây dựng Báo cáo Doanh thu 2 Cơ sở Ghi nhận (Phối hợp Huyền T4)
- **Mục tiêu**: Hiện thực hóa việc áp mã voucher nguyên tử chống vượt hạn mức (BR-40, AC-13, AC-79), tính năng mua và thanh toán bằng Gói combo, cơ chế tạm giữ cuốn chiếu tiền ví cho 100 máy gaming chịu mất mạng (BR-24, AC-39, AC-41), và xây dựng Báo cáo Doanh thu đa chiều theo 2 cơ sở ghi nhận (BR-49, AC-49).

##### Các bước thực hiện nhỏ - Khuyến mãi Voucher & Gói Combo (M15):
- [ ] **Task 4.1: Thiết kế Schemas MongoDB Khuyến mãi & Gói Combo**
  - *File*: `backend/src/promotions/schemas/`
    - `voucher.schema.ts`: `code` (Unique), `type (PERCENT, FIXED)`, `value`, `maxDiscount`, `minOrder`, `scope: COURT, EQUIPMENT, ALL`, `usageLimit`, `usedCount`, `reservedCount`, `perUserLimit`, `validFrom`, `validTo`, `minTier (MEMBER, SILVER, GOLD, PLATINUM)`.
    - `promotion-user-counter.schema.ts`: Bộ đếm theo cặp `{ promotionId: 1, userId: 1 }` unique (lưu `reserved`, `used`).
    - `package-template.schema.ts` & `user-package.schema.ts`: Gói combo dịch vụ (`components: [{ type: COURT_HOURS, balance: 10 }, { type: PT_SESSION, balance: 8 }]`).
  - *DoD*: Schemas được tạo với đúng indexes chống race condition theo mục 6.3 SRS.
- [ ] **Task 4.2: Triển khai Động cơ Giữ Lượt & Áp Voucher Nguyên tử (BR-40, AC-13, AC-14, AC-15, AC-79)**
  - *File*: `backend/src/promotions/services/voucher.service.ts`
  - *Nghiệp vụ*:
    - Áp mã voucher vào đơn giữ chỗ: Dùng `findOneAndUpdate` nguyên tử kiểm tra đồng thời:
      1. Ngân sách phát hành: `reservedCount + usedCount < usageLimit`.
      2. Hạn mức theo khách: `reserved + used < perUserLimit` trên `promotion_user_counters`.
    - Trả lại lượt voucher: Khi đơn `HELD` hết hạn 10 phút hoặc khách hủy đơn giữ chỗ, tự động giảm `reservedCount` và giảm `reserved` của khách để mở lại lượt cho người khác (AC-14).
    - Khi đơn chuyển `CONFIRMED`: Giảm `reservedCount`, tăng `usedCount`.
  - *DoD*: Chạy kịch bản kiểm thử T18: Một khách hàng mở 2 đơn `HELD` song song cố áp 1 mã có `perUserLimit = 1`: đúng 1 đơn áp được, đơn kia báo lỗi `VOUCHER_ALREADY_USED_BY_USER`. 50 request tranh chấp voucher còn 1 lượt: đúng 1 request thành công (AC-13).
- [ ] **Task 4.3: Triển khai Phân hệ Gói Combo Dịch vụ Thể thao (FR-14)**
  - *File*: `backend/src/promotions/services/package.service.ts`
  - *Nghiệp vụ*:
    - Mua gói combo qua PayOS (`POST /api/packages/purchase`).
    - Khi khách đặt sân thể thao: Cho phép chọn thanh toán bằng gói combo (`POST /api/payments/pay-by-package`).
    - Trừ số dư giờ sân trong gói combo bằng thao tác nguyên tử trong MongoDB Transaction.
  - *DoD*: Đặt sân thành công không mất tiền ví/ngân hàng, số dư gói combo giảm đúng số giờ đã đặt.
- [ ] **Task 4.4: Phân Hạng Khách Hàng Tự Động theo Chi Tiêu 12 Tháng Trượt (BR-41, BR-42, AC-48)**
  - *File*: `backend/src/promotions/services/tier-evaluation.service.ts`
  - *Nghiệp vụ*: Cronjob chạy lúc 02:00 sáng hàng ngày: Tính tổng chi tiêu ròng chưa VAT của từng khách hàng trong 365 ngày gần nhất:
    - `< 2.000.000 đ`: `MEMBER`
    - `>= 2.000.000 đ`: `SILVER`
    - `>= 6.000.000 đ`: `GOLD`
    - `>= 15.000.000 đ`: `PLATINUM`
    - Áp dụng ưu đãi mã voucher giảm giá riêng theo hạng thành viên (AC-16, AC-48).
  - *DoD*: Khách nâng hạng nhận được thông báo chúc mừng qua FCM và áp dụng được các voucher đặc quyền.

##### Các bước thực hiện nhỏ - Hỗ trợ Tạm giữ ví Gaming Cuốn chiếu (M14 - Phối hợp Phong T6):
- [ ] **Task 4.5: Triển khai API Mở Phiên Gaming & Tạm Giữ Ban Đầu 15 Phút (BR-24, AC-39)**
  - *File*: `backend/src/gaming/services/gaming-wallet.service.ts` & Controller `POST /api/gaming/sessions/start`
  - *Nghiệp vụ*: Khách đăng nhập vào máy net (PC-01 đến PC-50, phòng riêng R01-R03, phòng esport E01):
    - Kiểm tra số dư ví khả dụng `availableBalance = balance - heldBalance`.
    - Nếu `availableBalance < 5 phút tiền chơi` (`gaming.minLoginMinutes`): Từ chối đăng nhập với mã lỗi `GAMING_MIN_BALANCE_NOT_MET`.
    - Tạm giữ tối đa 15 phút tiền chơi (`gaming.holdMaxMinutes`): Tăng `heldBalance`, ghi 1 dòng `HOLD` vào `wallet_ledger`. Số tiền bị tạm giữ bị khóa, không thể rút hay tiêu vào việc khác (AC-39).
  - *DoD*: Đăng nhập thành công, máy mở khóa, ví hiển thị rõ số tiền đang tạm giữ.
- [ ] **Task 4.6: Triển khai Cơ chế Tạm Giữ Cuốn Chiếu (Rolling Hold BR-24, AC-39, AC-41)**
  - *File*: `backend/src/gaming/services/gaming-rolling-hold.service.ts`
  - *Nghiệp vụ*:
    - Trong khi khách chơi, cứ mỗi 5 phút client gửi heartbeat: Backend tự động tạm giữ thêm 5 phút tiền chơi từ ví khả dụng (`HOLD_INCREMENT`).
    - Nhờ cơ chế này, máy luôn có sẵn khoản dự phòng từ 10 đến 15 phút tiền chơi. Nếu tổ hợp bị mất mạng Internet đột xuất (AC-41), máy gaming trạm vẫn tiếp tục cho khách chơi ngoại tuyến bình thường bằng đồng hồ đơn điệu.
    - Xử lý hết tiền tạm giữ khi offline: Nếu hết tiền đã giữ mà không kết nối được máy chủ để giữ thêm, máy trạm phát cảnh báo đếm ngược 60 giây rồi tự động khóa màn hình bảo vệ, chống tiêu âm tiền ví (BR-24, AC-41).
  - *DoD*: Thử nghiệm ngắt mạng 9 phút rồi cắm lại mạng: Tiền quyết toán chuẩn xác tới từng phút; mất mạng quá 16 phút tự động khóa máy an toàn (Runbook T07).
- [ ] **Task 4.7: Triển khai API Quyết Toán Kết Thúc Phiên Gaming (AC-39)**
  - *File*: `backend/src/gaming/controllers/gaming-session.controller.ts` (`POST /api/gaming/sessions/:id/end`)
  - *Nghiệp vụ*: Khi khách đăng xuất hoặc quản lý tắt máy:
    - Tính tổng thời gian chơi thực tế (phút).
    - Tính số tiền phải trả theo giá niêm yết của nhóm máy (sảnh 10k/h, phòng riêng/esport 15k/h), làm tròn lên đến đồng (BR-34).
    - Trừ tiền từ `heldBalance` vào doanh thu (ghi dòng `SETTLE`), hoàn trả số tiền tạm giữ còn thừa từ `heldBalance` về `balance` (ghi dòng `RELEASE`).
  - *DoD*: Số dư ví được giải phóng tức thì, lịch sử sổ cái ghi chép đầy đủ, minh bạch.

##### Các bước thực hiện nhỏ - Báo cáo Doanh thu Đa chiều & Kiểm toán (M17 - Phối hợp Huyền T4):
- [ ] **Task 4.8: Xây dựng Động cơ Tổng hợp Thống kê Hàng ngày (Daily Stats Aggregator)**
  - *File*: `backend/src/analytics/services/daily-stats.service.ts`
  - *Nghiệp vụ*: Cronjob chạy ban đêm tổng hợp dữ liệu vào collection `daily_stats`: Doanh thu tiền mặt, PayOS, ví; doanh thu theo từng bộ môn thể thao; số lượt vào gym/bơi; số giờ net; tỷ lệ hủy sân, no-show.
  - *DoD*: Dữ liệu báo cáo được tính toán trước, truy vấn báo cáo phản hồi trong < 250ms.
- [ ] **Task 4.9: Xây dựng API Báo cáo Doanh thu Đa chiều Theo 2 Cơ sở Ghi nhận (BR-49, AC-49)**
  - *File*: `backend/src/analytics/controllers/admin-reports.controller.ts` (`GET /api/admin/reports/revenue`)
  - *Nghiệp vụ chuẩn mực kế toán*:
    - **Cơ sở 1 - Ngày thanh toán (Cash Basis)**: Ghi nhận doanh thu tại thời điểm tiền thực tế đổ về ngân hàng/ví (áp dụng cho đối soát tài khoản và quyết toán thuế VAT).
    - **Cơ sở 2 - Ngày sử dụng (Accrual Basis)**: Ghi nhận doanh thu tại thời điểm khách hàng thực tế vào sân thi đấu, tập gym hoặc chơi net (áp dụng cho đánh giá hiệu quả kinh doanh của ban quản trị).
    - Hỗ trợ tham số `basis: CASH | ACCRUAL | BOTH`.
  - *DoD*: Báo cáo đối chiếu song song 2 cột số liệu chuẩn xác, không bị vênh với sổ cái `wallet_ledger` và bảng `payments`.
- [ ] **Task 4.10: Xây dựng Chức năng Xuất Tệp Báo cáo Excel, PDF, CSV Chuẩn Tiếng Việt (NFR-13, AC-62, AC-63)**
  - *File*: `backend/src/analytics/services/report-exporter.service.ts`
  - *Nghiệp vụ*:
    - Tệp CSV có gắn tiền tố UTF-8 BOM (`\uFEFF`) để Excel tiếng Việt không bị lỗi font chữ.
    - Tệp Excel (.xlsx) định dạng đúng kiểu số, có công thức tổng.
    - Tệp PDF định dạng A4 ngang có logo Phanta Sports và ô chữ ký của Giám đốc / Kế toán trưởng.
    - Giới hạn an toàn: Báo cáo vượt quá 50.000 dòng trả về lỗi `EXPORT_TOO_LARGE` yêu cầu thu hẹp khoảng ngày (AC-63).
  - *DoD*: Xuất file 20.000 dòng hoàn tất trong < 5 giây (NFR-13).

---

### GIAI ĐOẠN 5 (Tuần 36 – 40): Kiểm Thử Tải Tài Chính, Pentest Bảo Mật & Chuyển Đổi Môi Trường Thật
#### Epic E05-T2: Thẩm Định Bảo Mật Dòng Tiền, Kiểm Thử Tải Nặng & Đưa Cổng Thanh Toán Vào Hoạt Động Thật
- **Mục tiêu**: Vượt qua 100% các tiêu chí nghiệm thu tài chính (AC), kiểm thử tải đồng thời không lỗi dây chuyền, vá toàn bộ lỗ hổng Pentest bảo mật, và cấu hình môi trường Production chính thức.

##### Các bước thực hiện nhỏ:
- [ ] **Task 5.1: Thực thi Kịch bản Kiểm thử Runbook T03 (Chống Webhook Trùng)**
  - *Nghiệp vụ*: Dùng k6/jest gửi 10 request webhook cùng mã giao dịch ngân hàng trong 100ms.
  - *Tiêu chí đạt*: Đúng 1 request ghi nhận doanh thu, 9 request trả về HTTP 200 an toàn, số dư ví hoặc trạng thái đơn chỉ cập nhật 1 lần duy nhất (AC-25).
- [ ] **Task 5.2: Thực thi Kịch bản Kiểm thử Runbook T04 (Chống Số Dư Âm 1.000 Thao Tác Trừ Ví)**
  - *Nghiệp vụ*: Giả lập 1 tài khoản có 1.000.000đ, bắn 1.000 request trừ 2.000đ đồng thời từ nhiều worker.
  - *Tiêu chí đạt*: Đúng 500 request thành công, 500 request bị từ chối `WALLET_INSUFFICIENT_BALANCE`; số dư cuối cùng về đúng 0đ; tổng sổ cái khớp đúng 1.000.000đ (AC-37).
- [ ] **Task 5.3: Thực thi Kịch bản Kiểm thử Runbook T10 (Toàn vẹn Hóa đơn & Kế toán)**
  - *Nghiệp vụ*: Chạy 500 giao dịch thanh toán hỗn hợp (đặt sân, canteen, nạp ví, cọc dụng cụ).
  - *Tiêu chí đạt*: 100% giao dịch doanh thu có hóa đơn điện tử; nạp ví và cọc dụng cụ tuyệt đối không sinh hóa đơn (AC-78); hủy đơn sinh hóa đơn điều chỉnh/hủy hợp pháp.
- [ ] **Task 5.4: Thực thi Kịch bản Kiểm thử Runbook T11 (Cứu Đơn Thiếu Tài Nguyên)**
  - *Nghiệp vụ*: Bắn webhook trễ cho đơn đã hết hạn: (1) Voucher hết lượt -> Kiểm tra hệ thống tự hủy và hoàn 100%; (2) Dụng cụ hết tồn kho -> Kiểm tra hệ thống cứu đơn sân CONFIRMED và hoàn riêng tiền dụng cụ (AC-77).
- [ ] **Task 5.5: Thực thi Kịch bản Kiểm thử Runbook T16 & T18 (Rút ví OTP & Voucher HELD)**
  - *Tiêu chí đạt*: Rút ví chuyển tiền sang `heldBalance`, cấm tiêu số tiền đó; 2 đơn HELD cùng 1 khách áp mã `perUserLimit = 1` chỉ có 1 đơn áp được.
- [ ] **Task 5.6: Rà soát & Vá Lỗ hổng Bảo mật Pentest Độc lập**
  - *Nghiệp vụ*:
    - Kiểm tra bảo mật so sánh HMAC Webhook: Dùng `crypto.timingSafeEqual` chống tấn công vét cạn thời gian (Timing Attack).
    - Kiểm tra mã hóa cấp trường AES-256-GCM đối với thông tin tài khoản ngân hàng nhận tiền hoàn của khách (NFR-03).
    - Cấu hình IP Whitelist cho các máy POS quầy thu ngân và chặn Rate Limit API giữ chỗ (`NFR-04`: 10 req/phút/user).
- [ ] **Task 5.7: Đăng ký & Cấu hình Thông tin Sản phẩm Thật (Production Live Keys)**
  - *Nghiệp vụ*: Chuyển đổi cấu hình từ Sandbox sang Production chính thức:
    - PayOS Live API Keys, Webhook URL chính thức có SSL TLS 1.3.
    - MISA meInvoice tài khoản doanh nghiệp thật, chứng thư số điện tử HSM.
    - Zalo ZNS Template chính thức được Zalo phê duyệt.
  - *File*: Quản lý qua `AWS Secrets Manager` / biến môi trường Production an toàn.
- [ ] **Task 5.8: Giao dịch Thử nghiệm Tiền Thật (Penny Testing)**
  - *Nghiệp vụ*: Tiến hành quét mã VietQR thật số tiền 10.000 VND từ ứng dụng ngân hàng thương mại: Kiểm tra tiền vào tài khoản thụ hưởng của Phanta, Webhook khớp lệnh trong 2 giây, vé QR động sinh ra, hóa đơn điện tử xuất lên hệ thống MISA thật, và ZNS gửi về Zalo của tester.

---

### GIAI ĐOẠN 6 (Tuần 41 – 44): Triển Khai Thực Tế, Giám Sát Dòng Tiền & Hypercare
#### Epic E06-T2: Trực Chiến Vận Hành Dòng Tiền, Giám Sát Webhook & Đối Soát Sổ Kế Toán Sau Golive
- **Mục tiêu**: Đồng hành cùng cơ sở thể thao Phanta trong ngày khai trương và 2 tuần Hypercare; bảo đảm 100% giao dịch tài chính thông suốt, an toàn tuyệt đối.

##### Các bước thực hiện nhỏ:
- [ ] **Task 6.1: Trực chiến Giám sát Hệ thống Thanh toán Ngày Mở Bán (Go-Live Day)**
  - *Nghiệp vụ*: Thiết lập kênh cảnh báo Telegram/Slack bot tự động thông báo ngay lập tức khi:
    - Có webhook PayOS thất bại hoặc bị chậm quá 3 giây.
    - Có đơn thanh toán bị lệch số tiền (`AMOUNT_MISMATCH`).
    - Số dư ví hoặc sổ cái có dấu hiệu chênh lệch.
  - *DoD*: Tỷ lệ giao dịch thanh toán thành công đạt >= 99.9%.
- [ ] **Task 6.2: Hỗ trợ Quầy POS Đối Soát Tiền Ca Thu Ngân Tuần Đầu**
  - *Nghiệp vụ*: Trực tiếp hỗ trợ nhân viên thu ngân và quản lý quầy kiểm đếm tiền mặt, tiền chuyển khoản và tiền nạp ví khi đóng ca; xử lý kịp thời các trường hợp cưỡng bức đóng ca hoặc duyệt chênh lệch tiền két (BR-44, BR-44a).
- [ ] **Task 6.3: Tự động hóa Đối Soát Dòng Tiền Ban Đêm (Nightly Reconciliation Cronjob)**
  - *Nghiệp vụ*: Viết job chạy lúc 00:30 hàng ngày:
    1. Lấy sao kê giao dịch từ PayOS API.
    2. Đối soát với bảng `payments` trên MongoDB.
    3. Đối soát tổng nạp/trừ ví trên `wallet_ledger`.
    4. Đối soát số lượng hóa đơn xuất trên MISA meInvoice.
    5. Xuất báo cáo tổng hợp gửi qua email cho Kế toán trưởng và Ban quản trị.
  - *DoD*: Phát hiện sớm 100% các giao dịch bất thường (nếu có) trước giờ mở cửa ngày mới.
- [ ] **Task 6.4: Hoàn tất Bàn giao Tài liệu Kỹ thuật Tài chính & Sổ cái**
  - *Nghiệp vụ*: Đóng gói toàn bộ tài liệu vận hành:
    - Hướng dẫn xử lý sự cố thanh toán và hoàn tiền cho bộ phận Lễ tân & Quản lý.
    - Hướng dẫn tra cứu hóa đơn và xuất báo cáo tài chính cho bộ phận Kế toán.
    - Bàn giao mã nguồn sạch sẽ, đầy đủ chú thích docstrings, hoàn tất 2 tuần Hypercare.

---

## 4. QUY TRÌNH LÀM VIỆC GIT & PHỐI HỢP NHÓM (DÀNH RIÊNG CHO NGỌC)

1. **Nhánh Git làm việc của Ngọc**:
   - Nhánh chính của Ngọc: `feat/backend-kit-ngoc`
   - Khi thực hiện các tính năng chi tiết, có thể tạo nhánh phụ:
     - `feat/ngoc-e10-notification`
     - `feat/ngoc-e04-payment-payos`
     - `feat/ngoc-e08-wallet-ledger`
     - `feat/ngoc-e09-einvoice`
     - `feat/ngoc-e13-voucher-combo`
2. **Quy tắc Commit chuẩn Conventional Commits**:
   - `feat(payment): implement payos vietqr dynamic code generation with vat snapshot (BR-06)`
   - `feat(webhook): handle late webhook rescue in single acid transaction (BR-11a)`
   - `feat(wallet): implement append-only wallet ledger and non-negative balance lock (BR-21, BR-22)`
   - `feat(invoice): integrate misa meinvoice adapter with bullmq retry queue (BR-49)`
   - `feat(notification): implement multi-channel notification engine with zns fallback (FR-08)`
   - `test(wallet): add 1000 concurrent spend race condition test suite T04`
3. **Quy tắc Phối hợp Nhóm (Team Collaboration)**:
   - **Với Tech Lead T1 (Cao Nguyên Anh)**: Mọi thay đổi chạm đến logic trừ tiền hoặc schema `payments`, `wallets` bắt buộc tag T1 review trước khi merge vào `main`.
   - **Với Frontend Lead T4 (Huyền)**: Cung cấp API Contracts trong `packages/contracts/src/` để T4 xây dựng giao diện thanh toán, ví và báo cáo doanh thu trên Web Admin/Portal.
   - **Với Mobile & POS Lead T5 (Vy)**: Phối hợp đẩy FCM Push Notification, cung cấp API quét mã QR nạp ví và trừ ví tại quầy POS.
   - **Với Gaming Lead T6 (Phong)**: Thống nhất giao thức WebSocket và API tạm giữ cuốn chiếu (`POST /api/gaming/sessions/start`, `heartbeat`, `end`) cho 100 máy gaming.
   - **Với QA & DevOps Lead T7 (Minh Thiện)**: Phối hợp cấu hình biến môi trường sandbox/production trên CI/CD GitHub Actions và Docker Compose.

---
*Kế hoạch này là kim chỉ nam hành động chính thức cho Võ Hoàng Anh Ngọc (T2) trong suốt 44 tuần triển khai dự án Hệ thống Đặt lịch & Quản lý Tổ hợp Dịch vụ Thể thao Phanta.*
