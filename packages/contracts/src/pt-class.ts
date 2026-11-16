import { z } from 'zod';
import {
  ClassType,
  ClassSessionStatus,
  ClassRegistrationStatus,
  PtSessionStatus,
  StaffShiftType,
  StaffEmploymentStatus,
  PaymentMethod,
} from '@sports/shared';

// ==================== STAFF & TRAINER PROFILES ====================

export const createStaffProfileSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(2).max(100).trim(),
  phone: z.string().min(9).max(15).trim(),
  specialties: z.array(z.string()).default([]),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  hourlyRate: z.number().int().nonnegative().default(0), // Đơn giá PT 1-1 (VND)
  certifications: z.array(z.string()).default([]),
  employmentStatus: z.nativeEnum(StaffEmploymentStatus).default(StaffEmploymentStatus.ACTIVE),
});
export type CreateStaffProfileDto = z.infer<typeof createStaffProfileSchema>;

export const updateStaffProfileSchema = createStaffProfileSchema.partial();
export type UpdateStaffProfileDto = z.infer<typeof updateStaffProfileSchema>;

export const trainerListQuerySchema = z.object({
  specialty: z.string().optional(),
  search: z.string().optional(),
  employmentStatus: z.nativeEnum(StaffEmploymentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type TrainerListQueryDto = z.infer<typeof trainerListQuerySchema>;

export const trainerPublicDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  specialties: z.array(z.string()),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  hourlyRate: z.number().int(),
  certifications: z.array(z.string()),
  employmentStatus: z.nativeEnum(StaffEmploymentStatus),
});
export type TrainerPublicDetail = z.infer<typeof trainerPublicDetailSchema>;

// ==================== CLASS TEMPLATE ====================

export const createClassTemplateSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(1000).optional(),
  classType: z.nativeEnum(ClassType),
  trainerId: z.string().min(1),
  trainerName: z.string().min(1),
  capacity: z.number().int().positive().max(100),
  pricePerSession: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive().default(60),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1), // 0: Chủ Nhật, 1: Thứ Hai ...
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm format required'),
  roomOrCourtId: z.string().optional(),
  roomName: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});
export type CreateClassTemplateDto = z.infer<typeof createClassTemplateSchema>;

export const updateClassTemplateSchema = createClassTemplateSchema.partial();
export type UpdateClassTemplateDto = z.infer<typeof updateClassTemplateSchema>;

export const classTemplateListQuerySchema = z.object({
  classType: z.nativeEnum(ClassType).optional(),
  trainerId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});
export type ClassTemplateListQueryDto = z.infer<typeof classTemplateListQuerySchema>;

// ==================== CLASS SESSION ====================

export const generateClassSessionsSchema = z.object({
  templateId: z.string().min(1),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
});
export type GenerateClassSessionsDto = z.infer<typeof generateClassSessionsSchema>;

export const classSessionListQuerySchema = z.object({
  templateId: z.string().optional(),
  classType: z.nativeEnum(ClassType).optional(),
  trainerId: z.string().optional(),
  status: z.nativeEnum(ClassSessionStatus).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ClassSessionListQueryDto = z.infer<typeof classSessionListQuerySchema>;

export const classSessionDetailSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  classType: z.nativeEnum(ClassType),
  trainerId: z.string(),
  trainerName: z.string(),
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  roomOrCourtId: z.string().optional(),
  roomName: z.string().optional(),
  capacity: z.number().int(),
  bookedCount: z.number().int(),
  pricePerSession: z.number().int(),
  status: z.nativeEnum(ClassSessionStatus),
});
export type ClassSessionDetail = z.infer<typeof classSessionDetailSchema>;

// ==================== CLASS REGISTRATION ====================

export const registerClassSessionSchema = z.object({
  sessionId: z.string().min(1),
  customerPhone: z.string().min(9).max(15).trim(),
  customerName: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  userPackageId: z.string().optional(), // Nếu trừ từ gói combo
  idempotencyKey: z.string().min(1).max(100),
});
export type RegisterClassSessionDto = z.infer<typeof registerClassSessionSchema>;

