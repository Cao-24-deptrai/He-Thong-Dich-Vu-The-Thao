# Kế hoạch triển khai: M06 Thanh toán đa phương thức, Webhook & Đối soát (Payment Gateway & POS Payment)

Người phụ trách: T2 (Backend Thanh toán) · Giai đoạn: GĐ2 · Ngày công ước lượng (spec 8.2): 50 ngày công

## 1. Phạm vi
- **Làm:**
  - `F06.1`: Tiền mặt tại POS (`CASH`): Thu ngân nhập số tiền khách đưa, hệ thống tính tiền thừa nguyên tử, ghi nhận vào ca thu ngân.
  - `F06.2`: VietQR động (`VIETQR`): Tạo mã QR theo từng đơn với nội dung chuyển khoản duy nhất `PAY<paymentCode>`, hạn dùng khớp thời gian giữ chỗ (10 phút); tự nhận diện giao dịch qua webhook của đơn vị trung gian.
  - `F06.3`: Ví điện tử (`MOMO`, `ZALOPAY`, `VNPAY`): Tạo liên kết thanh toán, nhận kết quả qua IPN/webhook.
  - `F06.4`: Trả bằng ví nội bộ (`WALLET`): Khấu trừ tiền ví nội bộ (kết nối M05 `WalletService`) cho danh mục dịch vụ được phép.
  - `F06.5`: Thanh toán hỗn hợp tại POS (`SPLIT PAYMENT`): Cho phép một đơn thanh toán bằng nhiều phương thức (ví dụ: một phần ví nội bộ, một phần tiền mặt/VietQR).
  - `F06.6`: Hoàn tiền: Hoàn tức thì vào ví nội bộ hoặc hoàn về nguồn tiền gốc qua API cổng thanh toán.
  - `F06.7`: Đối soát hằng ngày: So khớp giao dịch hệ thống với dữ liệu cổng; danh sách giao dịch `MISMATCH` để quản lý xử lý.
  - `F06.8`: Tra cứu giao dịch, trạng thái, lịch sử webhook raw event (`payment_events`).
- **Hoãn / phụ thuộc module sau:**
  - Tự động xuất hóa đơn điện tử cho từng đơn thanh toán (chờ M08 Hóa đơn điện tử).

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Khớp chính xác số tiền (Exact Amount Matching)**: Số tiền nhận phải khớp chính xác 100% số tiền cần trả. Bất kỳ chênh lệch thừa/thiếu đều đưa vào trạng thái `MISMATCH`, không tự động xác nhận đơn hàng.
2. **Bất biến số nguyên an toàn**: Mọi số tiền đều là số nguyên VND (`Number.isSafeInteger`).
3. **Idempotency tuyệt đối của Webhook**: Lưu raw webhook payload vào `payment_events` với Unique index `(provider, providerTxnId)`. Xử lý lặp lại webhook chỉ có tác dụng đúng một lần.
4. **Xác thực chữ ký HMAC-SHA256**: Mọi webhook gửi đến đều bắt buộc phải vượt qua bước kiểm tra chữ ký mật mã trước khi xử lý nghiệp vụ.
5. **Xử lý thanh toán muộn (Late Payment)**: Nhận tiền sau khi slot đã hết hạn hoặc bị hủy -> chuyển trạng thái `MISMATCH`, tự động nạp tiền tương ứng vào ví nội bộ cho khách.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| POST | `/api/v1/payments` | `CreatePaymentRequest` | `PaymentDetail` | `ORDER_NOT_FOUND`, `INVALID_AMOUNT` |
| GET | `/api/v1/payments/:id` | None | `PaymentDetail` | `NOT_FOUND` |
| POST | `/api/v1/payments/webhook/:provider` | `WebhookPayload` | `{ success: boolean }` | `INVALID_SIGNATURE`, `MISMATCH` |
| POST | `/api/v1/admin/payments/pos/cash` | `CashPaymentRequest` | `PaymentDetail` | `INSUFFICIENT_CASH` |
| POST | `/api/v1/admin/payments/pos/split` | `SplitPaymentRequest` | `PaymentDetail[]` | `SPLIT_TOTAL_MISMATCH` |
| GET | `/api/v1/admin/payments` | `{ page, limit, status, provider, date }` | `PaymentList` | None |
| GET | `/api/v1/admin/payments/mismatches` | `{ page, limit }` | `PaymentList` | None |
| GET | `/api/v1/admin/payments/reconcile` | `{ date, provider }` | `ReconcileSummary` | None |

