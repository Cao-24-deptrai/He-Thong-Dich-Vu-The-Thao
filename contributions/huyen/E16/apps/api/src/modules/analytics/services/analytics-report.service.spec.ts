import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AnalyticsReportService } from './analytics-report.service.js';
import { DailyStats } from '../schemas/daily-stats.schema.js';
import { Payment } from '../../payment/schemas/payment.schema.js';
import { Booking } from '../../booking/schemas/booking.schema.js';
import { Resource } from '../../facility/schemas/resource.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { GymAccessEvent } from '../../gym/schemas/gym-access-event.schema.js';
import { GymMembership } from '../../gym/schemas/gym-membership.schema.js';
import { GamingSession } from '../../gaming/schemas/gaming-session.schema.js';
import { GamingMachine } from '../../gaming/schemas/gaming-machine.schema.js';
import { CashierShift } from '../../canteen/schemas/cashier-shift.schema.js';
import { Product } from '../../canteen/schemas/product.schema.js';
import { RentalTicket } from '../../rental/schemas/rental-ticket.schema.js';
import { Invoice } from '../../invoice/schemas/invoice.schema.js';
import {
  PaymentStatus,
  BookingStatus,
  GymAccessType,
  CashierShiftStatus,
  RentalTicketStatus,
  InvoiceStatus,
  GamingSessionStatus,
  GymMembershipStatus,
  PaymentMethod,
  PaymentOrderType,
} from '@sports/shared';

