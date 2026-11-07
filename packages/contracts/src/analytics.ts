import { z } from 'zod';
import { PaymentMethod } from '@sports/shared';

// ==================== REVENUE REPORT (R1) ====================

export const revenueReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  serviceType: z.enum([
    'ALL',
    'COURT_BOOKING',
    'GYM_MEMBERSHIP',
    'PT_CLASS',
    'GAMING',
    'CANTEEN',
    'RENTAL',
    'TOURNAMENT',
  ]).optional().default('ALL'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});
export type RevenueReportQueryDto = z.input<typeof revenueReportQuerySchema>;

export const serviceRevenueBreakdownSchema = z.object({
  grossRevenue: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative(),
  refundAmount: z.number().int().nonnegative(),
  netRevenue: z.number().int(),
});
export type ServiceRevenueBreakdown = z.infer<typeof serviceRevenueBreakdownSchema>;

export const dailyRevenueItemSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  grossRevenue: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative(),
  refundAmount: z.number().int().nonnegative(),
  netRevenue: z.number().int(),
});
export type DailyRevenueItem = z.infer<typeof dailyRevenueItemSchema>;

export const revenueReportResponseSchema = z.object({
  totalGrossRevenue: z.number().int().nonnegative(),
  totalDiscount: z.number().int().nonnegative(),
  totalRefund: z.number().int().nonnegative(),
  totalNetRevenue: z.number().int(),
  byService: z.record(z.string(), serviceRevenueBreakdownSchema),
  byPaymentMethod: z.record(z.string(), z.number().int().nonnegative()),
  dailyBreakdown: z.array(dailyRevenueItemSchema),
});
export type RevenueReportResponse = z.infer<typeof revenueReportResponseSchema>;

// ==================== OCCUPANCY REPORT (R2) ====================

export const occupancyReportQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  sportType: z.string().optional(),
  resourceId: z.string().optional(),
});
export type OccupancyReportQueryDto = z.input<typeof occupancyReportQuerySchema>;

export const resourceOccupancyItemSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  sportType: z.string(),
  operatingMinutes: z.number().int().nonnegative(),
  bookedMinutes: z.number().int().nonnegative(),
  occupancyRate: z.number().min(0).max(100),
});
export type ResourceOccupancyItem = z.infer<typeof resourceOccupancyItemSchema>;

export const hourlyHeatmapItemSchema = z.object({
  hour: z.number().int().min(0).max(23),
  dayOfWeek: z.number().int().min(0).max(6),
  bookedSlotsCount: z.number().int().nonnegative(),
});
export type HourlyHeatmapItem = z.infer<typeof hourlyHeatmapItemSchema>;

export const occupancyReportResponseSchema = z.object({
  overallOccupancyRate: z.number().min(0).max(100),
  totalOperatingMinutes: z.number().int().nonnegative(),
  totalBookedMinutes: z.number().int().nonnegative(),
  peakOccupancyRate: z.number().min(0).max(100),
  offPeakOccupancyRate: z.number().min(0).max(100),
  cancellationRate: z.number().min(0).max(100),
  noShowRate: z.number().min(0).max(100),
  byResource: z.array(resourceOccupancyItemSchema),
  hourlyHeatmap: z.array(hourlyHeatmapItemSchema),
});
export type OccupancyReportResponse = z.infer<typeof occupancyReportResponseSchema>;

// ==================== CUSTOMER REPORT (R3) ====================

export const customerReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type CustomerReportQueryDto = z.input<typeof customerReportQuerySchema>;

export const topCustomerItemSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  totalSpent: z.number().int().nonnegative(),
  transactionCount: z.number().int().nonnegative(),
});
export type TopCustomerItem = z.infer<typeof topCustomerItemSchema>;

export const customerReportResponseSchema = z.object({
  newCustomersCount: z.number().int().nonnegative(),
  returningCustomersCount: z.number().int().nonnegative(),
  churnRiskCustomersCount: z.number().int().nonnegative(),
  gymExpiringWithin7DaysCount: z.number().int().nonnegative(),
  gymRenewalRate: z.number().min(0).max(100),
  topCustomers: z.array(topCustomerItemSchema),
});
export type CustomerReportResponse = z.infer<typeof customerReportResponseSchema>;

// ==================== INVENTORY REPORT (R4) ====================

export const lowStockItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  currentStock: z.number().int(),
  minStockLevel: z.number().int(),
  unitPrice: z.number().int(),
});
export type LowStockItem = z.infer<typeof lowStockItemSchema>;

export const inventoryReportResponseSchema = z.object({
  totalInventoryValue: z.number().int().nonnegative(),
  lowStockItemsCount: z.number().int().nonnegative(),
  lowStockItems: z.array(lowStockItemSchema),
  equipmentRentalStatus: z.object({
    totalRented: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    damagedOrLost: z.number().int().nonnegative(),
  }),
});
export type InventoryReportResponse = z.infer<typeof inventoryReportResponseSchema>;

// ==================== CASHIER SHIFT RECONCILIATION REPORT (R5) ====================

