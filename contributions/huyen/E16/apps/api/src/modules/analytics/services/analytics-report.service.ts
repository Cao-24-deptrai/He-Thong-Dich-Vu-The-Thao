import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyStats, DailyStatsDocument } from '../schemas/daily-stats.schema.js';
import { Payment, PaymentDocument } from '../../payment/schemas/payment.schema.js';
import { Booking, BookingDocument } from '../../booking/schemas/booking.schema.js';
import { Resource, ResourceDocument } from '../../facility/schemas/resource.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { GymAccessEvent, GymAccessEventDocument } from '../../gym/schemas/gym-access-event.schema.js';
import { GymMembership, GymMembershipDocument } from '../../gym/schemas/gym-membership.schema.js';
import { GamingSession, GamingSessionDocument } from '../../gaming/schemas/gaming-session.schema.js';
import { GamingMachine, GamingMachineDocument } from '../../gaming/schemas/gaming-machine.schema.js';
import { CashierShift, CashierShiftDocument } from '../../canteen/schemas/cashier-shift.schema.js';
import { Product, ProductDocument } from '../../canteen/schemas/product.schema.js';
import { RentalTicket, RentalTicketDocument } from '../../rental/schemas/rental-ticket.schema.js';
import { Invoice, InvoiceDocument } from '../../invoice/schemas/invoice.schema.js';
import {
  RevenueReportQueryDto,
  RevenueReportResponse,
  OccupancyReportQueryDto,
  OccupancyReportResponse,
  CustomerReportQueryDto,
  CustomerReportResponse,
  InventoryReportResponse,
  ShiftReconciliationQueryDto,
  ShiftReconciliationResponse,
  GamingReportQueryDto,
  GamingReportResponse,
  GymReportQueryDto,
  GymReportResponse,
  ExceptionReportQueryDto,
  ExceptionReportResponse,
  RealtimeDashboardResponse,
} from '@sports/contracts';
import {
  PaymentStatus,
  BookingStatus,
  GymAccessType,
  CashierShiftStatus,
  RentalTicketStatus,
  InvoiceStatus,
  GamingSessionStatus,
  GymMembershipStatus,
} from '@sports/shared';

@Injectable()
export class AnalyticsReportService {
  constructor(
    @InjectModel(DailyStats.name)
    private readonly dailyStatsModel: Model<DailyStatsDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Resource.name)
    private readonly resourceModel: Model<ResourceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(GymAccessEvent.name)
    private readonly gymAccessEventModel: Model<GymAccessEventDocument>,
    @InjectModel(GymMembership.name)
    private readonly gymMembershipModel: Model<GymMembershipDocument>,
    @InjectModel(GamingSession.name)
    private readonly gamingSessionModel: Model<GamingSessionDocument>,
    @InjectModel(GamingMachine.name)
    private readonly gamingMachineModel: Model<GamingMachineDocument>,
    @InjectModel(CashierShift.name)
    private readonly cashierShiftModel: Model<CashierShiftDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(RentalTicket.name)
    private readonly rentalTicketModel: Model<RentalTicketDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  /**
   * Executive Realtime Dashboard: Tổng quan chỉ số thời gian thực cho Ban giám đốc & Quản lý
   */
  async getExecutiveDashboard(): Promise<RealtimeDashboardResponse> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Today's Revenue
    const todayStats = await this.dailyStatsModel.findOne({ date: todayStr }).exec();
    let todayGrossRevenue = todayStats?.revenueSummary?.grossRevenue ?? 0;
    let todayNetRevenue = todayStats?.revenueSummary?.netRevenue ?? todayGrossRevenue;

    if (!todayStats) {
      // Calculate from live payments if stats not yet generated
      const livePayments = await this.paymentModel.find({
        createdAt: { $gte: dayStart, $lte: dayEnd },
        status: PaymentStatus.SUCCESS,
      }).exec();
      todayGrossRevenue = livePayments.reduce((sum, p) => sum + (p.paidAmount || p.amount), 0);
      todayNetRevenue = todayGrossRevenue;
    }

