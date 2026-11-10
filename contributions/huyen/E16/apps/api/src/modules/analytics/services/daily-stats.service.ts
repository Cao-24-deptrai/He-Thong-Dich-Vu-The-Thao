import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyStats, DailyStatsDocument } from '../schemas/daily-stats.schema.js';
import { Payment, PaymentDocument } from '../../payment/schemas/payment.schema.js';
import { Booking, BookingDocument } from '../../booking/schemas/booking.schema.js';
import { CanteenOrder, CanteenOrderDocument } from '../../canteen/schemas/canteen-order.schema.js';
import { RentalTicket, RentalTicketDocument } from '../../rental/schemas/rental-ticket.schema.js';
import { GamingSession, GamingSessionDocument } from '../../gaming/schemas/gaming-session.schema.js';
import { GymAccessEvent, GymAccessEventDocument } from '../../gym/schemas/gym-access-event.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import {
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  GymAccessType,
} from '@sports/shared';

export interface RecordRevenueEventParams {
  date: string; // YYYY-MM-DD
  serviceType: string; // e.g. "COURT_BOOKING", "GYM_MEMBERSHIP", "CANTEEN", "GAMING", "RENTAL", "TOURNAMENT", "PT_CLASS"
  grossRevenue: number;
  discountAmount?: number;
  refundAmount?: number;
  paymentMethod?: PaymentMethod;
}

@Injectable()
export class DailyStatsService {
  private readonly logger = new Logger(DailyStatsService.name);

  constructor(
    @InjectModel(DailyStats.name)
    private readonly dailyStatsModel: Model<DailyStatsDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(CanteenOrder.name)
    private readonly canteenOrderModel: Model<CanteenOrderDocument>,
    @InjectModel(RentalTicket.name)
    private readonly rentalTicketModel: Model<RentalTicketDocument>,
    @InjectModel(GamingSession.name)
    private readonly gamingSessionModel: Model<GamingSessionDocument>,
    @InjectModel(GymAccessEvent.name)
    private readonly gymAccessEventModel: Model<GymAccessEventDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * F17.1: Ghi nhận gia tăng doanh thu theo thời gian thực (Atomic Incremental Update)
   */
  async recordRevenueEvent(params: RecordRevenueEventParams): Promise<DailyStatsDocument> {
    const gross = params.grossRevenue;
    const discount = params.discountAmount ?? 0;
    const refund = params.refundAmount ?? 0;

    if (!Number.isSafeInteger(gross) || gross < 0) {
      throw new BadRequestException('grossRevenue must be a non-negative safe integer VND');
    }
    if (!Number.isSafeInteger(discount) || discount < 0) {
      throw new BadRequestException('discountAmount must be a non-negative safe integer VND');
    }
    if (!Number.isSafeInteger(refund) || refund < 0) {
      throw new BadRequestException('refundAmount must be a non-negative safe integer VND');
    }

    const net = gross - discount - refund;

    const incQuery: Record<string, number> = {
      'revenueSummary.grossRevenue': gross,
      'revenueSummary.discountAmount': discount,
      'revenueSummary.refundAmount': refund,
      'revenueSummary.netRevenue': net,
      [`revenueByService.${params.serviceType}.grossRevenue`]: gross,
      [`revenueByService.${params.serviceType}.discountAmount`]: discount,
      [`revenueByService.${params.serviceType}.refundAmount`]: refund,
      [`revenueByService.${params.serviceType}.netRevenue`]: net,
    };

    if (params.paymentMethod) {
      incQuery[`revenueByPaymentMethod.${params.paymentMethod}`] = gross;
    }

    const updated = await this.dailyStatsModel.findOneAndUpdate(
      { date: params.date },
      { $inc: incQuery },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    return updated;
  }

  /**
   * F17.1: Tái tổng hợp số liệu ngày từ các nguồn dữ liệu gốc (Reconciliation Nightly Batch / On-demand)
   */
  async recalculateDailyStats(date: string): Promise<DailyStatsDocument> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // 1. Aggregate Payments
    const successfulPayments = await this.paymentModel.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: PaymentStatus.SUCCESS,
    }).exec();

    let grossRevenue = 0;
    const revenueByServiceMap = new Map<string, any>();
    const revenueByPaymentMethodMap = new Map<string, number>();