export const shiftReconciliationQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  cashierId: z.string().optional(),
});
export type ShiftReconciliationQueryDto = z.input<typeof shiftReconciliationQuerySchema>;

export const shiftReconciliationItemSchema = z.object({
  shiftId: z.string(),
  shiftCode: z.string(),
  cashierName: z.string(),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().optional(),
  totalSales: z.number().int(),
  calculatedCash: z.number().int(),
  actualCash: z.number().int().optional(),
  cashDifference: z.number().int().optional(),
  isBalanced: z.boolean(),
});
export type ShiftReconciliationItem = z.infer<typeof shiftReconciliationItemSchema>;

export const shiftReconciliationResponseSchema = z.object({
  totalShifts: z.number().int().nonnegative(),
  balancedShifts: z.number().int().nonnegative(),
  discrepancyShifts: z.number().int().nonnegative(),
  totalDiscrepancyAmount: z.number().int(),
  shifts: z.array(shiftReconciliationItemSchema),
});
export type ShiftReconciliationResponse = z.infer<typeof shiftReconciliationResponseSchema>;

// ==================== GAMING & GYM REPORTS (R6 & R7) ====================

export const gamingReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type GamingReportQueryDto = z.input<typeof gamingReportQuerySchema>;

export const gamingMachineStatItemSchema = z.object({
  machineId: z.string(),
  machineCode: z.string(),
  zone: z.string(),
  playMinutes: z.number().int().nonnegative(),
  revenue: z.number().int().nonnegative(),
});
export type GamingMachineStatItem = z.infer<typeof gamingMachineStatItemSchema>;

export const gamingReportResponseSchema = z.object({
  totalPlayMinutes: z.number().int().nonnegative(),
  averageUtilizationRate: z.number().min(0).max(100),
  standardZoneRevenue: z.number().int().nonnegative(),
  vipZoneRevenue: z.number().int().nonnegative(),
  totalGamingRevenue: z.number().int().nonnegative(),
  topMachines: z.array(gamingMachineStatItemSchema),
});
export type GamingReportResponse = z.infer<typeof gamingReportResponseSchema>;

export const gymReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type GymReportQueryDto = z.input<typeof gymReportQuerySchema>;

export const gymHourlyCheckInItemSchema = z.object({
  hour: z.number().int().min(0).max(23),
  checkInCount: z.number().int().nonnegative(),
});
export type GymHourlyCheckInItem = z.infer<typeof gymHourlyCheckInItemSchema>;

export const gymPackageDistributionItemSchema = z.object({
  packageId: z.string(),
  packageName: z.string(),
  activeMemberCount: z.number().int().nonnegative(),
});
export type GymPackageDistributionItem = z.infer<typeof gymPackageDistributionItemSchema>;

export const gymReportResponseSchema = z.object({
  totalCheckIns: z.number().int().nonnegative(),
  peakHour: z.number().int().min(0).max(23),
  peakHourCheckIns: z.number().int().nonnegative(),
  activeMembershipsCount: z.number().int().nonnegative(),
  byPackage: z.array(gymPackageDistributionItemSchema),
  hourlyDistribution: z.array(gymHourlyCheckInItemSchema),
});
export type GymReportResponse = z.infer<typeof gymReportResponseSchema>;

// ==================== EXCEPTION REPORT (R8) ====================

export const exceptionReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type ExceptionReportQueryDto = z.input<typeof exceptionReportQuerySchema>;

export const exceptionItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.string(),
  amount: z.number().int(),
  issue: z.string(),
  createdAt: z.coerce.date(),
});
export type ExceptionItem = z.infer<typeof exceptionItemSchema>;

export const exceptionReportResponseSchema = z.object({
  unmatchedPaymentsCount: z.number().int().nonnegative(),
  unmatchedPayments: z.array(exceptionItemSchema),
  uninvoicedOrdersCount: z.number().int().nonnegative(),
  uninvoicedOrders: z.array(exceptionItemSchema),
});
export type ExceptionReportResponse = z.infer<typeof exceptionReportResponseSchema>;

// ==================== REALTIME DASHBOARD ====================

export const realtimeDashboardResponseSchema = z.object({
  todayGrossRevenue: z.number().int().nonnegative(),
  todayNetRevenue: z.number().int(),
  activeCourtCount: z.number().int().nonnegative(),
  totalCourtCount: z.number().int().nonnegative(),
  currentGymAttendance: z.number().int().nonnegative(),
  gymCapacity: z.number().int().nonnegative(),
  activeGamingSessions: z.number().int().nonnegative(),
  totalGamingMachines: z.number().int().nonnegative(),
  openCashierShifts: z.number().int().nonnegative(),
  systemAlerts: z.array(
    z.object({
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
      message: z.string(),
      timestamp: z.coerce.date(),
    }),
  ),
});
export type RealtimeDashboardResponse = z.infer<typeof realtimeDashboardResponseSchema>;

// ==================== RECALCULATE DAILY STATS ====================

export const recalculateDailyStatsDto = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format YYYY-MM-DD required'),
});
export type RecalculateDailyStatsDto = z.infer<typeof recalculateDailyStatsDto>;
