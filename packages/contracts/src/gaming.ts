import { z } from 'zod';
import {
  GamingMachineZone,
  GamingMachineStatus,
  GamingSessionStatus,
  GamingRemoteAction,
} from '@sports/shared';
import { PriceBand } from './facility.js';

// ==================== CẤU HÌNH & QUẢN LÝ MÁY ====================

export const machineSpecsSchema = z.object({
  cpu: z.string().optional(),
  ram: z.string().optional(),
  gpu: z.string().optional(),
  screen: z.string().optional(),
});
export type MachineSpecs = z.infer<typeof machineSpecsSchema>;

export const machinePositionSchema = z.object({
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  floor: z.number().int().default(1),
  roomName: z.string().optional(),
});
export type MachinePosition = z.infer<typeof machinePositionSchema>;

export const createGamingMachineSchema = z.object({
  machineCode: z.string().min(2).max(30).trim().toUpperCase(),
  zone: z.nativeEnum(GamingMachineZone).default(GamingMachineZone.STANDARD),
  specs: machineSpecsSchema.optional(),
  position: machinePositionSchema.optional(),
  hourlyPrice: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true).optional(),
});
export type CreateGamingMachineDto = z.infer<typeof createGamingMachineSchema>;

export const updateGamingMachineSchema = createGamingMachineSchema.partial().extend({
  status: z.nativeEnum(GamingMachineStatus).optional(),
});
export type UpdateGamingMachineDto = z.infer<typeof updateGamingMachineSchema>;

export const gamingMachineListQuerySchema = z.object({
  zone: z.nativeEnum(GamingMachineZone).optional(),
  status: z.nativeEnum(GamingMachineStatus).optional(),
  floor: z.coerce.number().int().optional(),
  roomName: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type GamingMachineListQueryDto = z.infer<typeof gamingMachineListQuerySchema>;

export const registerMachineSchema = z.object({
  machineCode: z.string().min(2).max(30).trim().toUpperCase(),
  oneTimeCode: z.string().length(6).trim(),
  macAddress: z.string().max(30).optional(),
  ipAddress: z.string().max(45).optional(),
});
export type RegisterMachineDto = z.infer<typeof registerMachineSchema>;

// ==================== BẢNG GIÁ THEO KHUNG GIỜ ====================

export const createGamingPriceRuleSchema = z.object({
  zone: z.nativeEnum(GamingMachineZone),
  band: z.nativeEnum(PriceBand).default(PriceBand.OFFPEAK),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Định dạng giờ HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Định dạng giờ HH:mm'),
  pricePerHour: z.number().int().nonnegative(),
  minMinutes: z.number().int().min(1).max(60).default(15),
  isActive: z.boolean().default(true),
});
export type CreateGamingPriceRuleDto = z.infer<typeof createGamingPriceRuleSchema>;

// ==================== QUẢN LÝ PHIÊN CHƠI ====================

export const startGamingSessionSchema = z.object({
  machineCode: z.string().min(2).max(30).trim().toUpperCase(),
  customerPhone: z.string().min(9).max(15).trim(),
  customerPassword: z.string().optional(),
  authMethod: z.enum(['PASSWORD', 'QR', 'STAFF_DIRECT']).default('PASSWORD'),
  roomBookingId: z.string().optional(),
  idempotencyKey: z.string().min(1).max(100),
});
export type StartGamingSessionDto = z.infer<typeof startGamingSessionSchema>;

export const gamingHeartbeatSchema = z.object({
  sessionId: z.string().min(1),
  machineCode: z.string().min(2).max(30).trim().toUpperCase(),
  clientUptimeSeconds: z.number().int().nonnegative().optional(),
});
export type GamingHeartbeatDto = z.infer<typeof gamingHeartbeatSchema>;

export const endGamingSessionSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().max(200).optional(),
  idempotencyKey: z.string().min(1).max(100),
});
export type EndGamingSessionDto = z.infer<typeof endGamingSessionSchema>;

export const switchMachineSchema = z.object({
  sessionId: z.string().min(1),
  targetMachineCode: z.string().min(2).max(30).trim().toUpperCase(),
  idempotencyKey: z.string().min(1).max(100),
});
export type SwitchMachineDto = z.infer<typeof switchMachineSchema>;

// ==================== ĐIỀU KHIỂN TỪ XA ====================

export const remoteControlSchema = z.object({
  machineCode: z.string().min(2).max(30).trim().toUpperCase(),
  action: z.nativeEnum(GamingRemoteAction),
  message: z.string().max(500).optional(),
  targetMachineCode: z.string().min(2).max(30).trim().toUpperCase().optional(),
  note: z.string().max(200).optional(),
});
export type RemoteControlDto = z.infer<typeof remoteControlSchema>;

// ==================== PHẢN HỒI & BÁO CÁO ====================

export const gamingMachineDetailSchema = z.object({
  id: z.string(),
  machineCode: z.string(),
  zone: z.nativeEnum(GamingMachineZone),
  specs: machineSpecsSchema.optional(),
  position: machinePositionSchema.optional(),
  status: z.nativeEnum(GamingMachineStatus),
  currentSessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  hourlyPrice: z.number().int().optional(),
  lastHeartbeatAt: z.date().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type GamingMachineDetail = z.infer<typeof gamingMachineDetailSchema>;

export const gamingSessionDetailSchema = z.object({
  id: z.string(),
  sessionCode: z.string(),
  machineId: z.string(),
  machineCode: z.string(),
  customerId: z.string(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  lastHeartbeatAt: z.date(),
  totalPlayedMinutes: z.number().int(),
  totalHoldAmount: z.number().int(),
  actualUsageAmount: z.number().int(),
  refundHoldAmount: z.number().int(),
  status: z.nativeEnum(GamingSessionStatus),
  roomBookingId: z.string().optional(),
  warningMinutesRemaining: z.number().int().optional(),
  isLocked: z.boolean().optional(),
  idempotencyKey: z.string(),
});
export type GamingSessionDetail = z.infer<typeof gamingSessionDetailSchema>;

export const gamingFloorMapMachineSchema = z.object({
  id: z.string(),
  machineCode: z.string(),
  zone: z.nativeEnum(GamingMachineZone),
  status: z.nativeEnum(GamingMachineStatus),
  position: machinePositionSchema.optional(),
  currentSession: z
    .object({
      sessionId: z.string(),
      sessionCode: z.string(),
      customerPhone: z.string(),
      customerName: z.string().optional(),
      playedMinutes: z.number().int(),
      estimatedCost: z.number().int(),
      remainingHoldMinutes: z.number().int().optional(),
    })
    .optional(),
});
export type GamingFloorMapMachine = z.infer<typeof gamingFloorMapMachineSchema>;

export const gamingFloorMapResponseSchema = z.object({
  floor: z.number().int(),
  machines: z.array(gamingFloorMapMachineSchema),
  totalMachines: z.number().int(),
  activeSessions: z.number().int(),
});
export type GamingFloorMapResponse = z.infer<typeof gamingFloorMapResponseSchema>;

export const gamingUsageReportSchema = z.object({
  totalSessions: z.number().int(),
  totalPlayedHours: z.number(),
  totalRevenue: z.number().int(),
  totalHoldAmount: z.number().int(),
  totalRefundAmount: z.number().int(),
  averageSessionMinutes: z.number(),
  occupancyRatePercent: z.number(),
});
export type GamingUsageReport = z.infer<typeof gamingUsageReportSchema>;
