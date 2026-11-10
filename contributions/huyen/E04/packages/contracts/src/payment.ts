import { z } from 'zod';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  PaymentOrderType,
} from '@sports/shared';

export { PaymentMethod, PaymentStatus, PaymentProvider, PaymentOrderType };

// --- 1. Khởi tạo thanh toán (Create Payment Request) ---
export const createPaymentSchema = z.object({
  orderId: z.string().trim().min(1).describe('ID đơn hàng hoặc đặt sân'),
  orderType: z.nativeEnum(PaymentOrderType).describe('Loại đơn hàng cần thanh toán'),
  amount: z.number().int().positive().describe('Số tiền cần thanh toán (VND nguyên)'),
  method: z.nativeEnum(PaymentMethod).describe('Phương thức thanh toán lựa chọn'),
  idempotencyKey: z.string().trim().min(8).max(64),
  returnUrl: z.string().url().optional(),
});

export type CreatePaymentDto = z.input<typeof createPaymentSchema>;
export type CreatePaymentRequest = CreatePaymentDto;

// --- 2. Thanh toán tiền mặt tại quầy (Cash Payment) ---
export const cashPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  receivedAmount: z.number().int().positive().describe('Số tiền khách đưa cho thu ngân (VND nguyên)'),
  note: z.string().trim().max(200).optional(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type CashPaymentDto = z.input<typeof cashPaymentSchema>;
export type CashPaymentRequest = CashPaymentDto;

// --- 3. Thanh toán hỗn hợp tại POS (Split Payment) ---
export const splitPaymentItemSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().int().positive().describe('Số tiền thanh toán cho phần này (VND nguyên)'),
  receivedAmount: z.number().int().positive().optional().describe('Số tiền khách đưa (nếu là tiền mặt)'),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type SplitPaymentItemDto = z.input<typeof splitPaymentItemSchema>;

export const splitPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  orderType: z.nativeEnum(PaymentOrderType),
  totalAmount: z.number().int().positive(),
  splits: z.array(splitPaymentItemSchema).min(1).describe('Danh sách các khoản thanh toán cấu thành'),
});

export type SplitPaymentDto = z.input<typeof splitPaymentSchema>;
export type SplitPaymentRequest = SplitPaymentDto;

// --- 4. Webhook / IPN Payload từ nhà cung cấp ---
export const webhookPayloadSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  providerTxnId: z.string().trim().min(1).describe('Mã giao dịch từ cổng/ngân hàng'),
  paymentCode: z.string().trim().min(1).describe('Mã thanh toán hệ thống (PAY...)'),
  amount: z.number().int().positive().describe('Số tiền thực chuyển (VND nguyên)'),
  signature: z.string().trim().min(1).describe('Chữ ký HMAC-SHA256 xác thực từ nhà cung cấp'),
  timestamp: z.string().describe('Thời gian giao dịch theo cổng'),
  rawPayload: z.record(z.any()).optional(),
});

export type WebhookPayloadDto = z.infer<typeof webhookPayloadSchema>;

// --- 5. Chi tiết giao dịch thanh toán (Payment Detail) ---
export const paymentDetailSchema = z.object({
  id: z.string(),
  paymentCode: z.string(),
  orderId: z.string(),
  orderType: z.nativeEnum(PaymentOrderType),
  userId: z.string(),
  amount: z.number().int().positive(),
  paidAmount: z.number().int().nonnegative(),
  status: z.nativeEnum(PaymentStatus),
  method: z.nativeEnum(PaymentMethod),
  provider: z.nativeEnum(PaymentProvider),
  providerTxnId: z.string().optional(),
  qrCodeText: z.string().optional().describe('Chuỗi nội dung VietQR EMVCo'),
  qrDataUrl: z.string().optional().describe('Mã QR dạng Data URL hình ảnh'),
  expiresAt: z.string().datetime(),
  changeAmount: z.number().int().nonnegative().optional().describe('Tiền thừa trả khách nếu tiền mặt'),
  mismatchReason: z.string().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PaymentDetail = z.infer<typeof paymentDetailSchema>;

// --- 6. Danh sách giao dịch phân trang ---
export const paymentListSchema = z.object({
  items: z.array(paymentDetailSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type PaymentList = z.infer<typeof paymentListSchema>;

// --- 7. Báo cáo đối soát doanh thu cổng thanh toán (Reconciliation) ---
export const reconcileSummarySchema = z.object({
  date: z.string(),
  provider: z.string(),
  systemTotal: z.number().int(),
  systemCount: z.number().int(),
  providerTotal: z.number().int(),
  providerCount: z.number().int(),
  isBalanced: z.boolean(),
  mismatchCount: z.number().int(),
});

export type ReconcileSummary = z.infer<typeof reconcileSummarySchema>;