    for (const p of successfulPayments) {
      const amount = p.paidAmount || p.amount;
      grossRevenue += amount;

      // Group by orderType / service
      const service = p.orderType || 'OTHER';
      const existingService = revenueByServiceMap.get(service) || {
        grossRevenue: 0,
        discountAmount: 0,
        refundAmount: 0,
        netRevenue: 0,
      };
      existingService.grossRevenue += amount;
      existingService.netRevenue += amount;
      revenueByServiceMap.set(service, existingService);

      // Group by payment method
      const method = p.method || PaymentMethod.CASH;
      const existingMethodSum = revenueByPaymentMethodMap.get(method) || 0;
      revenueByPaymentMethodMap.set(method, existingMethodSum + amount);
    }

    // 2. Aggregate Bookings
    const bookings = await this.bookingModel.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).exec();

    let totalMinutes = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let noShowBookings = 0;

    for (const b of bookings) {
      const duration = (b.slotIndices?.length || 1) * 30;
      totalMinutes += duration;
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN) {
        completedBookings++;
      } else if (b.status === BookingStatus.CANCELLED) {
        cancelledBookings++;
      } else if (b.status === BookingStatus.NO_SHOW) {
        noShowBookings++;
      }
    }

    // 3. Aggregate Gym Check-ins
    const gymEvents = await this.gymAccessEventModel.find({
      occurredAt: { $gte: dayStart, $lte: dayEnd },
      type: GymAccessType.CHECK_IN,
    }).exec();

    // 4. Aggregate Gaming Sessions
    const gamingSessions = await this.gamingSessionModel.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
    }).exec();

    let totalPlayMinutes = 0;
    let standardRevenue = 0;
    let vipRevenue = 0;

    for (const s of gamingSessions) {
      const minutes = s.totalPlayedMinutes || 0;
      totalPlayMinutes += minutes;
      const revenue = s.actualUsageAmount || 0;
      if ((s as any).zone === 'VIP') {
        vipRevenue += revenue;
      } else {
        standardRevenue += revenue;
      }
    }

    // 5. Aggregate Canteen Orders
    const canteenOrders = await this.canteenOrderModel.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).exec();

    let totalCanteenSales = 0;
    for (const order of canteenOrders) {
      totalCanteenSales += order.totalAmount || 0;
    }

    // 6. Aggregate Rentals
    const rentals = await this.rentalTicketModel.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).exec();

    let totalRentalRevenue = 0;
    for (const r of rentals) {
      totalRentalRevenue += r.totalRentalAmount || 0;
    }

    // 7. Aggregate New Users
    const newUsersCount = await this.userModel.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).exec();

    // Build DailyStats document
    const updated = await this.dailyStatsModel.findOneAndUpdate(
      { date },
      {
        $set: {
          revenueSummary: {
            grossRevenue,
            discountAmount: 0,
            refundAmount: 0,
            netRevenue: grossRevenue,
          },
          revenueByService: Object.fromEntries(revenueByServiceMap),
          revenueByPaymentMethod: Object.fromEntries(revenueByPaymentMethodMap),
          bookingSummary: {
            totalBookings: bookings.length,
            totalMinutes,
            completedBookings,
            cancelledBookings,
            noShowBookings,
          },
          gymSummary: {
            totalCheckIns: gymEvents.length,
            newMemberships: 0,
            renewedMemberships: 0,
          },
          gamingSummary: {
            totalSessions: gamingSessions.length,
            totalPlayMinutes,
            standardRevenue,
            vipRevenue,
          },
          canteenSummary: {
            totalOrders: canteenOrders.length,
            totalSales: totalCanteenSales,
            totalCost: 0,
            grossProfit: totalCanteenSales,
          },
          rentalSummary: {
            totalRentals: rentals.length,
            totalRentalRevenue,
          },
          tournamentSummary: {
            totalTournamentsActive: 0,
            totalEntryFeesCollected: 0,
          },
          newCustomers: newUsersCount,
          activeCustomers: bookings.length + gymEvents.length + gamingSessions.length,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    this.logger.log(`Recalculated daily stats for ${date}: grossRevenue=${grossRevenue}`);
    return updated!;
  }
}
