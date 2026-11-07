// MẪU adapter. Mỗi nhà cung cấp (VietQR aggregator, MoMo, ZaloPay, VNPay) triển khai interface này.
// KHÔNG đoán API: đọc tài liệu chính thức của nhà cung cấp và dùng tài khoản sandbox.

export type PaymentMethod = 'BANK_QR' | 'MOMO' | 'ZALOPAY' | 'VNPAY';

export interface CreatePaymentInput {
  paymentId: string;     // id nội bộ
  orderCode: string;
  amountVnd: number;     // số nguyên
  reference: string;     // mã tham chiếu duy nhất (nội dung chuyển khoản / orderId gửi cổng)
  expiresAt: Date;       // = hạn giữ chỗ
  returnUrl?: string;
}
export interface CreatePaymentResult {
  qrContent?: string;    // VietQR
  payUrl?: string;       // chuyển hướng/deeplink ví điện tử
  providerRef?: string;
}

export interface NormalizedPaymentEvent {
  provider: string;
  providerTxnId: string; // khóa khử trùng
  reference: string;     // để khớp với payments.reference
  amountVnd: number;
  status: 'SUCCEEDED' | 'FAILED';
  occurredAt: Date;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Xác minh chữ ký trên RAW BODY. Ném lỗi nếu sai. Chưa parse JSON trước khi xác minh. */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): void;
  parseWebhook(rawBody: Buffer): NormalizedPaymentEvent;
  /** Có thể không hỗ trợ: khi đó hoàn qua ví hoặc xử lý thủ công có biên bản. */
  refund?(providerTxnId: string, amountVnd: number, reason: string): Promise<{ providerRefundId: string }>;
}

// Luồng webhook (controller mỏng → PaymentService.handleWebhook):
// 1. raw body → provider.verifyWebhook()  (sai: 401, ghi log an toàn, KHÔNG xử lý)
// 2. lưu payment_events (bản gốc, signatureOk) TRƯỚC khi xử lý
// 3. parse → NormalizedPaymentEvent
// 4. transaction:
//    - tìm payment theo reference; không có → đánh dấu UNMATCHED, chờ đối soát
//    - chèn/ cập nhật với unique (provider, providerTxnId): trùng → coi như đã xử lý, trả OK
//    - amount !== payment.amount → status MISMATCH, KHÔNG xác nhận, báo quản lý
//    - hết hạn giữ chỗ → luồng "thanh toán muộn" (ô còn trống thì xác nhận; mất thì hoàn ví)
//    - ngược lại → SUCCEEDED, order PAID, gọi confirm của module sở hữu (booking/wallet topup/…), ghi outbox
// 5. trả đúng định dạng ack mà nhà cung cấp yêu cầu (thường 200 nhanh); xử lý nặng đẩy sang queue
