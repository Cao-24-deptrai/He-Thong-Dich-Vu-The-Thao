import { z } from 'zod';
import { CourtType, FacilityType } from '@sports/shared';

export { CourtType, FacilityType };
export { FacilityType as ResourceKind };

export enum PriceBand {
  PEAK = 'PEAK',
  OFFPEAK = 'OFFPEAK',
}

export enum ResourceStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum ClosureReason {
  MAINTENANCE = 'MAINTENANCE',
  TOURNAMENT = 'TOURNAMENT',
  EVENT = 'EVENT',
  WEATHER = 'WEATHER',
}

export enum SportType {
  FOOTBALL = 'FOOTBALL',
  TENNIS = 'TENNIS',
  BADMINTON = 'BADMINTON',
  BASKETBALL = 'BASKETBALL',
  ESPORTS = 'ESPORTS',
  GYM = 'GYM',
}

// --- Resources (Sân & Phòng gaming riêng) ---
export const ResourceSchema = z.object({
  id: z.string(),
  code: z.string().describe('Mã định danh duy nhất (vd: F1, S7-A, S11, T1, R01)'),
  name: z.string().describe('Tên hiển thị'),
  kind: z.nativeEnum(FacilityType),
  sport: z.nativeEnum(SportType),
  variant: z.string().optional(),
  isComposite: z.boolean().default(false).describe('True nếu là sân ghép như S7 hoặc S11'),
  baseUnitIds: z.array(z.string()).describe('Danh sách các mã đơn vị cơ sở cấu thành sân này'),
  capacity: z.number().int().positive().default(10),
  status: z.nativeEnum(ResourceStatus).default(ResourceStatus.ACTIVE),
  orderIndex: z.number().int().default(0),
});

export type Resource = z.infer<typeof ResourceSchema>;

export const createResourceSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(2).max(100),
  kind: z.nativeEnum(FacilityType),
  sport: z.nativeEnum(SportType),
  variant: z.string().optional(),
  isComposite: z.boolean().optional().default(false),
  baseUnitIds: z.array(z.string()).optional(),
  capacity: z.number().int().positive().optional().default(10),
  status: z.nativeEnum(ResourceStatus).optional().default(ResourceStatus.ACTIVE),
  orderIndex: z.number().int().optional().default(0),
});

export type CreateResourceDto = z.input<typeof createResourceSchema>;
export type CreateResourceRequest = CreateResourceDto;
export const CreateResourceRequestSchema = createResourceSchema;

export const updateResourceSchema = createResourceSchema.partial();
export type UpdateResourceDto = z.input<typeof updateResourceSchema>;
export type UpdateResourceRequest = UpdateResourceDto;
export const UpdateResourceRequestSchema = updateResourceSchema;

// --- Operating Hours (Giờ mở cửa) ---
export const weeklyScheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).describe('0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy'),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Định dạng HH:mm'),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Định dạng HH:mm'),
  isOpen: z.boolean().default(true),
});
export type WeeklyScheduleItemDto = z.infer<typeof weeklyScheduleItemSchema>;
export const DayScheduleSchema = weeklyScheduleItemSchema;

export const specialDateItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('06:00'),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('23:00'),
  reason: z.string().optional(),
});
export type SpecialDateItemDto = z.infer<typeof specialDateItemSchema>;
export const SpecialDateExceptionSchema = specialDateItemSchema;

export const OperatingHoursSchema = z.object({
  weeklySchedules: z.array(weeklyScheduleItemSchema),
  specialDates: z.array(specialDateItemSchema).default([]),
});

export type OperatingHours = z.infer<typeof OperatingHoursSchema>;

// --- Price Rules (Bảng giá phiên bản) ---
export const PriceRuleSchema = z.object({
  id: z.string(),
  appliesTo: z.string().describe('Cặp sport và variant (vd: FOOTBALL_F5, TENNIS)'),
  band: z.nativeEnum(PriceBand).describe('Khung giờ cao điểm hoặc thấp điểm'),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:mm'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:mm'),
  pricePerHour: z.number().int().nonnegative().describe('Giá mỗi giờ (VND nguyên)'),
  effectiveFrom: z.string().datetime().describe('Thời điểm bảng giá bắt đầu có hiệu lực'),
  effectiveTo: z.string().datetime().optional(),
  version: z.number().int().default(1),
  isActive: z.boolean().default(true),
});

export type PriceRule = z.infer<typeof PriceRuleSchema>;

export const createPriceRuleSchema = z.object({
  appliesTo: z.string().min(1),
  band: z.nativeEnum(PriceBand),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  pricePerHour: z.number().int().nonnegative(),
  effectiveFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  effectiveTo: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type CreatePriceRuleDto = z.infer<typeof createPriceRuleSchema>;
export type CreatePriceRuleRequest = CreatePriceRuleDto;
export const CreatePriceRuleRequestSchema = createPriceRuleSchema;

// --- Price Calculation Engine ---
export const calculatePriceSchema = z.object({
  resourceCode: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotIndices: z.array(z.number().int().min(0).max(47)).min(1),
});

export type CalculatePriceDto = z.infer<typeof calculatePriceSchema>;
export type CalculatePriceRequest = CalculatePriceDto;
export const CalculatePriceRequestSchema = calculatePriceSchema;

export const SlotPriceBreakdownSchema = z.object({
  slotIndex: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  band: z.nativeEnum(PriceBand),
  price: z.number().int(),
});

export type SlotPriceDetail = z.infer<typeof SlotPriceBreakdownSchema>;

export const CalculatePriceResponseSchema = z.object({
  resourceCode: z.string(),
  date: z.string(),
  totalSlots: z.number().int(),
  totalPrice: z.number().int().describe('Tổng tiền VND nguyên'),
  depositAmount: z.number().int().describe('Tiền đặt cọc theo cấu hình %'),
  currency: z.literal('VND'),
  slots: z.array(SlotPriceBreakdownSchema),
});

export type PriceCalculationResult = z.infer<typeof CalculatePriceResponseSchema>;
export type CalculatePriceResponse = PriceCalculationResult;

// --- Closures (Khóa sân bảo trì/sự kiện/thời tiết) ---
export const ClosureSchema = z.object({
  id: z.string(),
  resourceIds: z.array(z.string()),
  affectedUnitIds: z.array(z.string()).describe('Các đơn vị cơ sở bị khóa gián tiếp'),
  fromAt: z.string().datetime(),
  toAt: z.string().datetime(),
  reason: z.string(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Closure = z.infer<typeof ClosureSchema>;

export const createClosureSchema = z.object({
  resourceIds: z.array(z.string()).min(1),
  fromAt: z.string().datetime(),
  toAt: z.string().datetime(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export type CreateClosureDto = z.infer<typeof createClosureSchema>;
export type CreateClosureRequest = CreateClosureDto;
export const CreateClosureRequestSchema = createClosureSchema;

// --- Settings (Cấu hình hệ thống Phụ lục C) ---
export const SettingItemSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  version: z.number().int(),
  updatedAt: z.string().datetime().optional(),
});

export type SettingItem = z.infer<typeof SettingItemSchema>;

export const updateSettingSchema = z.object({
  value: z.unknown(),
});

export type UpdateSettingDto = z.infer<typeof updateSettingSchema>;
export type UpdateSettingRequest = UpdateSettingDto;
export const UpdateSettingRequestSchema = updateSettingSchema;
