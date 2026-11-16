import { z } from 'zod';
import {
  GymMembershipStatus,
  GymAccessType,
  GymAccessMethod,
  PaymentMethod,
} from '@sports/shared';

export { GymMembershipStatus, GymAccessType, GymAccessMethod };

// --- 1. Gói thẻ Gym (Gym Package) ---
export const gymPackageSchema = z.object({
  id: z.string(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  durationMonths: z.number().int().positive(),
  price: z.number().int().positive(),
  benefits: z.array(z.string()).default([]),
  earlyRenewDiscountPercent: z.number().int().min(0).max(100).default(5),
  isActive: z.boolean().default(true),
});

export type GymPackage = z.infer<typeof gymPackageSchema>;

export const createGymPackageSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  durationMonths: z.number().int().positive().refine((m) => [1, 3, 6, 12].includes(m), {
    message: 'Thời hạn thẻ chỉ hỗ trợ 1, 3, 6 hoặc 12 tháng',
  }),
  price: z.number().int().positive(),
  benefits: z.array(z.string()).default([]),
  earlyRenewDiscountPercent: z.number().int().min(0).max(100).default(5),
  isActive: z.boolean().default(true),
});

export type CreateGymPackageDto = z.input<typeof createGymPackageSchema>;

// --- 2. Mua thẻ Gym (Purchase Membership) ---
export const purchaseGymMembershipSchema = z.object({
  packageId: z.string().trim().min(1),
  startDate: z.string().optional().describe('Ngày bắt đầu thẻ, tối đa trước 30 ngày'),
  paymentMethod: z
    .nativeEnum(PaymentMethod)
    .refine((m) => m !== PaymentMethod.INTERNAL_WALLET, {
      message: 'Không được phép thanh toán thẻ gym bằng ví nội bộ',
    }),
  amount: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type PurchaseGymMembershipDto = z.input<typeof purchaseGymMembershipSchema>;

// --- 3. Gia hạn thẻ Gym (Renew Membership) ---
export const renewGymMembershipSchema = z.object({
  paymentMethod: z
    .nativeEnum(PaymentMethod)
    .refine((m) => m !== PaymentMethod.INTERNAL_WALLET, {
      message: 'Không được phép thanh toán thẻ gym bằng ví nội bộ',
    }),
  amount: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type RenewGymMembershipDto = z.input<typeof renewGymMembershipSchema>;

// --- 4. Nâng cấp gói thẻ (Upgrade Membership) ---
export const upgradeGymMembershipSchema = z.object({
  newPackageId: z.string().trim().min(1),
  paymentMethod: z
    .nativeEnum(PaymentMethod)
    .refine((m) => m !== PaymentMethod.INTERNAL_WALLET, {
      message: 'Không được phép thanh toán thẻ gym bằng ví nội bộ',
    }),
  amount: z.number().int().nonnegative().describe('Số tiền bù chênh lệch sau khi trừ giá trị pro-rata'),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type UpgradeGymMembershipDto = z.input<typeof upgradeGymMembershipSchema>;

// --- 5. Check-in & Check-out ---
export const gymCheckInSchema = z.object({
  method: z.nativeEnum(GymAccessMethod),
  membershipId: z.string().optional(),
  rfidCardId: z.string().optional(),
  qrToken: z.string().optional(),
  reason: z.string().optional().describe('Bắt buộc ghi lý do nếu lễ tân check-in thủ công'),
});

export type GymCheckInDto = z.input<typeof gymCheckInSchema>;

export const gymCheckOutSchema = z.object({
  method: z.nativeEnum(GymAccessMethod).default(GymAccessMethod.RFID),
  userId: z.string().optional(),
  rfidCardId: z.string().optional(),
  qrToken: z.string().optional(),
});

export type GymCheckOutDto = z.input<typeof gymCheckOutSchema>;

// --- 6. Trạng thái sức chứa (Capacity Status) ---
export const gymCapacityStatusSchema = z.object({
  currentInside: z.number().int().nonnegative(),
  maxCapacity: z.number().int().positive(),
  isFull: z.boolean(),
  updatedAt: z.string(),
});

export type GymCapacityStatus = z.infer<typeof gymCapacityStatusSchema>;

// --- 7. Chi tiết thẻ thành viên (Membership Detail) ---
export const gymMembershipDetailSchema = z.object({
  id: z.string(),
  membershipCode: z.string(),
  userId: z.string(),
  packageId: z.string(),
  packageName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.nativeEnum(GymMembershipStatus),
  rfidCardId: z.string().optional(),
  pricePaid: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type GymMembershipDetail = z.infer<typeof gymMembershipDetailSchema>;

export const assignRfidSchema = z.object({
  rfidCardId: z.string().trim().min(4).max(64),
});

export type AssignRfidDto = z.input<typeof assignRfidSchema>;