## 4. Cấu trúc CSDL
- **Collection `payments`:**
  - `_id`: ObjectId
  - `paymentCode`: string (Unique index)
  - `orderId`: ObjectId (index)
  - `orderType`: PaymentOrderType (`BOOKING`, `CANTEEN_ORDER`, `RETAIL_ORDER`, `WALLET_TOPUP`, `GYM_MEMBERSHIP`)
  - `userId`: ObjectId (index)
  - `amount`: number (Integer VND)
  - `paidAmount`: number (Integer VND)
  - `status`: PaymentStatus (`CREATED`, `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`, `MISMATCH`, `REFUNDED`, `PARTIALLY_REFUNDED`)
  - `method`: PaymentMethod (`CASH`, `VIETQR`, `MOMO`, `ZALOPAY`, `VNPAY`, `INTERNAL_WALLET`)
  - `provider`: PaymentProvider
  - `providerTxnId`?: string
  - `qrCodeText`?: string
  - `qrDataUrl`?: string
  - `expiresAt`: Date (index)
  - `idempotencyKey`: string (Unique index)
  - `meta`?: Record<string, any>
  - `createdAt`: Date
  - `updatedAt`: Date
- **Collection `payment_events`:**
  - `_id`: ObjectId
  - `provider`: PaymentProvider
  - `providerTxnId`: string
  - `paymentCode`: string
  - `amount`: number
  - `signature`: string
  - `signatureVerified`: boolean
  - `processed`: boolean
  - `payload`: Record<string, any>
  - `createdAt`: Date
  - Index: `{ provider: 1, providerTxnId: 1 }` (Unique)

## 5. Kế hoạch thực hiện (thứ tự từng bước)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Payment trong `packages/contracts/src/payment.ts`.
- [x] 2. Tạo Mongoose schemas và Unique indexes: `PaymentSchema`, `PaymentEventSchema`.
- [x] 3. Xây dựng `VietQrService` sinh chuỗi VietQR chuẩn EMVCo và mã chuyển khoản `PAY<paymentCode>`.
- [x] 4. Xây dựng `PaymentWebhookService` xác minh chữ ký HMAC-SHA256 và lưu `payment_events`.
- [x] 5. Xây dựng `PaymentService`:
  - `createPayment(userId, dto)`
  - `processCashPayment(actorId, dto)`
  - `processWalletPayment(userId, paymentId, idempotencyKey)`
  - `processSplitPayment(actorId, dto)`
  - `handlePaymentSuccess(paymentCode, amount, providerTxnId)`
  - `refundPayment(paymentId, amount, reason, actorId)`
  - `reconcileDaily(date, provider)`
- [x] 6. Xây dựng Controllers: `PaymentsController`, `AdminPaymentsController`.
- [x] 7. Đăng ký `PaymentModule` vào `app.module.ts`.
- [x] 8. Viết Unit & Webhook Tests:
  - Thanh toán tiền mặt tại quầy tính tiền thừa chuẩn xác.
  - Thanh toán ví nội bộ thành công & từ chối khi số dư không đủ.
  - Thanh toán hỗn hợp: đơn chỉ hoàn tất khi tổng thanh toán = 100% giá trị đơn.
  - Khớp số tiền tuyệt đối: chênh lệch 1 đồng chuyển trạng thái `MISMATCH`.
  - Thanh toán muộn: slot hết hạn chuyển `MISMATCH` và tự động hoàn tiền vào ví khách.
  - Webhook: kiểm tra chữ ký HMAC-SHA256, khử trùng lặp giao dịch 20 lần gọi chỉ xử lý 1 lần.
- [x] 9. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`).
