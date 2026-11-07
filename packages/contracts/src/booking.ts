import { z } from 'zod';
import { BookingStatus } from '@sports/shared';
import { PriceBand } from './facility.js';

export { BookingStatus, PriceBand };

export enum SlotAvailabilityStatus {
  AVAILABLE = 'AVAILABLE', // Trống, có thể đặt
  HELD = 'HELD', // Đang được giữ chỗ tạm thời (chờ thanh toán cọc)
  BOOKED = 'BOOKED', // Đã được đặt và xác nhận cọc/tiền
  CLOSED = 'CLOSED', // Sân đóng cửa (ngoài giờ hoạt động hoặc bảo trì/thời tiết)
}

// --- Availability (Kiểm tra lịch trống) ---
export const availabilityQuerySchema = z.object({
  resourceCode: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
});

export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;

export const slotAvailabilityDetailSchema = z.object({
  slotIndex: z.number().int().min(0).max(47),
  startTime: z.string(),
  endTime: z.string(),
  status: z.nativeEnum(SlotAvailabilityStatus),
  price: z.number().int().nonnegative(),
  band: z.nativeEnum(PriceBand),
});

export type SlotAvailabilityDetail = z.infer<typeof slotAvailabilityDetailSchema>;

export const availabilityResponseSchema = z.object({
  resourceCode: z.string(),
  date: z.string(),
  slots: z.array(slotAvailabilityDetailSchema),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

// --- Matchmaking (Ghép trận / Tìm đối thủ) ---
export const matchmakingDetailSchema = z.object({
  isLookingForOpponent: z.boolean().default(false),
  notes: z.string().trim().max(300).optional(),
  skillLevel: z.string().trim().max(50).optional(),
});

export type MatchmakingDetail = z.infer<typeof matchmakingDetailSchema>;

// --- Hold Booking (Giữ chỗ tạm thời) ---
export const holdBookingSchema = z.object({
  resourceCode: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  slotIndices: z.array(z.number().int().min(0).max(47)).min(1),
  matchmaking: matchmakingDetailSchema.optional(),
});

export type HoldBookingDto = z.input<typeof holdBookingSchema>;
export type HoldBookingRequest = HoldBookingDto;

// --- Confirm Booking (Xác nhận đặt sân) ---
export const confirmBookingSchema = z.object({
  paidAmount: z.number().int().positive().optional(),
  paymentMethod: z.string().optional().default('INTERNAL_WALLET'),
});

export type ConfirmBookingDto = z.input<typeof confirmBookingSchema>;
export type ConfirmBookingRequest = ConfirmBookingDto;

// --- Cancel Booking (Hủy đặt sân) ---
export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(200).optional().default('Khách hàng hủy'),
});

export type CancelBookingDto = z.input<typeof cancelBookingSchema>;
export type CancelBookingRequest = CancelBookingDto;

// --- Booking Response Detail ---
export const bookingDetailSchema = z.object({
  id: z.string(),
  bookingCode: z.string(),
  userId: z.string(),
  resourceCode: z.string(),
  sport: z.string(),
  date: z.string(),
  slotIndices: z.array(z.number().int()),
  baseUnitIds: z.array(z.string()),
  status: z.nativeEnum(BookingStatus),
  totalPrice: z.number().int(),
  depositAmount: z.number().int(),
  paidAmount: z.number().int(),
  holdExpiresAt: z.string().datetime().optional(),
  priceSnapshot: z.record(z.unknown()),
  policySnapshot: z.object({
    cancelRefundCutoffHours: z.number().int(),
    depositPercent: z.number().int(),
  }),
  matchmaking: matchmakingDetailSchema.optional(),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  cancelReason: z.string().optional(),
  refundAmount: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BookingDetail = z.infer<typeof bookingDetailSchema>;

// --- Recurring Booking (Đặt lịch định kỳ) ---
export const recurringBookingSchema = z.object({
  resourceCode: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  slotIndices: z.array(z.number().int().min(0).max(47)).min(1),
  matchmaking: matchmakingDetailSchema.optional(),
});

export type RecurringBookingDto = z.input<typeof recurringBookingSchema>;
export type RecurringBookingRequest = RecurringBookingDto;

export const recurringBookingResponseSchema = z.object({
  createdCount: z.number().int(),
  totalPrice: z.number().int(),
  bookings: z.array(bookingDetailSchema),
});

export type RecurringBookingResponse = z.infer<typeof recurringBookingResponseSchema>;
