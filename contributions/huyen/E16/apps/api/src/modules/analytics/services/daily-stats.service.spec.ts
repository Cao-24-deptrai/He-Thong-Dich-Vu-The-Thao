import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { DailyStatsService } from './daily-stats.service.js';
import { DailyStats } from '../schemas/daily-stats.schema.js';
import { Payment } from '../../payment/schemas/payment.schema.js';
import { Booking } from '../../booking/schemas/booking.schema.js';
import { CanteenOrder } from '../../canteen/schemas/canteen-order.schema.js';
import { RentalTicket } from '../../rental/schemas/rental-ticket.schema.js';
import { GamingSession } from '../../gaming/schemas/gaming-session.schema.js';
import { GymAccessEvent } from '../../gym/schemas/gym-access-event.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import {
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  GymAccessType,
  PaymentOrderType,
} from '@sports/shared';

describe('DailyStatsService', () => {
  let service: DailyStatsService;

  let inMemoryDailyStats: any[] = [];
  let inMemoryPayments: any[] = [];
  let inMemoryBookings: any[] = [];
  let inMemoryCanteenOrders: any[] = [];
  let inMemoryRentals: any[] = [];
  let inMemoryGamingSessions: any[] = [];
  let inMemoryGymEvents: any[] = [];
  let inMemoryUsers: any[] = [];

  beforeEach(async () => {
    inMemoryDailyStats = [];
    inMemoryPayments = [];
    inMemoryBookings = [];
    inMemoryCanteenOrders = [];
    inMemoryRentals = [];
    inMemoryGamingSessions = [];
    inMemoryGymEvents = [];
    inMemoryUsers = [];

    const mockDailyStatsModel: any = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        let doc = inMemoryDailyStats.find((d) => d.date === query.date);
        if (!doc) {
          doc = {
            date: query.date,
            revenueSummary: { grossRevenue: 0, discountAmount: 0, refundAmount: 0, netRevenue: 0 },
            revenueByService: new Map(),
            revenueByPaymentMethod: new Map(),
            bookingSummary: { totalBookings: 0, totalMinutes: 0, completedBookings: 0, cancelledBookings: 0, noShowBookings: 0 },
            gymSummary: { totalCheckIns: 0, newMemberships: 0, renewedMemberships: 0 },
            gamingSummary: { totalSessions: 0, totalPlayMinutes: 0, standardRevenue: 0, vipRevenue: 0 },
            canteenSummary: { totalOrders: 0, totalSales: 0, totalCost: 0, grossProfit: 0 },
            rentalSummary: { totalRentals: 0, totalRentalRevenue: 0 },
            tournamentSummary: { totalTournamentsActive: 0, totalEntryFeesCollected: 0 },
            newCustomers: 0,
            activeCustomers: 0,
          };
          inMemoryDailyStats.push(doc);
        }

        if (update.$inc) {
          for (const [key, val] of Object.entries(update.$inc)) {
            const num = val as number;
            if (key === 'revenueSummary.grossRevenue') doc.revenueSummary.grossRevenue += num;
            else if (key === 'revenueSummary.discountAmount') doc.revenueSummary.discountAmount += num;
            else if (key === 'revenueSummary.refundAmount') doc.revenueSummary.refundAmount += num;
            else if (key === 'revenueSummary.netRevenue') doc.revenueSummary.netRevenue += num;
            else if (key.startsWith('revenueByService.')) {
              const parts = key.split('.');
              const srv = parts[1]!;
              const field = parts[2]!;
              const current = doc.revenueByService.get(srv) || { grossRevenue: 0, discountAmount: 0, refundAmount: 0, netRevenue: 0 };
              current[field] = (current[field] || 0) + num;
              doc.revenueByService.set(srv, current);
            } else if (key.startsWith('revenueByPaymentMethod.')) {
              const method = key.split('.')[1]!;
              doc.revenueByPaymentMethod.set(method, (doc.revenueByPaymentMethod.get(method) || 0) + num);
            }
          }
        }

        if (update.$set) {
          Object.assign(doc, update.$set);
        }

        return { exec: jest.fn().mockResolvedValue({ ...doc }) };
      }),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(inMemoryDailyStats.find((d) => d.date === query.date) || null),
      })),
    };

    const mockPaymentModel: any = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryPayments.filter((p) => {
            if (query.status && p.status !== query.status) return false;
            if (query.createdAt?.$gte && p.createdAt < query.createdAt.$gte) return false;
            if (query.createdAt?.$lte && p.createdAt > query.createdAt.$lte) return false;
            return true;
          }),
        ),
      })),
    };

    const mockBookingModel: any = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryBookings),
      })),
    };

    const mockCanteenOrderModel: any = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryCanteenOrders),
      })),
    };

    const mockRentalTicketModel: any = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryRentals),
      })),
    };

    const mockGamingSessionModel: any = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryGamingSessions),
      })),
    };

    const mockGymAccessEventModel: any = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryGymEvents),
      })),
    };

    const mockUserModel: any = {
      countDocuments: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryUsers.length),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsService,
        { provide: getModelToken(DailyStats.name), useValue: mockDailyStatsModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(CanteenOrder.name), useValue: mockCanteenOrderModel },
        { provide: getModelToken(RentalTicket.name), useValue: mockRentalTicketModel },
        { provide: getModelToken(GamingSession.name), useValue: mockGamingSessionModel },
        { provide: getModelToken(GymAccessEvent.name), useValue: mockGymAccessEventModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<DailyStatsService>(DailyStatsService);
  });

  describe('recordRevenueEvent', () => {
    it('should atomically increment daily stats with mathematical integrity (netRevenue = gross - discount - refund)', async () => {
      const date = '2026-10-26';

      await service.recordRevenueEvent({
        date,
        serviceType: 'COURT_BOOKING',
        grossRevenue: 500000,
        discountAmount: 50000,
        refundAmount: 0,
        paymentMethod: PaymentMethod.VIETQR,
      });

      await service.recordRevenueEvent({
        date,
        serviceType: 'CANTEEN',
        grossRevenue: 120000,
        discountAmount: 0,
        refundAmount: 20000,
        paymentMethod: PaymentMethod.CASH,
      });

      const stats = inMemoryDailyStats[0];
      expect(stats).toBeDefined();

      // Total gross = 500k + 120k = 620k
      expect(stats.revenueSummary.grossRevenue).toBe(620000);
      // Total discount = 50k
      expect(stats.revenueSummary.discountAmount).toBe(50000);
      // Total refund = 20k
      expect(stats.revenueSummary.refundAmount).toBe(20000);
      // Total net = 620k - 50k - 20k = 550k
      expect(stats.revenueSummary.netRevenue).toBe(550000);

      // By Service
      const courtBooking = stats.revenueByService.get('COURT_BOOKING');
      expect(courtBooking.grossRevenue).toBe(500000);
      expect(courtBooking.netRevenue).toBe(450000);

      const canteen = stats.revenueByService.get('CANTEEN');
      expect(canteen.grossRevenue).toBe(120000);
      expect(canteen.netRevenue).toBe(100000);

      // By Payment Method
      expect(stats.revenueByPaymentMethod.get(PaymentMethod.VIETQR)).toBe(500000);
      expect(stats.revenueByPaymentMethod.get(PaymentMethod.CASH)).toBe(120000);
    });

    it('should reject invalid non-safe integer or negative amounts', async () => {
      await expect(
        service.recordRevenueEvent({
          date: '2026-10-26',
          serviceType: 'COURT_BOOKING',
          grossRevenue: -10000,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordRevenueEvent({
          date: '2026-10-26',
          serviceType: 'COURT_BOOKING',
          grossRevenue: 10000.5,
        }),
      ).rejects.toThrow(/safe integer/);
    });
  });

  describe('recalculateDailyStats', () => {
    it('should aggregate source data into accurate DailyStats for the day', async () => {
      const date = '2026-10-26';
      const dayStart = new Date(`${date}T00:00:00.000Z`);

      // Mock live data for that day
      inMemoryPayments.push(
        {
          createdAt: new Date(`${date}T10:00:00.000Z`),
          status: PaymentStatus.SUCCESS,
          amount: 300000,
          paidAmount: 300000,
          orderType: PaymentOrderType.BOOKING,
          method: PaymentMethod.VIETQR,
        },
        {
          createdAt: new Date(`${date}T14:00:00.000Z`),
          status: PaymentStatus.SUCCESS,
          amount: 50000,
          paidAmount: 50000,
          orderType: PaymentOrderType.CANTEEN_ORDER,
          method: PaymentMethod.CASH,
        },
      );

      inMemoryBookings.push(
        {
          createdAt: dayStart,
          slotIndices: [16, 17], // 2 slots = 60m
          status: BookingStatus.CONFIRMED,
        },
        {
          createdAt: dayStart,
          slotIndices: [18, 19, 20], // 3 slots = 90m
          status: BookingStatus.CANCELLED,
        },
      );

      inMemoryGymEvents.push({
        occurredAt: dayStart,
        type: GymAccessType.CHECK_IN,
      });

      inMemoryGamingSessions.push({
        startedAt: dayStart,
        totalPlayedMinutes: 120,
        actualUsageAmount: 80000,
      });

      inMemoryCanteenOrders.push({
        createdAt: dayStart,
        totalAmount: 50000,
      });

      inMemoryRentals.push({
        createdAt: dayStart,
        totalRentalAmount: 40000,
      });

      inMemoryUsers.push({
        createdAt: dayStart,
      });

      const result = await service.recalculateDailyStats(date);

      expect(result).toBeDefined();
      expect(result.revenueSummary.grossRevenue).toBe(350000);
      expect(result.revenueSummary.netRevenue).toBe(350000);
      expect(result.bookingSummary.totalBookings).toBe(2);
      expect(result.bookingSummary.completedBookings).toBe(1);
      expect(result.bookingSummary.cancelledBookings).toBe(1);
      expect(result.bookingSummary.totalMinutes).toBe(150);
      expect(result.gymSummary.totalCheckIns).toBe(1);
      expect(result.gamingSummary.totalSessions).toBe(1);
      expect(result.gamingSummary.totalPlayMinutes).toBe(120);
      expect(result.canteenSummary.totalOrders).toBe(1);
      expect(result.canteenSummary.totalSales).toBe(50000);
      expect(result.rentalSummary.totalRentals).toBe(1);
      expect(result.rentalSummary.totalRentalRevenue).toBe(40000);
      expect(result.newCustomers).toBe(1);
    });

    it('should reject invalid date format', async () => {
      await expect(service.recalculateDailyStats('26-10-2026')).rejects.toThrow(
        /Invalid date format/,
      );
    });
  });
});