export const cancelClassRegistrationSchema = z.object({
  registrationId: z.string().min(1),
  reason: z.string().max(255).optional(),
});
export type CancelClassRegistrationDto = z.infer<typeof cancelClassRegistrationSchema>;

export const classRegistrationDetailSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string(),
  pricePaid: z.number().int(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(ClassRegistrationStatus),
  registeredAt: z.date(),
});
export type ClassRegistrationDetail = z.infer<typeof classRegistrationDetailSchema>;

export const checkInClassAttendeeSchema = z.object({
  registrationId: z.string().min(1),
  note: z.string().optional(),
});
export type CheckInClassAttendeeDto = z.infer<typeof checkInClassAttendeeSchema>;

// ==================== PT 1-1 BOOKING ====================

export const bookPtSessionSchema = z.object({
  trainerId: z.string().min(1),
  customerPhone: z.string().min(9).max(15).trim(),
  customerName: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm format required'),
  durationMinutes: z.number().int().positive().default(60),
  paymentMethod: z.nativeEnum(PaymentMethod),
  userPackageId: z.string().optional(), // Nếu trừ từ gói combo PT
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1).max(100),
});
export type BookPtSessionDto = z.infer<typeof bookPtSessionSchema>;

export const ptSessionListQuerySchema = z.object({
  trainerId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.nativeEnum(PtSessionStatus).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type PtSessionListQueryDto = z.infer<typeof ptSessionListQuerySchema>;

export const completePtSessionSchema = z.object({
  fitnessNotes: z.string().max(1000).optional(), // Ghi chú tiến độ, giáo án, chỉ số thể lực
  bonusAmount: z.number().int().nonnegative().optional(), // Tiền thưởng ca dạy nếu có
});
export type CompletePtSessionDto = z.infer<typeof completePtSessionSchema>;

// ==================== STAFF SHIFT & ATTENDANCE ====================

export const createStaffShiftSchema = z.object({
  staffId: z.string().min(1),
  staffName: z.string().min(1),
  shiftDate: z.coerce.date(),
  shiftType: z.nativeEnum(StaffShiftType),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  note: z.string().max(255).optional(),
});
export type CreateStaffShiftDto = z.infer<typeof createStaffShiftSchema>;

export const staffShiftListQuerySchema = z.object({
  staffId: z.string().optional(),
  shiftDate: z.coerce.date().optional(),
  shiftType: z.nativeEnum(StaffShiftType).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type StaffShiftListQueryDto = z.infer<typeof staffShiftListQuerySchema>;

export const recordAttendanceSchema = z.object({
  shiftId: z.string().optional(),
  deviceIp: z.string().optional(),
  location: z.string().optional(),
  note: z.string().max(255).optional(),
});
export type RecordAttendanceDto = z.infer<typeof recordAttendanceSchema>;

// ==================== MONTHLY TRAINER REPORT ====================

export const monthlyTrainerReportQuerySchema = z.object({
  trainerId: z.string().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025).max(2035),
});
export type MonthlyTrainerReportQueryDto = z.infer<typeof monthlyTrainerReportQuerySchema>;

export const trainerMonthlyStatSchema = z.object({
  trainerId: z.string(),
  trainerName: z.string(),
  phone: z.string(),
  totalClassesTaught: z.number().int(),
  totalPtSessionsCompleted: z.number().int(),
  totalPtHours: z.number(),
  totalBonusAmount: z.number().int(),
  totalRevenueGenerated: z.number().int(),
});
export type TrainerMonthlyStat = z.infer<typeof trainerMonthlyStatSchema>;

export const monthlyTrainerReportResponseSchema = z.object({
  month: z.number().int(),
  year: z.number().int(),
  trainers: z.array(trainerMonthlyStatSchema),
  overallClassesTaught: z.number().int(),
  overallPtSessionsCompleted: z.number().int(),
  overallBonusAmount: z.number().int(),
});
export type MonthlyTrainerReportResponse = z.infer<typeof monthlyTrainerReportResponseSchema>;