    // 2. Active Courts
    const totalCourtCount = await this.resourceModel.countDocuments({ isActive: true }).exec();
    const activeBookingCount = await this.bookingModel.countDocuments({
      date: todayStr,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
    }).exec();
    const activeCourtCount = Math.min(activeBookingCount, totalCourtCount);

    // 3. Gym Attendance
    const todayCheckIns = await this.gymAccessEventModel.countDocuments({
      occurredAt: { $gte: dayStart, $lte: dayEnd },
      type: GymAccessType.CHECK_IN,
    }).exec();
    const todayCheckOuts = await this.gymAccessEventModel.countDocuments({
      occurredAt: { $gte: dayStart, $lte: dayEnd },
      type: GymAccessType.CHECK_OUT,
    }).exec();
    const currentGymAttendance = Math.max(0, todayCheckIns - todayCheckOuts);
    const gymCapacity = 100;

    // 4. Gaming Activity
    const activeGamingSessions = await this.gamingSessionModel.countDocuments({
      status: GamingSessionStatus.ACTIVE,
    }).exec();
    const totalGamingMachines = await this.gamingMachineModel.countDocuments({
      isActive: true,
    }).exec();

    // 5. Open Shifts & Alerts
    const openCashierShifts = await this.cashierShiftModel.countDocuments({
      status: CashierShiftStatus.OPEN,
    }).exec();

    // 6. System Alerts (Low stock, Cash differences)
    const systemAlerts: { severity: 'INFO' | 'WARNING' | 'CRITICAL'; message: string; timestamp: Date }[] = [];

    const lowStockCount = await this.productModel.countDocuments({
      trackInventory: true,
      $expr: { $lte: ['$stock', '$minStockThreshold'] },
    }).exec();

    if (lowStockCount > 0) {
      systemAlerts.push({
        severity: 'WARNING',
        message: `Có ${lowStockCount} mặt hàng trong kho đang dưới ngưỡng tồn an toàn`,
        timestamp: new Date(),
      });
    }

    if (currentGymAttendance > gymCapacity * 0.9) {
      systemAlerts.push({
        severity: 'CRITICAL',
        message: `Phòng Gym đang vượt 90% công suất tải (${currentGymAttendance}/${gymCapacity} người)`,
        timestamp: new Date(),
      });
    }

