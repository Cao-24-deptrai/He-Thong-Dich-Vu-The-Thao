import { z } from 'zod';
import {
  ProductCategory,
  StockTxnType,
  CashierShiftStatus,
  CanteenOrderStatus,
  PaymentMethod,
} from '@sports/shared';

export { ProductCategory, StockTxnType, CashierShiftStatus, CanteenOrderStatus };

// --- 1. Sản phẩm (Product) ---
export const productSchema = z.object({
  id: z.string(),
  sku: z.string().trim().min(1),
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1),
  category: z.nativeEnum(ProductCategory),
  unit: z.string().trim().min(1),
  price: z.number().int().nonnegative().describe('Giá bán đã gồm VAT (VND)'),
  costPrice: z.number().int().nonnegative().default(0).describe('Giá vốn bình quân gia quyền (VND)'),
  vatRate: z.number().int().min(0).max(100).default(8).describe('Thuế suất VAT (%)'),
  trackInventory: z.boolean().default(true),
  stock: z.number().int().default(0),
  minStockThreshold: z.number().int().nonnegative().default(5),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type Product = z.infer<typeof productSchema>;

export const createProductSchema = z.object({
  sku: z.string().trim().min(1),
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1),
  category: z.nativeEnum(ProductCategory),
  unit: z.string().trim().min(1).default('cái'),
  price: z.number().int().nonnegative(),
  costPrice: z.number().int().nonnegative().default(0),
  vatRate: z.number().int().min(0).max(100).default(8),
  trackInventory: z.boolean().default(true),
  stock: z.number().int().nonnegative().default(0),
  minStockThreshold: z.number().int().nonnegative().default(5),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateProductDto = z.input<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductDto = z.input<typeof updateProductSchema>;

export const productListQuerySchema = z.object({
  category: z.nativeEnum(ProductCategory).optional(),
  search: z.string().optional(),
  barcode: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

export type ProductListQueryDto = z.input<typeof productListQuerySchema>;

export const productListResponseSchema = z.object({
  items: z.array(productSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

// --- 2. Kho & Thẻ kho (Inventory & Stock Transactions) ---
export const stockInSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  unitCostPrice: z.number().int().nonnegative().describe('Giá nhập đơn vị'),
  notes: z.string().optional(),
});

export type StockInDto = z.input<typeof stockInSchema>;

export const stockOutSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(1).describe('Lý do xuất (hủy, hết hạn, hao hụt)'),
  notes: z.string().optional(),
});

export type StockOutDto = z.input<typeof stockOutSchema>;

export const stockAuditItemSchema = z.object({
  productId: z.string().trim().min(1),
  actualStock: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

export const stockAuditSchema = z.object({
  items: z.array(stockAuditItemSchema).min(1),
  notes: z.string().optional(),
});

export type StockAuditDto = z.input<typeof stockAuditSchema>;

export const stockTransactionDetailSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string().optional(),
  type: z.nativeEnum(StockTxnType),
  quantity: z.number().int(),
  beforeStock: z.number().int(),
  afterStock: z.number().int(),
  unitPrice: z.number().int().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  operatorId: z.string(),
  createdAt: z.string(),
});

export type StockTransactionDetail = z.infer<typeof stockTransactionDetailSchema>;

// --- 3. Ca thu ngân (Cashier Shifts) ---
export const openCashierShiftSchema = z.object({
  openingCash: z.number().int().nonnegative().describe('Tiền mặt đầu ca (VND)'),
  notes: z.string().optional(),
});

export type OpenCashierShiftDto = z.input<typeof openCashierShiftSchema>;

export const closeCashierShiftSchema = z.object({
  closingCashActual: z.number().int().nonnegative().describe('Tiền mặt thực đếm cuối ca (VND)'),
  notes: z.string().optional(),
});

export type CloseCashierShiftDto = z.input<typeof closeCashierShiftSchema>;

export const cashierShiftDetailSchema = z.object({
  id: z.string(),
  shiftCode: z.string(),
  cashierId: z.string(),
  cashierName: z.string(),
  openedAt: z.string(),
  openingCash: z.number().int().nonnegative(),
  status: z.nativeEnum(CashierShiftStatus),
  closedAt: z.string().optional(),
  closingCashExpected: z.number().int().optional(),
  closingCashActual: z.number().int().optional(),
  difference: z.number().int().optional(),
  totalOrders: z.number().int().nonnegative(),
  totalCashSales: z.number().int().nonnegative(),
  totalQrSales: z.number().int().nonnegative(),
  totalWalletSales: z.number().int().nonnegative(),
  totalSales: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

export type CashierShiftDetail = z.infer<typeof cashierShiftDetailSchema>;

// --- 4. Đơn hàng POS Canteen & Bán lẻ (Canteen Orders) ---
export const canteenOrderItemInputSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createPosOrderSchema = z.object({
  items: z.array(canteenOrderItemInputSchema).min(1),
  customerPhone: z.string().trim().optional(),
  discountAmount: z.number().int().nonnegative().default(0),
  paymentMethod: z.nativeEnum(PaymentMethod),
  cashGiven: z.number().int().nonnegative().optional().describe('Số tiền mặt khách đưa'),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type CreatePosOrderDto = z.input<typeof createPosOrderSchema>;

export const cancelPosOrderSchema = z.object({
  reason: z.string().trim().min(3),
});

export type CancelPosOrderDto = z.input<typeof cancelPosOrderSchema>;

export const canteenOrderItemDetailSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.nativeEnum(ProductCategory),
  unit: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  costPrice: z.number().int().nonnegative(),
  vatRate: z.number().int().min(0).max(100),
  subtotal: z.number().int().nonnegative(),
});

export type CanteenOrderItemDetail = z.infer<typeof canteenOrderItemDetailSchema>;

export const canteenOrderDetailSchema = z.object({
  id: z.string(),
  orderCode: z.string(),
  shiftId: z.string(),
  cashierId: z.string(),
  customerId: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(canteenOrderItemDetailSchema),
  subtotal: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative(),
  totalAmount: z.number().int().nonnegative(),
  vatAmount: z.number().int().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentId: z.string().optional(),
  paidAmount: z.number().int().nonnegative(),
  changeAmount: z.number().int().nonnegative(),
  status: z.nativeEnum(CanteenOrderStatus),
  cancelReason: z.string().optional(),
  cancelledBy: z.string().optional(),
  cancelledAt: z.string().optional(),
  invoiceId: z.string().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});

export type CanteenOrderDetail = z.infer<typeof canteenOrderDetailSchema>;

export const profitReportSchema = z.object({
  totalSales: z.number().int(),
  totalCost: z.number().int(),
  grossProfit: z.number().int(),
  profitMarginPercent: z.number(),
  orderCount: z.number().int(),
});

export type ProfitReport = z.infer<typeof profitReportSchema>;