describe('AnalyticsReportService', () => {
  let service: AnalyticsReportService;

  // In-memory mock stores
  let inMemoryDailyStats: any[] = [];
  let inMemoryPayments: any[] = [];
  let inMemoryBookings: any[] = [];
  let inMemoryResources: any[] = [];
  let inMemoryUsers: any[] = [];
  let inMemoryGymEvents: any[] = [];
  let inMemoryGymMemberships: any[] = [];
  let inMemoryGamingSessions: any[] = [];
  let inMemoryGamingMachines: any[] = [];
  let inMemoryCashierShifts: any[] = [];
  let inMemoryProducts: any[] = [];
  let inMemoryRentalTickets: any[] = [];
  let inMemoryInvoices: any[] = [];

  beforeEach(async () => {
    inMemoryDailyStats = [];
    inMemoryPayments = [];
    inMemoryBookings = [];
    inMemoryResources = [];
    inMemoryUsers = [];
    inMemoryGymEvents = [];
    inMemoryGymMemberships = [];
    inMemoryGamingSessions = [];
    inMemoryGamingMachines = [];
    inMemoryCashierShifts = [];
    inMemoryProducts = [];
    inMemoryRentalTickets = [];
    inMemoryInvoices = [];

    const mockDailyStatsModel = {
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(inMemoryDailyStats.find((d) => d.date === query.date) || null),
      })),
      find: jest.fn().mockImplementation((query) => ({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(
            inMemoryDailyStats.filter((d) => {
              if (query.date?.$gte && d.date < query.date.$gte) return false;
              if (query.date?.$lte && d.date > query.date.$lte) return false;
              return true;
            }),
          ),
        }),
      })),
    };

    const mockPaymentModel = {
      find: jest.fn().mockImplementation((query) => ({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(inMemoryPayments.map((p) => ({ userId: p.userId }))),
        }),
        exec: jest.fn().mockResolvedValue(
          inMemoryPayments.filter((p) => {
            if (query.status && p.status !== query.status) return false;
            if (query.createdAt?.$gte && p.createdAt < query.createdAt.$gte) return false;
            if (query.createdAt?.$lte && p.createdAt > query.createdAt.$lte) return false;
            return true;
          }),
        ),
      })),
      aggregate: jest.fn().mockImplementation((pipeline) => {
        // Simple aggregate mock for top payments / returning customers
        const groupMatch = pipeline.find((stage: any) => stage.$group);
        if (groupMatch) {
          const userMap = new Map<string, { count: number; totalSpent: number }>();
          for (const p of inMemoryPayments) {
            if (p.status !== PaymentStatus.SUCCESS) continue;
            const uId = p.userId?.toString() || 'unknown';
            const curr = userMap.get(uId) || { count: 0, totalSpent: 0 };
            curr.count += 1;
            curr.totalSpent += p.paidAmount || p.amount;
            userMap.set(uId, curr);
          }
          return Promise.resolve(
            Array.from(userMap.entries()).map(([k, v]) => ({
              _id: k,
              count: v.count,
              transactionCount: v.count,
              totalSpent: v.totalSpent,
            })),
          );
        }
        return Promise.resolve([]);
      }),
    };

    const mockBookingModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryBookings.filter((b) => {
            if (query.date && b.date !== query.date) return false;
            if (query.status?.$in && !query.status.$in.includes(b.status)) return false;
            return true;
          }).length,
        ),
      })),
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryBookings.filter((b) => {
            if (query.resourceCode && b.resourceCode !== query.resourceCode) return false;
            if (query.date?.$gte && b.date < query.date.$gte) return false;
            if (query.date?.$lte && b.date > query.date.$lte) return false;
            return true;
          }),
        ),
      })),
    };

    const mockResourceModel = {
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryResources.filter((r) => r.isActive).length),
      })),
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryResources.filter((r) => {
            if (query.isActive !== undefined && r.isActive !== query.isActive) return false;
            if (query.sportType && r.sportType !== query.sportType) return false;
            if (query._id && r._id.toString() !== query._id.toString()) return false;
            return true;
          }),
        ),
      })),
    };

    const mockUserModel = {
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryUsers.length),
      })),
      find: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(inMemoryUsers),
        }),
        exec: jest.fn().mockResolvedValue(inMemoryUsers),
      })),
    };

    const mockGymAccessEventModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryGymEvents.filter((e) => {
            if (query.type && e.type !== query.type) return false;
            return true;
          }).length,
        ),
      })),
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryGymEvents.filter((e) => {
            if (query.type && e.type !== query.type) return false;
            return true;
          }),
        ),
      })),
    };

    const mockGymMembershipModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryGymMemberships.filter((m) => {
            if (query.status && m.status !== query.status) return false;
            return true;
          }).length,
        ),
      })),
      aggregate: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId(), count: 1 },
      ]),
    };

    const mockGamingSessionModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryGamingSessions.filter((s) => {
            if (query.status && s.status !== query.status) return false;
            return true;
          }).length,
        ),
      })),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryGamingSessions),
      })),
    };

    const mockGamingMachineModel = {
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryGamingMachines.filter((m) => m.isActive).length),
      })),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryGamingMachines),
      })),
    };

    const mockCashierShiftModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryCashierShifts.filter((s) => {
            if (query.status && s.status !== query.status) return false;
            return true;
          }).length,
        ),
      })),
      find: jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(inMemoryCashierShifts),
        }),
      })),
    };

    const mockProductModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryProducts.filter((p) => {
            if (query.trackInventory && !p.trackInventory) return false;
            if (query.$expr && p.stock > p.minStockThreshold) return false;
            return true;
          }).length,
        ),
      })),
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryProducts.filter((p) => {
            if (query.isActive !== undefined && p.isActive !== query.isActive) return false;
            return true;
          }),
        ),
      })),
    };

    const mockRentalTicketModel = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryRentalTickets.filter((t) => {
            if (query.status && t.status !== query.status) return false;
            if (query.dueAt?.$lt && t.dueAt >= new Date()) return false;
            return true;
          }).length,
        ),
      })),
    };

    const mockInvoiceModel = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryInvoices.filter((i) => {
            if (query.status?.$in && !query.status.$in.includes(i.status)) return false;
            return true;
          }),
        ),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsReportService,
        { provide: getModelToken(DailyStats.name), useValue: mockDailyStatsModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(Resource.name), useValue: mockResourceModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(GymAccessEvent.name), useValue: mockGymAccessEventModel },
        { provide: getModelToken(GymMembership.name), useValue: mockGymMembershipModel },
        { provide: getModelToken(GamingSession.name), useValue: mockGamingSessionModel },
        { provide: getModelToken(GamingMachine.name), useValue: mockGamingMachineModel },
        { provide: getModelToken(CashierShift.name), useValue: mockCashierShiftModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(RentalTicket.name), useValue: mockRentalTicketModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
      ],
    }).compile();

    service = module.get<AnalyticsReportService>(AnalyticsReportService);
  });

  describe('Executive Dashboard', () => {
    it('should return real-time metrics and system alerts for executive dashboard', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      inMemoryDailyStats.push({
        date: todayStr,
        revenueSummary: { grossRevenue: 5000000, discountAmount: 500000, refundAmount: 0, netRevenue: 4500000 },
      });

      inMemoryResources.push(
        { _id: new Types.ObjectId(), name: 'Court 1', code: 'C01', isActive: true },
        { _id: new Types.ObjectId(), name: 'Court 2', code: 'C02', isActive: true },
      );

      inMemoryBookings.push({
        date: todayStr,
        status: BookingStatus.CONFIRMED,
        resourceCode: 'C01',
      });

      // Gym events: 95 checkins, 0 checkouts -> 95 people (over 90% of capacity 100) -> CRITICAL alert
      for (let i = 0; i < 95; i++) {
        inMemoryGymEvents.push({
          occurredAt: new Date(),
          type: GymAccessType.CHECK_IN,
        });
      }

      // Products: 1 product low stock -> WARNING alert
      inMemoryProducts.push({
        _id: new Types.ObjectId(),
        name: 'Sting Dâu',
        sku: 'STING-01',
        stock: 2,
        minStockThreshold: 10,
        trackInventory: true,
        isActive: true,
        price: 15000,
      });

      inMemoryGamingMachines.push(
        { _id: new Types.ObjectId(), machineCode: 'PC-01', isActive: true },
        { _id: new Types.ObjectId(), machineCode: 'PC-02', isActive: true },
      );

      inMemoryGamingSessions.push({
        machineId: inMemoryGamingMachines[0]._id,
        status: GamingSessionStatus.ACTIVE,
      });

      inMemoryCashierShifts.push({
        status: CashierShiftStatus.OPEN,
      });

      const dashboard = await service.getExecutiveDashboard();

      expect(dashboard.todayGrossRevenue).toBe(5000000);
      expect(dashboard.todayNetRevenue).toBe(4500000);
      expect(dashboard.totalCourtCount).toBe(2);
      expect(dashboard.activeCourtCount).toBe(1);
      expect(dashboard.currentGymAttendance).toBe(95);
      expect(dashboard.gymCapacity).toBe(100);
      expect(dashboard.activeGamingSessions).toBe(1);
      expect(dashboard.totalGamingMachines).toBe(2);
      expect(dashboard.openCashierShifts).toBe(1);

      // Verify Alerts
      expect(dashboard.systemAlerts.length).toBe(2);
      const warningAlert = dashboard.systemAlerts.find((a) => a.severity === 'WARNING');
      const criticalAlert = dashboard.systemAlerts.find((a) => a.severity === 'CRITICAL');
      expect(warningAlert).toBeDefined();
      expect(warningAlert?.message).toContain('dưới ngưỡng tồn an toàn');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.message).toContain('vượt 90% công suất tải');
    });

    it('should fallback to live payments if daily stats have not yet been generated today', async () => {
      inMemoryPayments.push({
        createdAt: new Date(),
        status: PaymentStatus.SUCCESS,
        amount: 300000,
        paidAmount: 300000,
      });

      const dashboard = await service.getExecutiveDashboard();
      expect(dashboard.todayGrossRevenue).toBe(300000);
      expect(dashboard.todayNetRevenue).toBe(300000);
    });
  });

  describe('R1: Revenue Report', () => {
    it('should aggregate revenue by service and payment method across date range', async () => {
      inMemoryDailyStats.push(
        {
          date: '2026-10-01',
          revenueSummary: { grossRevenue: 1000000, discountAmount: 100000, refundAmount: 0, netRevenue: 900000 },
          revenueByService: new Map([
            [PaymentOrderType.BOOKING, { grossRevenue: 800000, discountAmount: 100000, refundAmount: 0, netRevenue: 700000 }],
            [PaymentOrderType.CANTEEN_ORDER, { grossRevenue: 200000, discountAmount: 0, refundAmount: 0, netRevenue: 200000 }],
          ]),
          revenueByPaymentMethod: new Map([
            [PaymentMethod.VIETQR, 800000],
            [PaymentMethod.CASH, 200000],
          ]),
        },
        {
          date: '2026-10-02',
          revenueSummary: { grossRevenue: 2000000, discountAmount: 200000, refundAmount: 50000, netRevenue: 1750000 },
          revenueByService: new Map([
            [PaymentOrderType.BOOKING, { grossRevenue: 1500000, discountAmount: 200000, refundAmount: 50000, netRevenue: 1250000 }],
            [PaymentOrderType.GYM_MEMBERSHIP, { grossRevenue: 500000, discountAmount: 0, refundAmount: 0, netRevenue: 500000 }],
          ]),
          revenueByPaymentMethod: new Map([
            [PaymentMethod.VIETQR, 1500000],
            [PaymentMethod.INTERNAL_WALLET, 500000],
          ]),
        },
      );

      const report = await service.getRevenueReport({
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-02'),
      });

      expect(report.totalGrossRevenue).toBe(3000000);
      expect(report.totalDiscount).toBe(300000);
      expect(report.totalRefund).toBe(50000);
      expect(report.totalNetRevenue).toBe(2650000);
      expect(report.dailyBreakdown.length).toBe(2);

      // Verify service breakdown
      expect(report.byService[PaymentOrderType.BOOKING]!.grossRevenue).toBe(2300000);
      expect(report.byService[PaymentOrderType.CANTEEN_ORDER]!.grossRevenue).toBe(200000);
      expect(report.byService[PaymentOrderType.GYM_MEMBERSHIP]!.grossRevenue).toBe(500000);

      // Verify payment method breakdown
      expect(report.byPaymentMethod[PaymentMethod.VIETQR]).toBe(2300000);
      expect(report.byPaymentMethod[PaymentMethod.CASH]).toBe(200000);
      expect(report.byPaymentMethod[PaymentMethod.INTERNAL_WALLET]).toBe(500000);
    });
  });

  describe('R2: Occupancy Report', () => {
    it('should compute occupancy rates, cancellations, no-shows and hourly heatmap', async () => {
      const resId = new Types.ObjectId();
      inMemoryResources.push({
        _id: resId,
        name: 'Sân Cầu Lông 1',
        code: 'BAD-01',
        sportType: 'BADMINTON',
        isActive: true,
      });

      inMemoryBookings.push(
        {
          date: '2026-10-01',
          resourceCode: 'BAD-01',
          slotIndices: [16, 17], // 2 slots = 60 mins
          status: BookingStatus.CONFIRMED,
        },
        {
          date: '2026-10-01',
          resourceCode: 'BAD-01',
          slotIndices: [18, 19],
          status: BookingStatus.CANCELLED,
        },
        {
          date: '2026-10-01',
          resourceCode: 'BAD-01',
          slotIndices: [20, 21],
          status: BookingStatus.NO_SHOW,
        },
      );

      const report = await service.getOccupancyReport({
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-01'),
      });

      expect(report.totalBookedMinutes).toBe(60);
      expect(report.totalOperatingMinutes).toBe(16 * 60); // 1 resource * 1 day * 16h * 60m = 960m
      expect(report.overallOccupancyRate).toBe(6.25); // 60/960 = 6.25%
      expect(report.cancellationRate).toBe(33.33); // 1 out of 3
      expect(report.noShowRate).toBe(33.33); // 1 out of 3
      expect(report.byResource.length).toBe(1);
      expect(report.byResource[0]!.resourceName).toBe('Sân Cầu Lông 1');
      expect(report.hourlyHeatmap.length).toBeGreaterThan(0);
    });
  });

  describe('R3: Customer Report', () => {
    it('should identify new customers, returning customers, churn risk and top spenders', async () => {
      const u1Id = new Types.ObjectId();
      const u2Id = new Types.ObjectId();
      const u3Id = new Types.ObjectId();

      inMemoryUsers.push(
        { _id: u1Id, fullName: 'Nguyễn Văn A', phone: '0901111111', isActive: true, createdAt: new Date() },
        { _id: u2Id, fullName: 'Trần Thị B', phone: '0902222222', isActive: true, createdAt: new Date() },
        { _id: u3Id, fullName: 'Lê Văn C', phone: '0903333333', isActive: true, createdAt: new Date('2026-01-01') },
      );

      // Payments: u1 has 2 payments (returning), u2 has 1 payment, u3 has 0 payments in last 60 days (churn risk)
      inMemoryPayments.push(
        { userId: u1Id, paidAmount: 2000000, status: PaymentStatus.SUCCESS, createdAt: new Date() },
        { userId: u1Id, paidAmount: 1000000, status: PaymentStatus.SUCCESS, createdAt: new Date() },
        { userId: u2Id, paidAmount: 500000, status: PaymentStatus.SUCCESS, createdAt: new Date() },
      );

      const report = await service.getCustomerReport({});

      expect(report.newCustomersCount).toBe(3);
      expect(report.returningCustomersCount).toBe(1); // u1 has >= 2 payments
      expect(report.churnRiskCustomersCount).toBe(1); // u3 has 0 recent payments
      expect(report.topCustomers.length).toBeGreaterThan(0);
      expect(report.topCustomers[0]!.userId).toBe(u1Id.toString());
      expect(report.topCustomers[0]!.totalSpent).toBe(3000000);
      expect(report.topCustomers[0]!.transactionCount).toBe(2);
    });
  });

  describe('R4: Inventory Report', () => {
    it('should calculate total inventory value and detect low-stock items & rental status', async () => {
      inMemoryProducts.push(
        {
          _id: new Types.ObjectId(),
          sku: 'BALL-01',
          name: 'Bóng đá Molten',
          stock: 10,
          costPrice: 200000,
          price: 250000,
          trackInventory: true,
          isActive: true,
          minStockThreshold: 5,
        },
        {
          _id: new Types.ObjectId(),
          sku: 'DRINK-01',
          name: 'Nước lọc Aquafina',
          stock: 3, // Low stock <= 10
          costPrice: 5000,
          price: 10000,
          trackInventory: true,
          isActive: true,
          minStockThreshold: 10,
        },
      );

      inMemoryRentalTickets.push(
        { status: RentalTicketStatus.RENTING, dueAt: new Date(Date.now() + 3600000) },
        { status: RentalTicketStatus.RENTING, dueAt: new Date(Date.now() - 3600000) }, // Overdue
      );

      const report = await service.getInventoryReport();

      expect(report.totalInventoryValue).toBe(10 * 200000 + 3 * 5000); // 2,015,000 VND
      expect(report.lowStockItemsCount).toBe(1);
      expect(report.lowStockItems[0]!.sku).toBe('DRINK-01');
      expect(report.equipmentRentalStatus.totalRented).toBe(2);
      expect(report.equipmentRentalStatus.overdue).toBe(1);
    });
  });

  describe('R5: Shift Reconciliation Report', () => {
    it('should detect balanced shifts and discrepancy shifts with cash difference', async () => {
      inMemoryCashierShifts.push(
        {
          _id: new Types.ObjectId(),
          shiftCode: 'SHIFT-01',
          cashierName: 'Thu ngân A',
          openedAt: new Date('2026-10-01T06:00:00Z'),
          closedAt: new Date('2026-10-01T14:00:00Z'),
          totalSales: 1500000,
          closingCashExpected: 2500000,
          closingCashActual: 2500000,
          difference: 0,
        },
        {
          _id: new Types.ObjectId(),
          shiftCode: 'SHIFT-02',
          cashierName: 'Thu ngân B',
          openedAt: new Date('2026-10-01T14:00:00Z'),
          closedAt: new Date('2026-10-01T22:00:00Z'),
          totalSales: 3000000,
          closingCashExpected: 4000000,
          closingCashActual: 3950000, // Shortage of 50k
          difference: -50000,
        },
      );

      const report = await service.getShiftReconciliationReport({});

      expect(report.totalShifts).toBe(2);
      expect(report.balancedShifts).toBe(1);
      expect(report.discrepancyShifts).toBe(1);
      expect(report.totalDiscrepancyAmount).toBe(-50000);
      expect(report.shifts[1]!.isBalanced).toBe(false);
      expect(report.shifts[1]!.cashDifference).toBe(-50000);
    });
  });

  describe('R6: Gaming Report', () => {
    it('should aggregate gaming play minutes, zone breakdown and top machines', async () => {
      const m1 = new Types.ObjectId();
      const m2 = new Types.ObjectId();

      inMemoryGamingMachines.push(
        { _id: m1, machineCode: 'PC-STANDARD-01', zone: 'STANDARD', isActive: true },
        { _id: m2, machineCode: 'PC-VIP-01', zone: 'VIP', isActive: true },
      );

      inMemoryGamingSessions.push(
        {
          machineId: m1,
          zone: 'STANDARD',
          totalPlayedMinutes: 120,
          actualUsageAmount: 50000,
        },
        {
          machineId: m2,
          zone: 'VIP',
          totalPlayedMinutes: 180,
          actualUsageAmount: 120000,
        },
      );

      const report = await service.getGamingReport({});

      expect(report.totalPlayMinutes).toBe(300);
      expect(report.standardZoneRevenue).toBe(50000);
      expect(report.vipZoneRevenue).toBe(120000);
      expect(report.totalGamingRevenue).toBe(170000);
      expect(report.topMachines.length).toBe(2);
      expect(report.topMachines[0]!.machineCode).toBe('PC-VIP-01');
      expect(report.topMachines[0]!.revenue).toBe(120000);
    });
  });

  describe('R7: Gym Report', () => {
    it('should calculate gym check-ins, peak hours and active memberships', async () => {
      inMemoryGymEvents.push(
        { occurredAt: new Date('2026-10-01T17:30:00Z'), type: GymAccessType.CHECK_IN },
        { occurredAt: new Date('2026-10-01T18:15:00Z'), type: GymAccessType.CHECK_IN },
        { occurredAt: new Date('2026-10-01T18:45:00Z'), type: GymAccessType.CHECK_IN },
      );

      inMemoryGymMemberships.push(
        { status: GymMembershipStatus.ACTIVE, packageId: new Types.ObjectId() },
        { status: GymMembershipStatus.EXPIRED, packageId: new Types.ObjectId() },
      );

      const report = await service.getGymReport({});

      expect(report.totalCheckIns).toBe(3);
      // Hourly distribution check
      expect(report.hourlyDistribution.length).toBe(24);
      expect(report.activeMembershipsCount).toBe(1);
    });
  });

  describe('R8: Exception Report', () => {
    it('should detect unmatched payments and uninvoiced orders', async () => {
      inMemoryPayments.push(
        {
          _id: new Types.ObjectId(),
          paymentCode: 'PAY-ERR-01',
          orderType: PaymentOrderType.BOOKING,
          amount: 500000,
          paidAmount: 400000,
          status: PaymentStatus.MISMATCH,
          createdAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          paymentCode: 'PAY-OK-01',
          orderType: PaymentOrderType.BOOKING,
          amount: 300000,
          paidAmount: 300000,
          status: PaymentStatus.SUCCESS,
          createdAt: new Date(),
        },
      );

      inMemoryInvoices.push(
        {
          _id: new Types.ObjectId(),
          invoiceCode: 'INV-PENDING-01',
          orderType: PaymentOrderType.CANTEEN_ORDER,
          totalAmount: 150000,
          status: InvoiceStatus.PENDING,
          createdAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          invoiceCode: 'INV-FAILED-01',
          orderType: PaymentOrderType.GYM_MEMBERSHIP,
          totalAmount: 2500000,
          status: InvoiceStatus.FAILED,
          createdAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          invoiceCode: 'INV-ISSUED-01',
          orderType: PaymentOrderType.BOOKING,
          totalAmount: 600000,
          status: InvoiceStatus.ISSUED,
          createdAt: new Date(),
        },
      );

      const report = await service.getExceptionReport({});

      expect(report.unmatchedPaymentsCount).toBe(1);
      expect(report.unmatchedPayments[0]!.code).toBe('PAY-ERR-01');
      expect(report.unmatchedPayments[0]!.issue).toContain('Lệch số tiền');

      expect(report.uninvoicedOrdersCount).toBe(2);
      expect(report.uninvoicedOrders.map((i) => i.code)).toEqual(
        expect.arrayContaining(['INV-PENDING-01', 'INV-FAILED-01']),
      );
    });
  });
});