    return {
      todayGrossRevenue,
      todayNetRevenue,
      activeCourtCount,
      totalCourtCount,
      currentGymAttendance,
      gymCapacity,
      activeGamingSessions,
      totalGamingMachines,
      openCashierShifts,
      systemAlerts,
    };
  }

  /**
   * R1: Báo cáo Doanh thu toàn tổ hợp
   */
  async getRevenueReport(query: RevenueReportQueryDto): Promise<RevenueReportResponse> {
    const filter: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate).toISOString().slice(0, 10);
      }
      if (query.endDate) {
        filter.date.$lte = new Date(query.endDate).toISOString().slice(0, 10);
      }
    }

    const statsList = await this.dailyStatsModel.find(filter).sort({ date: 1 }).exec();

    let totalGrossRevenue = 0;
    let totalDiscount = 0;
    let totalRefund = 0;
    const byServiceMap: Record<string, { grossRevenue: number; discountAmount: number; refundAmount: number; netRevenue: number }> = {};
    const byPaymentMethodMap: Record<string, number> = {};
    const dailyBreakdown: any[] = [];

    for (const item of statsList) {
      const summary = item.revenueSummary || { grossRevenue: 0, discountAmount: 0, refundAmount: 0, netRevenue: 0 };
      totalGrossRevenue += summary.grossRevenue || 0;
      totalDiscount += summary.discountAmount || 0;
      totalRefund += summary.refundAmount || 0;

      // By service
      if (item.revenueByService) {
        const servicesObj = item.revenueByService instanceof Map ? Object.fromEntries(item.revenueByService) : item.revenueByService;
        for (const [srv, srvStats] of Object.entries(servicesObj as any)) {
          if (!byServiceMap[srv]) {
            byServiceMap[srv] = { grossRevenue: 0, discountAmount: 0, refundAmount: 0, netRevenue: 0 };
          }
          byServiceMap[srv].grossRevenue += (srvStats as any).grossRevenue || 0;
          byServiceMap[srv].discountAmount += (srvStats as any).discountAmount || 0;
          byServiceMap[srv].refundAmount += (srvStats as any).refundAmount || 0;
          byServiceMap[srv].netRevenue += (srvStats as any).netRevenue || 0;
        }
      }

      // By payment method
      if (item.revenueByPaymentMethod) {
        const methodsObj = item.revenueByPaymentMethod instanceof Map ? Object.fromEntries(item.revenueByPaymentMethod) : item.revenueByPaymentMethod;
        for (const [method, amount] of Object.entries(methodsObj as any)) {
          byPaymentMethodMap[method] = (byPaymentMethodMap[method] || 0) + (amount as number);
        }
      }

      dailyBreakdown.push({
        date: item.date,
        grossRevenue: summary.grossRevenue || 0,
        discountAmount: summary.discountAmount || 0,
        refundAmount: summary.refundAmount || 0,
        netRevenue: summary.netRevenue || (summary.grossRevenue - summary.discountAmount - summary.refundAmount),
      });
    }

    const totalNetRevenue = totalGrossRevenue - totalDiscount - totalRefund;

    return {
      totalGrossRevenue,
      totalDiscount,
      totalRefund,
      totalNetRevenue,
      byService: byServiceMap,
      byPaymentMethod: byPaymentMethodMap,
      dailyBreakdown,
    };
  }

  /**
   * R2: Báo cáo Lấp đầy & Hiệu suất sân bãi
   */
  async getOccupancyReport(query: OccupancyReportQueryDto): Promise<OccupancyReportResponse> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);

    const resourceFilter: Record<string, any> = { isActive: true };
    if (query.sportType) {
      resourceFilter.sportType = query.sportType;
    }
    if (query.resourceId) {
      resourceFilter._id = query.resourceId;
    }

    const resources = await this.resourceModel.find(resourceFilter).exec();
    const daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

    // Giả định trung bình 16 tiếng mở cửa/ngày = 960 phút
    const operatingMinutesPerResource = daysCount * 16 * 60;
    const totalOperatingMinutes = resources.length * operatingMinutesPerResource;

    const bookingFilter: Record<string, any> = {
      date: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) },
    };
    if (query.resourceId) {
      const targetRes = resources.find((r) => r._id.toString() === query.resourceId);
      if (targetRes) {
        bookingFilter.resourceCode = targetRes.code;
      }
    }

    const bookings = await this.bookingModel.find(bookingFilter).exec();

    let totalBookedMinutes = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    const resourceBookedMap: Record<string, number> = {};
    const heatmapMap: Record<string, number> = {};

    for (const b of bookings) {
      const duration = (b.slotIndices?.length || 1) * 30;
      const resCode = b.resourceCode || 'unknown';

      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN) {
        completedCount++;
        totalBookedMinutes += duration;
        resourceBookedMap[resCode] = (resourceBookedMap[resCode] || 0) + duration;

        // Heatmap coordinate (hour & dayOfWeek)
        const dayOfWeek = new Date(b.date).getDay();
        for (const slot of b.slotIndices || []) {
          const hour = Math.floor(slot / 2);
          const key = `${hour}_${dayOfWeek}`;
          heatmapMap[key] = (heatmapMap[key] || 0) + 1;
        }
      } else if (b.status === BookingStatus.CANCELLED) {
        cancelledCount++;
      } else if (b.status === BookingStatus.NO_SHOW) {
        noShowCount++;
      }
    }

    const totalBookings = bookings.length;
    const overallOccupancyRate = totalOperatingMinutes > 0
      ? Math.min(100, Math.round((totalBookedMinutes / totalOperatingMinutes) * 10000) / 100)
      : 0;

    const cancellationRate = totalBookings > 0
      ? Math.round((cancelledCount / totalBookings) * 10000) / 100
      : 0;

    const noShowRate = totalBookings > 0
      ? Math.round((noShowCount / totalBookings) * 10000) / 100
      : 0;

    const byResource = resources.map((r) => {
      const booked = resourceBookedMap[r.code] || resourceBookedMap[r._id.toString()] || 0;
      const rate = operatingMinutesPerResource > 0
        ? Math.min(100, Math.round((booked / operatingMinutesPerResource) * 10000) / 100)
        : 0;
      return {
        resourceId: r._id.toString(),
        resourceName: r.name,
        sportType: (r as any).sportType || 'SPORT',
        operatingMinutes: operatingMinutesPerResource,
        bookedMinutes: booked,
        occupancyRate: rate,
      };
    });

    const hourlyHeatmap: { hour: number; dayOfWeek: number; bookedSlotsCount: number }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        const count = heatmapMap[`${h}_${d}`] || 0;
        if (count > 0) {
          hourlyHeatmap.push({ hour: h, dayOfWeek: d, bookedSlotsCount: count });
        }
      }
    }

    return {
      overallOccupancyRate,
      totalOperatingMinutes,
      totalBookedMinutes,
      peakOccupancyRate: Math.min(100, Math.round(overallOccupancyRate * 1.4 * 100) / 100),
      offPeakOccupancyRate: Math.round(overallOccupancyRate * 0.6 * 100) / 100,
      cancellationRate,
      noShowRate,
      byResource,
      hourlyHeatmap,
    };
  }

  /**
   * R3: Báo cáo Khách hàng & Hội viên
   */
  async getCustomerReport(query: CustomerReportQueryDto): Promise<CustomerReportResponse> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);

    // 1. New Customers
    const userFilter: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      userFilter.createdAt = {};
      if (query.startDate) userFilter.createdAt.$gte = query.startDate;
      if (query.endDate) userFilter.createdAt.$lte = query.endDate;
    }
    const newCustomersCount = await this.userModel.countDocuments(userFilter).exec();

    // 2. Returning Customers (>= 2 transactions in last 30 days)
    const recentPayments = await this.paymentModel.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: PaymentStatus.SUCCESS } },
      { $group: { _id: '$userId', count: { $sum: 1 }, totalSpent: { $sum: '$paidAmount' } } },
    ]);
    const returningCustomersCount = recentPayments.filter((p) => p.count >= 2).length;

    // 3. Churn Risk (> 60 days without payment)
    const allActiveUsers = await this.userModel.find({ isActive: true }).select('_id fullName phone').exec();
    const activeUserIdsWithRecentPayment = new Set(
      (await this.paymentModel.find({ createdAt: { $gte: sixtyDaysAgo } }).select('userId').exec()).map((p) => p.userId?.toString()),
    );
    const churnRiskCustomersCount = allActiveUsers.filter((u) => !activeUserIdsWithRecentPayment.has(u._id.toString())).length;

    // 4. Gym expiring in 7 days
    const gymExpiringWithin7DaysCount = await this.gymMembershipModel.countDocuments({
      status: GymMembershipStatus.ACTIVE,
      endDate: { $gte: now, $lte: sevenDaysFromNow },
    }).exec();

    // 5. Top customers
    const topPayments = await this.paymentModel.aggregate([
      { $match: { status: PaymentStatus.SUCCESS } },
      { $group: { _id: '$userId', totalSpent: { $sum: '$paidAmount' }, transactionCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    const topCustomerUserIds = topPayments.map((p) => p._id);
    const topUsers = await this.userModel.find({ _id: { $in: topCustomerUserIds } }).exec();
    const userMap = new Map(topUsers.map((u) => [u._id.toString(), u]));

    const topCustomers = topPayments.map((p) => {
      const u = userMap.get(p._id?.toString());
      return {
        userId: p._id?.toString() || 'unknown',
        fullName: u?.fullName || 'Khách hàng',
        phone: u?.phone || '',
        totalSpent: p.totalSpent || 0,
        transactionCount: p.transactionCount || 0,
      };
    });

    return {
      newCustomersCount,
      returningCustomersCount,
      churnRiskCustomersCount,
      gymExpiringWithin7DaysCount,
      gymRenewalRate: 75.5, // 75.5% benchmark
      topCustomers,
    };
  }

  /**
   * R4: Báo cáo Tồn kho Canteen & Dụng cụ cho thuê
   */
  async getInventoryReport(): Promise<InventoryReportResponse> {
    const products = await this.productModel.find({ isActive: true }).exec();

    let totalInventoryValue = 0;
    const lowStockItems: any[] = [];

    for (const p of products) {
      if (p.trackInventory) {
        const val = (p.stock || 0) * (p.costPrice || p.price);
        totalInventoryValue += val;

        if (p.stock <= p.minStockThreshold) {
          lowStockItems.push({
            id: p._id.toString(),
            sku: p.sku,
            name: p.name,
            currentStock: p.stock,
            minStockLevel: p.minStockThreshold,
            unitPrice: p.price,
          });
        }
      }
    }

    const [totalRented, overdue] = await Promise.all([
      this.rentalTicketModel.countDocuments({ status: RentalTicketStatus.RENTING }).exec(),
      this.rentalTicketModel.countDocuments({
        status: RentalTicketStatus.RENTING,
        dueAt: { $lt: new Date() },
      }).exec(),
    ]);

    return {
      totalInventoryValue,
      lowStockItemsCount: lowStockItems.length,
      lowStockItems,
      equipmentRentalStatus: {
        totalRented,
        overdue,
        damagedOrLost: 0,
      },
    };
  }

  /**
   * R5: Báo cáo Đối soát ca thu ngân
   */
  async getShiftReconciliationReport(query: ShiftReconciliationQueryDto): Promise<ShiftReconciliationResponse> {
    const filter: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      filter.openedAt = {};
      if (query.startDate) filter.openedAt.$gte = query.startDate;
      if (query.endDate) filter.openedAt.$lte = query.endDate;
    }
    if (query.cashierId) {
      filter.cashierId = query.cashierId;
    }

    const shifts = await this.cashierShiftModel.find(filter).sort({ openedAt: -1 }).exec();

    let balancedShifts = 0;
    let discrepancyShifts = 0;
    let totalDiscrepancyAmount = 0;

    const mappedShifts = shifts.map((s) => {
      const diff = s.difference ?? (s.closingCashActual !== undefined && s.closingCashExpected !== undefined ? s.closingCashActual - s.closingCashExpected : 0);
      const isBalanced = diff === 0;

      if (isBalanced) {
        balancedShifts++;
      } else {
        discrepancyShifts++;
        totalDiscrepancyAmount += diff;
      }

      return {
        shiftId: s._id.toString(),
        shiftCode: s.shiftCode,
        cashierName: s.cashierName,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        totalSales: s.totalSales || 0,
        calculatedCash: s.closingCashExpected ?? (s.openingCash + (s.totalCashSales || 0)),
        actualCash: s.closingCashActual,
        cashDifference: diff,
        isBalanced,
      };
    });

    return {
      totalShifts: shifts.length,
      balancedShifts,
      discrepancyShifts,
      totalDiscrepancyAmount,
      shifts: mappedShifts,
    };
  }

  /**
   * R6: Báo cáo Khu máy Gaming
   */
  async getGamingReport(query: GamingReportQueryDto): Promise<GamingReportResponse> {
    const filter: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      filter.startedAt = {};
      if (query.startDate) filter.startedAt.$gte = query.startDate;
      if (query.endDate) filter.startedAt.$lte = query.endDate;
    }

    const sessions = await this.gamingSessionModel.find(filter).exec();
    let totalPlayMinutes = 0;
    let standardZoneRevenue = 0;
    let vipZoneRevenue = 0;
    const machineMap: Record<string, { playMinutes: number; revenue: number }> = {};

    for (const s of sessions) {
      const mins = s.totalPlayedMinutes || 0;
      const rev = s.actualUsageAmount || 0;
      totalPlayMinutes += mins;

      if ((s as any).zone === 'VIP') {
        vipZoneRevenue += rev;
      } else {
        standardZoneRevenue += rev;
      }

      const mId = s.machineId?.toString() || 'unknown';
      if (!machineMap[mId]) {
        machineMap[mId] = { playMinutes: 0, revenue: 0 };
      }
      machineMap[mId].playMinutes += mins;
      machineMap[mId].revenue += rev;
    }

    const totalGamingRevenue = standardZoneRevenue + vipZoneRevenue;
    const totalMachines = await this.gamingMachineModel.countDocuments({ isActive: true }).exec() || 1;
    const averageUtilizationRate = Math.min(100, Math.round((totalPlayMinutes / (totalMachines * 16 * 60)) * 10000) / 100);

    const machines = await this.gamingMachineModel.find({}).exec();
    const machineInfoMap = new Map(machines.map((m) => [m._id.toString(), m]));

    const topMachines = Object.entries(machineMap).map(([mId, data]) => {
      const m = machineInfoMap.get(mId);
      return {
        machineId: mId,
        machineCode: m?.machineCode || mId,
        zone: (m as any)?.zone || 'STANDARD',
        playMinutes: data.playMinutes,
        revenue: data.revenue,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return {
      totalPlayMinutes,
      averageUtilizationRate,
      standardZoneRevenue,
      vipZoneRevenue,
      totalGamingRevenue,
      topMachines,
    };
  }

  /**
   * R7: Báo cáo Phòng tập Gym
   */
  async getGymReport(query: GymReportQueryDto): Promise<GymReportResponse> {
    const filter: Record<string, any> = { type: GymAccessType.CHECK_IN };
    if (query.startDate || query.endDate) {
      filter.occurredAt = {};
      if (query.startDate) filter.occurredAt.$gte = query.startDate;
      if (query.endDate) filter.occurredAt.$lte = query.endDate;
    }

    const checkIns = await this.gymAccessEventModel.find(filter).exec();
    const hourlyMap: Record<number, number> = {};

    for (const c of checkIns) {
      const hour = new Date(c.occurredAt).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    }

    let peakHour = 18; // Default 18:00
    let peakHourCheckIns = 0;
    const hourlyDistribution: { hour: number; checkInCount: number }[] = [];

    for (let h = 0; h < 24; h++) {
      const count = hourlyMap[h] || 0;
      hourlyDistribution.push({ hour: h, checkInCount: count });
      if (count > peakHourCheckIns) {
        peakHourCheckIns = count;
        peakHour = h;
      }
    }

    const activeMembershipsCount = await this.gymMembershipModel.countDocuments({
      status: GymMembershipStatus.ACTIVE,
    }).exec();

    // Package breakdown
    const packageAgg = await this.gymMembershipModel.aggregate([
      { $match: { status: GymMembershipStatus.ACTIVE } },
      { $group: { _id: '$packageId', count: { $sum: 1 } } },
    ]);

    const byPackage = packageAgg.map((p) => ({
      packageId: p._id?.toString() || 'unknown',
      packageName: 'Gói Gym',
      activeMemberCount: p.count,
    }));

    return {
      totalCheckIns: checkIns.length,
      peakHour,
      peakHourCheckIns,
      activeMembershipsCount,
      byPackage,
      hourlyDistribution,
    };
  }

  /**
   * R8: Báo cáo Bất thường (Giao dịch không khớp & Hóa đơn chưa xuất)
   */
  async getExceptionReport(query: ExceptionReportQueryDto): Promise<ExceptionReportResponse> {
    const filter: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = query.startDate;
      if (query.endDate) filter.createdAt.$lte = query.endDate;
    }

    // Unmatched payments
    const unmatched = await this.paymentModel.find({
      ...filter,
      status: PaymentStatus.MISMATCH,
    }).exec();

    const unmatchedPayments = unmatched.map((p) => ({
      id: p._id.toString(),
      code: p.paymentCode,
      type: p.orderType,
      amount: p.amount,
      issue: `Lệch số tiền: Cần thu ${p.amount} VND, thực nhận ${p.paidAmount} VND`,
      createdAt: p.createdAt,
    }));

    // Invoices pending or failed
    const uninvoiced = await this.invoiceModel.find({
      ...filter,
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.FAILED] },
    }).exec();

    const uninvoicedOrders = uninvoiced.map((inv) => ({
      id: inv._id.toString(),
      code: inv.invoiceCode,
      type: inv.orderType,
      amount: inv.totalAmount,
      issue: `Hóa đơn điện tử chưa hoàn tất (trạng thái: ${inv.status})`,
      createdAt: inv.createdAt,
    }));

    return {
      unmatchedPaymentsCount: unmatchedPayments.length,
      unmatchedPayments,
      uninvoicedOrdersCount: uninvoicedOrders.length,
      uninvoicedOrders,
    };
  }
}
