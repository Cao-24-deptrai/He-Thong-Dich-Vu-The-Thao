import { z } from 'zod';
import { WalletTxnType, WalletCategory, PaymentMethod } from '@sports/shared';

export { WalletTxnType, WalletCategory, PaymentMethod };

// --- Wallet Detail (Thông tin ví) ---
export const walletDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  balance: z.number().int().nonnegative().describe('Số dư khả dụng (VND nguyên)'),
  held: z.number().int().nonnegative().describe('Số tiền đang tạm giữ (VND nguyên)'),
  total: z.number().int().nonnegative().describe('Tổng số dư = balance + held'),
  version: z.number().int(),
  updatedAt: z.string().datetime(),
});

export type WalletDetail = z.infer<typeof walletDetailSchema>;

// --- Nạp tiền vào ví (TOPUP / DEPOSIT) ---
export const topupWalletSchema = z.object({
  amount: z.number().int().positive().describe('Số tiền nạp (VND nguyên)'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.VIETQR),
  idempotencyKey: z.string().trim().min(8).max(64),
  note: z.string().trim().max(200).optional(),
});

export type TopupWalletDto = z.input<typeof topupWalletSchema>;
export type TopupWalletRequest = TopupWalletDto;

// --- Thanh toán dịch vụ (SPEND / PAYMENT) ---
export const walletPaySchema = z.object({
  amount: z.number().int().positive().describe('Số tiền thanh toán (VND nguyên)'),
  category: z.nativeEnum(WalletCategory),
  refType: z.string().trim().min(1),
  refId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(64),
  note: z.string().trim().max(200).optional(),
});

export type WalletPayDto = z.input<typeof walletPaySchema>;
export type WalletPayRequest = WalletPayDto;

// --- Tạm giữ số dư (HOLD - dành cho gaming) ---
export const walletHoldSchema = z.object({
  amount: z.number().int().positive().describe('Số tiền tạm giữ (VND nguyên)'),
  refType: z.string().trim().default('GAMING_SESSION'),
  refId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(64),
  note: z.string().trim().max(200).optional(),
});

export type WalletHoldDto = z.input<typeof walletHoldSchema>;
export type WalletHoldRequest = WalletHoldDto;

// --- Giải tỏa tạm giữ (RELEASE) ---
export const walletReleaseSchema = z.object({
  amount: z.number().int().positive().describe('Số tiền giải tỏa trả về ví khả dụng'),
  refId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(64),
  note: z.string().trim().max(200).optional(),
});

export type WalletReleaseDto = z.input<typeof walletReleaseSchema>;
export type WalletReleaseRequest = WalletReleaseDto;

// --- Quyết toán phiên tạm giữ (SETTLE) ---
export const walletSettleSchema = z.object({
  amount: z.number().int().nonnegative().describe('Chi phí thực tế tiêu dùng (trừ vào doanh thu)'),
  heldToRelease: z.number().int().positive().describe('Tổng số tiền tạm giữ cần tất toán'),
  category: z.nativeEnum(WalletCategory).default(WalletCategory.GAME_TIME),
  refId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(64),
  note: z.string().trim().max(200).optional(),
});

export type WalletSettleDto = z.input<typeof walletSettleSchema>;
export type WalletSettleRequest = WalletSettleDto;

// --- Điều chỉnh số dư thủ công (ADJUSTMENT - Chỉ Admin) ---
export const adjustWalletSchema = z.object({
  amount: z.number().int().refine((val) => val !== 0, 'Số tiền điều chỉnh phải khác 0'),
  reason: z.string().trim().min(5).max(300).describe('Lý do bắt buộc cho bút toán điều chỉnh'),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type AdjustWalletDto = z.input<typeof adjustWalletSchema>;
export type AdjustWalletRequest = AdjustWalletDto;

// --- Bản ghi Sổ cái (Wallet Ledger Entry) ---
export const walletLedgerItemSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string(),
  type: z.nativeEnum(WalletTxnType),
  amount: z.number().int().describe('Biến động trên số dư khả dụng (có dấu)'),
  heldDelta: z.number().int().describe('Biến động trên số tiền tạm giữ (có dấu)'),
  balanceAfter: z.number().int(),
  heldAfter: z.number().int(),
  category: z.nativeEnum(WalletCategory).optional(),
  refType: z.string(),
  refId: z.string(),
  idempotencyKey: z.string(),
  note: z.string().optional(),
  actorId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type WalletLedgerItem = z.infer<typeof walletLedgerItemSchema>;

// --- Lịch sử giao dịch ví có phân trang ---
export const walletTransactionListSchema = z.object({
  items: z.array(walletLedgerItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type WalletTransactionList = z.infer<typeof walletTransactionListSchema>;

// --- Kết quả đối soát (Reconciliation) ---
export const reconciliationResultSchema = z.object({
  userId: z.string(),
  walletBalance: z.number().int(),
  walletHeld: z.number().int(),
  walletTotal: z.number().int(),
  ledgerSum: z.number().int(),
  isBalanced: z.boolean().describe('True nếu balance + held = ledgerSum'),
  transactionCount: z.number().int(),
});

export type ReconciliationResult = z.infer<typeof reconciliationResultSchema>;
