---
name: payment-provider-integration
description: Tích hợp cổng thanh toán (VietQR qua đơn vị trung gian như payOS/SePay/Casso, MoMo, ZaloPay, VNPay) theo mẫu adapter, xử lý webhook an toàn, khử trùng, lệch số tiền, thanh toán muộn, hoàn tiền, đối soát. Dùng khi làm module payment/M06, thêm phương thức thanh toán, sửa webhook, đối soát giao dịch.
---

# payment-provider-integration

Đọc trước: spec **M06**, **3.6** (thanh toán muộn), **5.3**, rule `00-invariants` (mục Thanh toán), `02-security-privacy` (mục Webhook).

## Nguyên tắc
- **Mỗi nhà cung cấp là một adapter** (`resources/provider-adapter.example.ts`). Phần nghiệp vụ (`PaymentService`) không biết chi tiết nhà cung cấp.
- **Không đoán API.** Đọc tài liệu chính thức mới nhất của từng nhà cung cấp, dùng sandbox, ghi nguồn tài liệu vào `docs/` (tên endpoint, thuật toán chữ ký, định dạng ack). Nếu thiếu tài khoản/khóa sandbox → **hỏi người dùng**, đừng bịa dữ liệu.
- Phương thức hỗ trợ: tiền mặt (POS), VietQR, MoMo, ZaloPay, VNPay, ví nội bộ. **Không** thẻ quốc tế.

## Quy trình thêm/sửa một nhà cung cấp
1. Contract: `POST /payments`, `GET /payments/{id}`, `POST /webhooks/<provider>` (webhook không dùng JWT, dùng chữ ký).
2. Triển khai adapter: `createPayment`, `verifyWebhook` (**trên raw body**), `parseWebhook`, `refund?`.
3. Cấu hình bằng biến môi trường (khóa, secret, URL sandbox/thật). Không commit bí mật.
4. Controller webhook lấy **raw body** (cấu hình NestJS `rawBody: true`), gọi `PaymentService.handleWebhook` (luồng ở cuối file mẫu).
5. Mã tham chiếu (`reference`): duy nhất, chữ-số in hoa, đủ ngắn để ngân hàng không cắt nội dung; kiểm tra giới hạn của nhà cung cấp.
6. Thêm fixture webhook ký sẵn (đúng/sai chữ ký, lặp, sai số tiền, hết hạn) vào test.

## Quy tắc xử lý (bắt buộc)
| Tình huống | Hành vi |
|---|---|
| Chữ ký sai | 401, không xử lý, ghi log an toàn (không in secret) |
| Webhook lặp (cùng `providerTxnId`) | Chỉ xác nhận một lần (unique `(provider, providerTxnId)`), trả OK |
| Không tìm thấy payment theo reference | `UNMATCHED`, vào danh sách đối soát |
| Số tiền khác số cần trả (thừa hoặc thiếu) | `MISMATCH`, **không** tự xác nhận, báo quản lý |
| Đến sau khi giữ chỗ hết hạn | Ô còn trống → xác nhận; ô đã mất → **hoàn vào ví** + thông báo (luồng 3.6) |
| Đơn nhiều thanh toán (hỗn hợp) | Đơn `PAID` chỉ khi tổng thanh toán thành công = tổng tiền |
| Hoàn tiền | Mặc định về **ví nội bộ** (A04); về nguồn gốc chỉ khi cổng có API hoặc xử lý thủ công có biên bản; luôn tạo bản ghi `refunds` |

## Đối soát
- Job hằng ngày: so khớp `payments` với dữ liệu cổng (API sao kê hoặc tệp import). Kết quả: danh sách không khớp để quản lý xử lý trong màn hình thanh toán.
- Mọi xác nhận thủ công bởi quản lý: lý do bắt buộc + `audit_logs`.

## Cạm bẫy
- Parse JSON rồi mới xác minh chữ ký (sai: phải xác minh trên raw body).
- Xác nhận chỉ dựa vào chuyển hướng "quay lại app" của khách thay vì webhook/truy vấn server-to-server.
- Xử lý nặng trong request webhook gây timeout → nhà cung cấp gửi lặp. Hãy ack nhanh và đẩy việc nặng sang queue (vẫn khử trùng).
- Dùng sandbox và production chung biến cấu hình.

## Kiểm thử bắt buộc
**T04** (webhook lặp 10 lần), **T05** (thanh toán muộn), **T06** (sai số tiền) + chữ ký sai, + test hoàn tiền vào ví. Xem skill `concurrency-test-kit`.
