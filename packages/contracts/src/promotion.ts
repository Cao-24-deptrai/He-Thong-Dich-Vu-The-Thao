import { z } from 'zod';
import {
  VoucherDiscountType,
  VoucherScope,
  PromotionChannel,
  ComboItemType,
  UserPackageStatus,
  PaymentMethod,
} from '@sports/shared';

// ==================== VOUCHER SCHEMAS ====================

export const createVoucherSchema = z.object({
  code: z.string().min(3).max(30).trim().toUpperCase(),
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional(),
  discountType: z.nativeEnum(VoucherDiscountType),
  discountValue: z.number().int().positive(),
  maxDiscountAmount: z.number().int().positive().optional(),
  minOrderAmount: z.number().int().nonnegative().default(0),
  applicableScopes: z.array(z.nativeEnum(VoucherScope)).min(1).default([VoucherScope.ALL]),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  totalUsageLimit: z.number().int().positive().optional(),
  perCustomerLimit: z.number().int().positive().default(1),
  channel: z.nativeEnum(PromotionChannel).default(PromotionChannel.ALL),
  isActive: z.boolean().default(true).optional(),
});
export type CreateVoucherDto = z.infer<typeof createVoucherSchema>;

export const updateVoucherSchema = createVoucherSchema.partial();
export type UpdateVoucherDto = z.infer<typeof updateVoucherSchema>;

export const voucherListQuerySchema = z.object({
  scope: z.nativeEnum(VoucherScope).optional(),
  channel: z.nativeEnum(PromotionChannel).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type VoucherListQueryDto = z.infer<typeof voucherListQuerySchema>;

export const validateVoucherSchema = z.object({
  code: z.string().min(3).max(30).trim().toUpperCase(),
  customerId: z.string().optional(),
  customerPhone: z.string().optional(),
  scope: z.nativeEnum(VoucherScope),
  orderAmount: z.number().int().nonnegative(),
  channel: z.nativeEnum(PromotionChannel).default(PromotionChannel.ALL).optional(),
});
export type ValidateVoucherDto = z.infer<typeof validateVoucherSchema>;

export const validateVoucherResultSchema = z.object({
  isValid: z.boolean(),
  voucherCode: z.string(),
  name: z.string().optional(),
  discountType: z.nativeEnum(VoucherDiscountType).optional(),
  discountValue: z.number().int().optional(),
  discountAmount: z.number().int(),
  finalAmount: z.number().int(),
  reason: z.string().optional(),
});
export type ValidateVoucherResult = z.infer<typeof validateVoucherResultSchema>;

export const voucherDetailSchema = createVoucherSchema.extend({
  id: z.string(),
  usedCount: z.number().int(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type VoucherDetail = z.infer<typeof voucherDetailSchema>;

// ==================== COMBO PACKAGE SCHEMAS ====================

export const comboPackageItemSchema = z.object({
  itemType: z.nativeEnum(ComboItemType),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).max(20),
  courtType: z.string().optional(),
});
export type ComboPackageItem = z.infer<typeof comboPackageItemSchema>;

export const createComboPackageSchema = z.object({
  code: z.string().min(3).max(30).trim().toUpperCase(),
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(1000).optional(),
  price: z.number().int().nonnegative(),
  items: z.array(comboPackageItemSchema).min(1),
  validDays: z.number().int().min(1).max(730).default(30),
  channel: z.nativeEnum(PromotionChannel).default(PromotionChannel.ALL),
  isActive: z.boolean().default(true).optional(),
});
export type CreateComboPackageDto = z.infer<typeof createComboPackageSchema>;

export const updateComboPackageSchema = createComboPackageSchema.partial();
export type UpdateComboPackageDto = z.infer<typeof updateComboPackageSchema>;

export const comboPackageListQuerySchema = z.object({
  channel: z.nativeEnum(PromotionChannel).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ComboPackageListQueryDto = z.infer<typeof comboPackageListQuerySchema>;

export const comboPackageDetailSchema = createComboPackageSchema.extend({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type ComboPackageDetail = z.infer<typeof comboPackageDetailSchema>;

export const purchaseComboSchema = z.object({
  comboPackageId: z.string().min(1),
  customerPhone: z.string().min(9).max(15).trim(),
  customerName: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  idempotencyKey: z.string().min(1).max(100),
});
export type PurchaseComboDto = z.infer<typeof purchaseComboSchema>;

export const userPackageItemSchema = comboPackageItemSchema.extend({
  remainingQuantity: z.number().int().nonnegative(),
  totalQuantity: z.number().int().positive(),
});
export type UserPackageItem = z.infer<typeof userPackageItemSchema>;

export const userPackageDetailSchema = z.object({
  id: z.string(),
  packageCode: z.string(),
  comboPackageId: z.string(),
  comboName: z.string(),
  customerId: z.string(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
  pricePaid: z.number().int(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  purchasedAt: z.date(),
  expiresAt: z.date(),
  remainingItems: z.array(userPackageItemSchema),
  status: z.nativeEnum(UserPackageStatus),
  idempotencyKey: z.string(),
});
export type UserPackageDetail = z.infer<typeof userPackageDetailSchema>;

export const deductPackageItemSchema = z.object({
  userPackageId: z.string().min(1),
  itemType: z.nativeEnum(ComboItemType),
  quantity: z.number().int().positive().default(1),
  courtType: z.string().optional(),
  refType: z.string().optional(),
  refId: z.string().optional(),
});
export type DeductPackageItemDto = z.infer<typeof deductPackageItemSchema>;

export const promotionReportSchema = z.object({
  totalVouchers: z.number().int(),
  activeVouchers: z.number().int(),
  totalVoucherUsages: z.number().int(),
  totalDiscountAmount: z.number().int(),
  totalCombosSold: z.number().int(),
  totalComboRevenue: z.number().int(),
});
export type PromotionReport = z.infer<typeof promotionReportSchema>;
