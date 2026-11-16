import { z } from 'zod';
import {
  RentalPricingType,
  RentalTicketStatus,
  RentalItemCondition,
  PaymentMethod,
} from '@sports/shared';
import { SportType } from './facility.js';

export { RentalPricingType, RentalTicketStatus, RentalItemCondition };

// --- 1. Dụng cụ cho thuê (Equipment) ---
export const equipmentSchema = z.object({
  id: z.string(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sportType: z.nativeEnum(SportType).optional(),
  pricingType: z.nativeEnum(RentalPricingType).default(RentalPricingType.PER_TURN),
  price: z.number().int().nonnegative().describe('Giá thuê (VND)'),
  depositAmount: z.number().int().nonnegative().default(0).describe('Tiền cọc trên 1 đơn vị (VND)'),
  damageFee: z.number().int().nonnegative().default(0).describe('Phí bồi thường nếu hỏng hóc (VND)'),
  lostFee: z.number().int().nonnegative().default(0).describe('Phí đền bù nếu làm mất (VND)'),
  totalQuantity: z.number().int().positive(),
  rentedQuantity: z.number().int().nonnegative().default(0),
  damagedQuantity: z.number().int().nonnegative().default(0),
  availableQuantity: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type Equipment = z.infer<typeof equipmentSchema>;

export const createEquipmentSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sportType: z.nativeEnum(SportType).optional(),
  pricingType: z.nativeEnum(RentalPricingType).default(RentalPricingType.PER_TURN),
  price: z.number().int().nonnegative(),
  depositAmount: z.number().int().nonnegative().default(0),
  damageFee: z.number().int().nonnegative().default(0),
  lostFee: z.number().int().nonnegative().default(0),
  totalQuantity: z.number().int().positive(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateEquipmentDto = z.input<typeof createEquipmentSchema>;

export const updateEquipmentSchema = createEquipmentSchema.partial();
export type UpdateEquipmentDto = z.input<typeof updateEquipmentSchema>;

export const equipmentListQuerySchema = z.object({
  sportType: z.nativeEnum(SportType).optional(),
  search: z.string().optional(),
  availableOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

export type EquipmentListQueryDto = z.input<typeof equipmentListQuerySchema>;

export const equipmentListResponseSchema = z.object({
  items: z.array(equipmentSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type EquipmentListResponse = z.infer<typeof equipmentListResponseSchema>;

// --- 2. Phiếu thuê dụng cụ (Rental Ticket) ---
export const rentalTicketItemInputSchema = z.object({
  equipmentId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const createRentalTicketSchema = z.object({
  items: z.array(rentalTicketItemInputSchema).min(1),
  customerPhone: z.string().trim().min(10),
  customerName: z.string().trim().optional(),
  bookingId: z.string().trim().optional().describe('Gắn với lượt đặt sân nếu có'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  rentHours: z.number().positive().default(1).describe('Số giờ dự kiến thuê nếu tính HOURLY'),
  notes: z.string().optional(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type CreateRentalTicketDto = z.input<typeof createRentalTicketSchema>;

export const returnRentalItemInputSchema = z.object({
  equipmentId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  condition: z.nativeEnum(RentalItemCondition).default(RentalItemCondition.GOOD),
  notes: z.string().optional(),
});

export const returnRentalTicketSchema = z.object({
  items: z.array(returnRentalItemInputSchema).min(1),
  notes: z.string().optional(),
});

export type ReturnRentalTicketDto = z.input<typeof returnRentalTicketSchema>;

export const rentalTicketItemDetailSchema = z.object({
  equipmentId: z.string(),
  code: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  depositPerUnit: z.number().int().nonnegative(),
  pricingType: z.nativeEnum(RentalPricingType),
  subtotalPrice: z.number().int().nonnegative(),
  subtotalDeposit: z.number().int().nonnegative(),
  returnCondition: z.nativeEnum(RentalItemCondition).optional(),
  penaltyFee: z.number().int().nonnegative().optional(),
});

export type RentalTicketItemDetail = z.infer<typeof rentalTicketItemDetailSchema>;

export const rentalTicketDetailSchema = z.object({
  id: z.string(),
  ticketCode: z.string(),
  shiftId: z.string(),
  cashierId: z.string(),
  customerId: z.string().optional(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
  bookingId: z.string().optional(),
  items: z.array(rentalTicketItemDetailSchema),
  rentedAt: z.string(),
  dueAt: z.string(),
  returnedAt: z.string().optional(),
  totalRentalAmount: z.number().int().nonnegative(),
  totalDepositAmount: z.number().int().nonnegative(),
  totalPenaltyFee: z.number().int().nonnegative(),
  refundDepositAmount: z.number().int().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(RentalTicketStatus),
  notes: z.string().optional(),
  idempotencyKey: z.string(),
});

export type RentalTicketDetail = z.infer<typeof rentalTicketDetailSchema>;

export const rentalTicketListResponseSchema = z.object({
  items: z.array(rentalTicketDetailSchema),
  total: z.number().int().nonnegative(),
});

export type RentalTicketListResponse = z.infer<typeof rentalTicketListResponseSchema>;

export const rentalUsageReportSchema = z.object({
  totalTickets: z.number().int(),
  totalRevenue: z.number().int(),
  totalDepositCollected: z.number().int(),
  totalDepositRefunded: z.number().int(),
  totalPenaltyCollected: z.number().int(),
  damagedItemCount: z.number().int(),
  lostItemCount: z.number().int(),
});

export type RentalUsageReport = z.infer<typeof rentalUsageReportSchema>;
