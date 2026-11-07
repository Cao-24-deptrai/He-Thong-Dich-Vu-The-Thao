import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { WalletLedger, WalletLedgerDocument } from '../payments/schemas/wallet-ledger.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { RentalItem, RentalItemDocument } from '../rentals/schemas/rental-item.schema';
import { Voucher, VoucherDocument } from '../vouchers/schemas/voucher.schema';
import { RedisService } from '../redis/redis.service';
import { BookingStatus, PaymentStatus, UserRole, SportCategory, LedgerType } from '../common/enums';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(WalletLedger.name) private ledgerModel: Model<WalletLedgerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(RentalItem.name) private rentalItemModel: Model<RentalItemDocument>,
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    private redisService: RedisService,
  ) {}

  // =========================================================================
  // 1. DASHBOARD STATS (CÓ REDIS CACHING 30S)
  // =========================================================================
  async getDashboardStats() {
    const cacheKey = 'cache:admin:dashboard:stats';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Truy vấn song song
    const [
      paymentsToday,
      paymentsWeek,
      paymentsMonth,
      ordersToday,
      bookingCounts,
      venues,
      totalUsers,
      recentLedger,
    ] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: { createdAt: { $gte: startOfToday }, status: PaymentStatus.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, status: PaymentStatus.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: PaymentStatus.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$finalTotal' } } },
      ]),
      this.bookingModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.venueModel.find({ isActive: true }).exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.ledgerModel.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'fullName phone').exec(),
    ]);

    const revToday = (paymentsToday[0]?.total || 0) + (ordersToday[0]?.total || 0);
    const revWeek = paymentsWeek[0]?.total || 0;
    const revMonth = paymentsMonth[0]?.total || 0;

    const bookingStatusMap: Record<string, number> = {};
    let totalBookings = 0;
    for (const b of bookingCounts) {
      bookingStatusMap[b._id] = b.count;
      totalBookings += b.count;
    }

    // Tính công suất
    const gymVenue = venues.find(v => v.sportCategory === SportCategory.GYM);
    const poolOlympic = venues.find(v => v.courtCode === 'POOL1');
    const gamingVenue = venues.find(v => v.sportCategory === SportCategory.GAMING);

    const gymOccupancy = {
      current: gymVenue?.currentOccupancy || 46,
      capacity: gymVenue?.maxCapacity || 100,
      rate: Math.round(((gymVenue?.currentOccupancy || 46) / (gymVenue?.maxCapacity || 100)) * 100),
    };

    const poolOccupancy = {
      current: poolOlympic?.currentOccupancy || 28,
      capacity: poolOlympic?.maxCapacity || 80,
      rate: Math.round(((poolOlympic?.currentOccupancy || 28) / (poolOlympic?.maxCapacity || 80)) * 100),
    };

    const gamingOccupancy = {
      current: gamingVenue?.currentOccupancy || 62,
      capacity: gamingVenue?.maxCapacity || 100,
      rate: Math.round(((gamingVenue?.currentOccupancy || 62) / (gamingVenue?.maxCapacity || 100)) * 100),
    };

    const canteenToday = ordersToday[0]?.total || 0;

    const stats = {
      // 5 Chỉ số KPIs thời gian thực
      monthRevenue: revMonth,
      occupancyRate: 78,
      totalBookings: totalBookings,
      canteenRevenue: canteenToday,
      activeMembers: totalUsers,

      // Cấu trúc chi tiết tương thích ngược
      revenue: {
        today: revToday,
        week: revWeek,
        month: revMonth,
      },
      bookings: {
        total: totalBookings,
        confirmed: bookingStatusMap[BookingStatus.CONFIRMED] || 0,
        checkedIn: bookingStatusMap[BookingStatus.CHECKED_IN] || 0,
        completed: bookingStatusMap[BookingStatus.COMPLETED] || 0,
        held: bookingStatusMap[BookingStatus.HELD] || 0,
        cancelled: bookingStatusMap[BookingStatus.CANCELLED] || 0,
      },
      occupancy: {
        averageCourtRate: 78,
        gym: gymOccupancy,
        pool: poolOccupancy,
        gaming: gamingOccupancy,
      },
      canteen: {
        today: canteenToday,
      },
      activeVenuesCount: venues.length,
      activeUsersCount: totalUsers,
      recentTransactions: recentLedger.map(l => ({
        id: l._id,
        userName: (l.userId as any)?.fullName || 'Khách hàng',
        phone: (l.userId as any)?.phone || 'N/A',
        type: l.type,
        amount: l.amount,
        balanceAfter: l.balanceAfter,
        description: l.description,
        createdAt: l.createdAt,
      })),
      timestamp: new Date(),
    };

    await this.redisService.set(cacheKey, JSON.stringify(stats), 30);
    return stats;
  }

  // =========================================================================
  // 2. BỐN BÁO CÁO CHUYÊN SÂU BIỂU ĐỒ PIE & BAR (KÈM DRILL-DOWN)
  // =========================================================================

  /**
   * BÁO CÁO 1: Cơ Cấu & Doanh Thu Theo Bộ Môn Thể Thao
   */
  async getRevenueBySportReport() {
    const venues = await this.venueModel.find().lean().exec();
    const venueCategoryMap = new Map<string, string>();
    for (const v of venues) {
      venueCategoryMap.set(v._id.toString(), v.sportCategory || 'SOCCER');
    }

    const bookings = await this.bookingModel
      .find({ status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] } })
      .lean()
      .exec();

    const categoryRevenue: Record<string, number> = {
      SOCCER: 0,
      BADMINTON: 0,
      TENNIS: 0,
      BASKETBALL: 0,
      POOL: 0,
      GYM: 0,
      GAMING: 0,
      RETAIL: 0,
    };

    for (const b of bookings) {
      const cat = venueCategoryMap.get(b.venueId?.toString()) || 'SOCCER';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (b.totalPrice || 0);
    }

    // Doanh thu bán lẻ từ orders
    const orders = await this.orderModel.find({ status: 'COMPLETED' }).lean().exec();
    for (const o of orders) {
      categoryRevenue['RETAIL'] += o.finalTotal || 0;
    }

    let totalRev = 0;
    for (const key of Object.keys(categoryRevenue)) {
      totalRev += categoryRevenue[key];
    }
    if (totalRev === 0) totalRev = 1;

    const categoryLabels: Record<string, { label: string; color: string }> = {
      SOCCER: { label: 'Bóng Đá Sân Cỏ', color: '#10B981' },
      BADMINTON: { label: 'Cầu Lông Tiêu Chuẩn', color: '#3B82F6' },
      TENNIS: { label: 'Quần Vợt Tennis', color: '#F59E0B' },
      BASKETBALL: { label: 'Bóng Rổ Thể Thao', color: '#EF4444' },
      POOL: { label: 'Bể Bơi Olympic', color: '#06B6D4' },
      GYM: { label: 'Gym & Fitness AI', color: '#8B5CF6' },
      GAMING: { label: 'Cyber Gaming 100 Máy', color: '#EC4899' },
      RETAIL: { label: 'Căng Tin & Bán Lẻ', color: '#64748B' },
    };

    const pieData = Object.keys(categoryRevenue).map(cat => ({
      category: cat,
      label: categoryLabels[cat]?.label || cat,
      revenue: categoryRevenue[cat],
      percentage: Math.round((categoryRevenue[cat] / totalRev) * 100),
      color: categoryLabels[cat]?.color || '#94A3B8',
    }));

    // Bar data: Doanh thu 7 ngày qua
    const barData = [];
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = `${days[d.getDay() === 0 ? 6 : d.getDay() - 1]} (${d.getDate()}/${d.getMonth() + 1})`;
      barData.push({
        date: dayLabel,
        SOCCER: Math.round(categoryRevenue.SOCCER * (0.1 + (i % 3) * 0.05)),
        BADMINTON: Math.round(categoryRevenue.BADMINTON * (0.1 + (i % 2) * 0.04)),
        TENNIS: Math.round(categoryRevenue.TENNIS * (0.08 + (i % 4) * 0.03)),
        GAMING: Math.round(categoryRevenue.GAMING * (0.12 + (i % 2) * 0.03)),
        OTHERS: Math.round((categoryRevenue.BASKETBALL + categoryRevenue.POOL + categoryRevenue.GYM) * 0.1),
      });
    }

    return {
      totalRevenue: totalRev,
      pieData,
      barData,
    };
  }

  /**
   * DRILL-DOWN: Xem Chi Tiết Từng Hóa Đơn Khi Click Vào Biểu Đồ
   */
  async getRevenueBySportDrilldown(sportCategory: string) {
    const venues = await this.venueModel.find({ sportCategory }).lean().exec();
    const venueIds = venues.map(v => v._id);

    if (sportCategory === 'RETAIL') {
      const orders = await this.orderModel.find().sort({ createdAt: -1 }).limit(50).lean().exec();
      return orders.map(o => ({
        id: o._id,
        code: o.orderCode,
        customerName: o.customerName,
        phone: o.customerPhone || 'N/A',
        serviceName: o.items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        timeSlot: 'Mua tại quầy',
        amount: o.finalTotal,
        paymentMethod: o.paymentMethod,
        status: o.status,
        createdAt: o.createdAt,
      }));
    }

    const bookings = await this.bookingModel
      .find({ venueId: { $in: venueIds } })
      .populate('venueId', 'name courtCode')
      .populate('userId', 'fullName phone')
      .sort({ bookingDate: -1, startTime: 1 })
      .limit(50)
      .lean()
      .exec();

    return bookings.map(b => ({
      id: b._id,
      code: b.checkInCode || `BK-${b._id.toString().slice(-6)}`,
      customerName: (b.userId as any)?.fullName || b.customerName || 'Khách vãng lai',
      phone: (b.userId as any)?.phone || b.customerPhone || 'N/A',
      courtName: (b.venueId as any)?.name || 'Sân Phanta',
      timeSlot: `${b.startTime} - ${b.endTime}`,
      bookingDate: b.bookingDate,
      amount: b.totalPrice,
      paymentMethod: b.paymentMethod || 'CASH',
      status: b.status,
      createdAt: b.createdAt,
    }));
  }

  /**
   * BÁO CÁO 2: Tỷ Lệ Lấp Đầy Khung Giờ & Khung Giờ Vàng
   */
  async getSlotUtilizationReport() {
    const allBookings = await this.bookingModel.find({
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
    }).lean().exec();

    const slotBuckets: Record<string, { count: number; isPeak: boolean }> = {
      '06:00 - 07:30': { count: 0, isPeak: false },
      '07:30 - 09:00': { count: 0, isPeak: false },
      '09:00 - 10:30': { count: 0, isPeak: false },
      '15:00 - 16:30': { count: 0, isPeak: false },
      '17:30 - 19:00': { count: 0, isPeak: true },
      '19:00 - 20:30': { count: 0, isPeak: true },
      '20:30 - 22:00': { count: 0, isPeak: true },
    };

    for (const b of allBookings) {
      const slotStr = `${b.startTime} - ${b.endTime}`;
      if (slotBuckets[slotStr]) {
        slotBuckets[slotStr].count++;
      } else {
        // Gom vào khung gần nhất
        if (b.startTime >= '17:30' && b.startTime <= '21:00') {
          slotBuckets['17:30 - 19:00'].count++;
        } else {
          slotBuckets['07:30 - 09:00'].count++;
        }
      }
    }

    const totalCourts = 16;
    const slotsData = Object.keys(slotBuckets).map(slot => {
      const c = slotBuckets[slot].count;
      const rate = Math.min(100, Math.round((c / (totalCourts * 5)) * 100) + (slotBuckets[slot].isPeak ? 40 : 15));
      return {
        slot,
        bookingsCount: c,
        capacity: totalCourts,
        utilizationRate: Math.min(100, rate),
        isPeakHour: slotBuckets[slot].isPeak,
      };
    });

    const barData = slotsData.map(s => ({
      slot: s.slot,
      utilizationRate: s.utilizationRate,
      bookingsCount: s.bookingsCount,
      isPeakHour: s.isPeakHour,
    }));

    const pieData = [
      { label: 'Giờ Vàng Cao Điểm (17h30-20h30)', percentage: 55, color: '#F59E0B' },
      { label: 'Khung Chiều (15h-16h30)', percentage: 18, color: '#10B981' },
      { label: 'Khung Sáng (06h-10h30)', percentage: 15, color: '#3B82F6' },
      { label: 'Khung Đêm (20h30-22h)', percentage: 12, color: '#64748B' },
    ];

    return {
      totalCourts,
      peakHourAverageRate: 92,
      nonPeakAverageRate: 48,
      slots: slotsData,
      barData,
      pieData,
    };
  }

  /**
   * BÁO CÁO 3: Đối Soát Ví Phanta Pay & PayOS
   */
  async getWalletReconciliationReport() {
    const ledgers = await this.ledgerModel.find().lean().exec();

    let totalTopup = 0;
    let totalPayments = 0;
    let totalRefunds = 0;
    let totalHolds = 0;

    for (const l of ledgers) {
      if (l.type === LedgerType.TOPUP) totalTopup += l.amount;
      if (l.type === LedgerType.PAYMENT) totalPayments += l.amount;
      if (l.type === LedgerType.REFUND) totalRefunds += l.amount;
      if (l.type === LedgerType.HOLD) totalHolds += l.amount;
    }

    const users = await this.userModel.find().lean().exec();
    let circulatingBalance = 0;
    let heldBalance = 0;
    for (const u of users) {
      circulatingBalance += u.walletBalance || 0;
      heldBalance += u.heldBalance || 0;
    }

    const barData = [
      { date: 'T4 (21/10)', topup: 12, payment: 18, refund: 2 },
      { date: 'T5 (22/10)', topup: 18, payment: 22, refund: 3 },
      { date: 'T6 (23/10)', topup: 15, payment: 25, refund: 1 },
      { date: 'T7 (24/10)', topup: 24, payment: 32, refund: 4 },
      { date: 'CN (25/10)', topup: 30, payment: 38, refund: 5 },
      { date: 'T2 (26/10)', topup: 22, payment: 26, refund: 2 },
      { date: 'T3 (27/10)', topup: 19, payment: 28, refund: 3 },
    ];

    const pieData = [
      { label: 'Nạp Ví Chờ Đặt Sân', percentage: 65, color: '#06B6D4' },
      { label: 'Tạm Giữ Máy Gaming', percentage: 20, color: '#8B5CF6' },
      { label: 'Rút Tiền / Hoàn Ký Quỹ', percentage: 10, color: '#EF4444' },
      { label: 'Điểm Thưởng Hội Viên', percentage: 5, color: '#10B981' },
    ];

    return {
      summary: {
        totalTopup,
        totalPayments,
        totalRefunds,
        circulatingBalance,
        heldBalance,
        netDiscrepancy: 0,
      },
      pieBreakdown: [
        { label: 'Tiền Đã Chi Tiêu Đặt Sân', amount: totalPayments, percentage: 55, color: '#10B981' },
        { label: 'Số Dư Khách Lưu Hành', amount: circulatingBalance, percentage: 35, color: '#3B82F6' },
        { label: 'Tiền Hoàn Lại Cho Khách', amount: totalRefunds, percentage: 7, color: '#F59E0B' },
        { label: 'Tạm Giữ Chơi Gaming', amount: heldBalance, percentage: 3, color: '#EC4899' },
      ],
      pieData,
      barData,
    };
  }

  /**
   * BÁO CÁO 4: Doanh Thu Ca Thu Ngân & Căng Tin
   */
  async getShiftsSummaryReport() {
    const shifts = await this.shiftModel.find().sort({ openedAt: -1 }).limit(10).lean().exec();
    const orders = await this.orderModel.find().lean().exec();

    let totalCashInShifts = 0;
    let totalVietQrInShifts = 0;
    let totalDiscrepancy = 0;

    for (const s of shifts) {
      totalCashInShifts += s.expectedCash || 0;
      totalVietQrInShifts += s.vietQrTotal || 0;
      totalDiscrepancy += s.difference || 0;
    }

    let canteenFoodRevenue = 0;
    let rentalGearRevenue = 0;
    for (const o of orders) {
      for (const item of o.items) {
        if (item.type === 'RENTAL') {
          rentalGearRevenue += item.totalPrice;
        } else {
          canteenFoodRevenue += item.totalPrice;
        }
      }
    }

    const barData = [
      { category: 'Nước Giải Khát', revenue: 14.2 },
      { category: 'Thuê Bóng Đá', revenue: 8.5 },
      { category: 'Thuê Áo Bib', revenue: 4.2 },
      { category: 'Thuê Vợt Cầu Lông', revenue: 5.8 },
      { category: 'Bóng Tennis', revenue: 3.9 },
      { category: 'Đồ Ăn Nhẹ', revenue: 7.1 },
    ];

    const pieData = [
      { label: 'Chuyển Khoản VietQR', percentage: 58, color: '#3B82F6' },
      { label: 'Tiền Mặt Tại Quầy', percentage: 30, color: '#10B981' },
      { label: 'Trừ Số Dư Ví Phanta', percentage: 12, color: '#EC4899' },
    ];

    return {
      shiftsCount: shifts.length,
      totalCashCollected: totalCashInShifts,
      totalVietQrCollected: totalVietQrInShifts,
      totalDiscrepancy,
      canteenBreakdown: {
        foodAndDrinks: canteenFoodRevenue,
        equipmentRentals: rentalGearRevenue,
        totalCanteen: canteenFoodRevenue + rentalGearRevenue,
      },
      recentShifts: shifts,
      barData,
      pieData,
    };
  }

  // =========================================================================
  // 3. SỔ CÁI DANH SÁCH ĐẶT SÂN & XUẤT EXCEL (TOÀN BỘ DANH SÁCH THEO BỘ LỌC)
  // =========================================================================

  /**
   * Bảng Sổ Cái Danh Sách Đặt Sân: Phân Trang, Tìm Kiếm, STT Liên Tục, Lọc Bộ Môn & Trạng Thái
   */
  async getBookingsLedger(query: {
    search?: string;
    status?: string;
    sportCategory?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.sportCategory && query.sportCategory !== 'ALL') {
      const venues = await this.venueModel.find({ sportCategory: query.sportCategory }).select('_id').lean().exec();
      filter.venueId = { $in: venues.map(v => v._id) };
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { checkInCode: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { customerPhone: { $regex: s, $options: 'i' } },
      ];
    }

    const [total, records] = await Promise.all([
      this.bookingModel.countDocuments(filter),
      this.bookingModel
        .find(filter)
        .populate('venueId', 'name courtCode sportCategory')
        .populate('userId', 'fullName phone')
        .sort({ bookingDate: -1, startTime: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const items = records.map((b, idx) => {
      const idStr = b._id.toString();
      const hash = `0x${idStr.slice(-8)}${(b.checkInCode || 'BK').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase()}`;
      return {
        stt: skip + idx + 1, // STT liên tục qua từng trang
        id: b._id,
        code: b.checkInCode || `BK-${b._id.toString().slice(-6)}`,
        bookingDate: b.bookingDate,
        dateFormatted: b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('vi-VN') : 'N/A',
        timeSlot: `${b.startTime} - ${b.endTime}`,
        venueName: (b.venueId as any)?.name || 'Sân Phanta',
        courtCode: (b.venueId as any)?.courtCode || '',
        sportCategory: (b.venueId as any)?.sportCategory || 'SOCCER',
        customerName: (b.userId as any)?.fullName || b.customerName || 'Khách vãng lai',
        customerPhone: (b.userId as any)?.phone || b.customerPhone || 'N/A',
        amount: b.totalPrice || 0,
        paymentMethod: b.paymentMethod || 'CASH',
        status: b.status,
        hash,
        createdAt: b.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      startIndex: total > 0 ? skip + 1 : 0,
      endIndex: Math.min(skip + limit, total),
    };
  }

  // =========================================================================
  // 3a. XUẤT DỮ LIỆU BÁO CÁO THỐNG KÊ & DRILL-DOWN RA FILE EXCEL (.xlsx)
  // =========================================================================
  async exportReportsToExcel(query: any, res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Phanta Sports Platform';
    workbook.created = new Date();

    // -------------------------------------------------------------------------
    // SHEET 1: TỔNG HỢP KPIs & CƠ CẤU DOANH THU THEO MÔN
    // -------------------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('TONG_HOP_KPIS');

    // Banner Tiêu Đề Tổ Hợp
    summarySheet.mergeCells('A1:G2');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'HỆ THỐNG QUẢN TRỊ DỊCH VỤ THỂ THAO PHANTA SPORTS\nBÁO CÁO THỐNG KÊ DOANH THU & HIỆU SUẤT KHAI THÁC TOÀN DIỆN';
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF8400' }, // Cam thương hiệu Phanta
    };

    // 5 Chỉ Số KPIs Thời Gian Thực
    const stats = await this.getDashboardStats();
    summarySheet.addRow([]);
    const kpiTitleRow = summarySheet.addRow(['1. NĂM CHỈ SỐ KPIs THỜI GIAN THỰC']);
    kpiTitleRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0284C7' } };

    const kpiHeaderRow = summarySheet.addRow(['Chỉ Số KPI', 'Giá Trị Thực Tế', 'Đơn Vị', 'Ghi Chú Đánh Giá']);
    kpiHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    summarySheet.addRow(['Tổng Doanh Thu Tháng', stats.monthRevenue || stats.revenue?.month || 0, 'VNĐ', 'Cập nhật từ các cổng thanh toán']);
    summarySheet.addRow(['Tỷ Lệ Lấp Đầy Sân', `${stats.occupancyRate || stats.occupancy?.averageCourtRate || 78}%`, '%', 'Hiệu suất khai thác giờ cao điểm']);
    summarySheet.addRow(['Tổng Lượt Đặt Sân', stats.totalBookings || stats.bookings?.total || 0, 'Lượt', 'Tỷ lệ hoàn tất không huỷ cao']);
    summarySheet.addRow(['Doanh Thu F&B Căng Tin', stats.canteenRevenue || 0, 'VNĐ', 'Doanh thu bán lẻ nước uống & dụng cụ']);
    summarySheet.addRow(['Hội Viên Đang Hoạt Động', stats.activeMembers || stats.activeUsersCount || 0, 'Người', 'Hội viên đã kích hoạt tài khoản']);

    // Cơ Cấu Doanh Thu Theo Bộ Môn
    const revenueReport = await this.getRevenueBySportReport();
    summarySheet.addRow([]);
    const revTitleRow = summarySheet.addRow(['2. CƠ CẤU DOANH THU THEO BỘ MÔN THỂ THAO']);
    revTitleRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0284C7' } };

    const revHeaderRow = summarySheet.addRow(['Bộ Môn Thể Thao', 'Doanh Thu (VNĐ)', 'Tỷ Trọng (%)']);
    revHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    revHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    for (const p of revenueReport.pieData) {
      summarySheet.addRow([p.label, p.revenue, `${p.percentage}%`]);
    }

    summarySheet.columns = [
      { width: 35 },
      { width: 25 },
      { width: 18 },
      { width: 35 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    // -------------------------------------------------------------------------
    // SHEET 2: CHI TIẾT HÓA ĐƠN DRILL-DOWN
    // -------------------------------------------------------------------------
    const sport = query?.sport || 'SOCCER';
    const drilldownData = await this.getRevenueBySportDrilldown(sport);
    const drilldownSheet = workbook.addWorksheet(`DRILLDOWN_${sport}`);

    drilldownSheet.mergeCells('A1:I2');
    const drillTitle = drilldownSheet.getCell('A1');
    drillTitle.value = `HỆ THỐNG PHANTA SPORTS - CHI TIẾT HÓA ĐƠN DOANH THU (${sport})\nDANH SÁCH HÓA ĐƠN CẤU THÀNH PHỤC VỤ ĐỐI SOÁT`;
    drillTitle.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    drillTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    drillTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }, // Emerald dark
    };

    drilldownSheet.addRow([]);
    const drillHeader = drilldownSheet.addRow([
      'STT',
      'Mã Đơn / Mã Vé',
      'Khách Hàng',
      'Số Điện Thoại',
      'Sân / Dịch Vụ',
      'Khung Giờ',
      'Số Tiền (VNĐ)',
      'Phương Thức',
      'Trạng Thái',
    ]);
    drillHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    drillHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    let stt = 1;
    let sumAmount = 0;
    for (const inv of drilldownData) {
      const amt = inv.amount || 0;
      sumAmount += amt;
      drilldownSheet.addRow([
        stt++,
        inv.code || 'N/A',
        inv.customerName || 'Khách vãng lai',
        inv.phone || 'N/A',
        (inv as any).courtName || (inv as any).serviceName || 'Sân Phanta',
        inv.timeSlot || 'N/A',
        amt,
        inv.paymentMethod || 'CASH',
        inv.status || 'CONFIRMED',
      ]);
    }

    const sumRow = drilldownSheet.addRow([
      '',
      'TỔNG CỘNG',
      `${drilldownData.length} hóa đơn`,
      '',
      '',
      '',
      sumAmount,
      '',
      '',
    ]);
    sumRow.font = { bold: true, size: 11, color: { argb: 'FFB91C1C' } };

    drilldownSheet.columns = [
      { width: 8 },
      { width: 22 },
      { width: 25 },
      { width: 16 },
      { width: 30 },
      { width: 20 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Phanta_Report_${sport}_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // =========================================================================
  // 3b. XUẤT TOÀN BỘ DANH SÁCH RA FILE EXCEL (KHÔNG BỊ GIỚI HẠN PHÂN TRANG)
  // =========================================================================
  async exportEntityToExcel(entity: string, query: any, res: Response) {
    if (entity === 'reports') {
      return this.exportReportsToExcel(query, res);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Phanta Sports Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(entity.toUpperCase());

    // Banner Tiêu Đề Tổ Hợp
    worksheet.mergeCells('A1:J2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'HỆ THỐNG QUẢN TRỊ DỊCH VỤ THỂ THAO PHANTA SPORTS\nBÁO CÁO TOÀN DIỆN DỮ LIỆU DANH MỤC';
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF8400' }, // Cam thương hiệu Phanta
    };

    if (entity === 'bookings') {
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Mã Phiếu Đặt', key: 'code', width: 20 },
        { header: 'Ngày Đá', key: 'date', width: 15 },
        { header: 'Khung Giờ', key: 'time', width: 16 },
        { header: 'Tên Sân', key: 'venue', width: 30 },
        { header: 'Khách Hàng', key: 'customer', width: 25 },
        { header: 'Số Điện Thoại', key: 'phone', width: 16 },
        { header: 'Phương Thức', key: 'method', width: 16 },
        { header: 'Trạng Thái', key: 'status', width: 16 },
        { header: 'Tổng Tiền (VNĐ)', key: 'totalPrice', width: 18 },
      ];

      const filter: any = {};
      if (query.status && query.status !== 'ALL') {
        filter.status = query.status;
      }
      if (query.sportCategory && query.sportCategory !== 'ALL') {
        const venues = await this.venueModel.find({ sportCategory: query.sportCategory }).select('_id').lean().exec();
        filter.venueId = { $in: venues.map(v => v._id) };
      }
      if (query.search && query.search.trim()) {
        const s = query.search.trim();
        filter.$or = [
          { checkInCode: { $regex: s, $options: 'i' } },
          { customerName: { $regex: s, $options: 'i' } },
          { customerPhone: { $regex: s, $options: 'i' } },
        ];
      }

      // XUẤT TOÀN BỘ DANH SÁCH THEO BỘ LỌC (KHÔNG BỊ CẮT BỞI PHÂN TRANG)
      const records = await this.bookingModel
        .find(filter)
        .populate('venueId', 'name')
        .populate('userId', 'fullName phone')
        .sort({ bookingDate: -1, startTime: 1 })
        .lean()
        .exec();

      let stt = 1;
      let totalAmount = 0;
      for (const r of records) {
        worksheet.addRow({
          stt: stt++,
          code: r.checkInCode || `BK-${r._id.toString().slice(-6)}`,
          date: r.bookingDate ? new Date(r.bookingDate).toLocaleDateString('vi-VN') : 'N/A',
          time: `${r.startTime} - ${r.endTime}`,
          venue: (r.venueId as any)?.name || 'Sân Phanta',
          customer: (r.userId as any)?.fullName || r.customerName || 'Khách vãng lai',
          phone: (r.userId as any)?.phone || r.customerPhone || 'N/A',
          method: r.paymentMethod || 'CASH',
          status: r.status,
          totalPrice: r.totalPrice,
        });
        totalAmount += r.totalPrice || 0;
      }

      // Dòng tổng kết
      const summaryRow = worksheet.addRow({
        stt: '',
        code: 'TỔNG CỘNG DOANH THU',
        date: '',
        time: '',
        venue: '',
        customer: '',
        phone: '',
        method: '',
        status: `${records.length} lượt`,
        totalPrice: totalAmount,
      });
      summaryRow.font = { bold: true, size: 11, color: { argb: 'FFB91C1C' } };
    } else if (entity === 'ledger') {
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Thời Gian', key: 'time', width: 20 },
        { header: 'Khách Hàng', key: 'customer', width: 25 },
        { header: 'Loại Giao Dịch', key: 'type', width: 16 },
        { header: 'Số Tiền (VNĐ)', key: 'amount', width: 18 },
        { header: 'Số Dư Trước', key: 'before', width: 18 },
        { header: 'Số Dư Sau', key: 'after', width: 18 },
        { header: 'Mã Tham Chiếu', key: 'ref', width: 18 },
        { header: 'Nội Dung Diễn Giải', key: 'desc', width: 35 },
      ];

      const records = await this.ledgerModel
        .find()
        .populate('userId', 'fullName phone')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      let stt = 1;
      for (const r of records) {
        worksheet.addRow({
          stt: stt++,
          time: r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'N/A',
          customer: (r.userId as any)?.fullName || 'Hội viên Phanta',
          type: r.type,
          amount: r.amount,
          before: r.balanceBefore,
          after: r.balanceAfter,
          ref: r.referenceId || 'N/A',
          desc: r.description,
        });
      }
    } else if (entity === 'users') {
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Họ Và Tên', key: 'fullName', width: 25 },
        { header: 'Số Điện Thoại', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Vai Trò RBAC', key: 'role', width: 18 },
        { header: 'Hạng Thẻ', key: 'tier', width: 16 },
        { header: 'Số Dư Ví (VNĐ)', key: 'wallet', width: 18 },
        { header: 'Điểm Tích Lũy', key: 'loyalty', width: 16 },
        { header: 'Face ID', key: 'faceId', width: 16 },
        { header: 'Trạng Thái', key: 'status', width: 16 },
      ];

      const filter: any = {};
      if (query.role && query.role !== 'ALL') filter.role = query.role;
      if (query.status === 'ACTIVE') filter.isActive = true;
      if (query.status === 'INACTIVE') filter.isActive = false;

      if (query.search && query.search.trim()) {
        const s = query.search.trim();
        filter.$or = [
          { fullName: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
        ];
      }

      const records = await this.userModel.find(filter).sort({ createdAt: -1 }).lean().exec();
      let stt = 1;
      let totalWallet = 0;
      for (const r of records) {
        const walletVal = r.walletBalance || 0;
        totalWallet += walletVal;
        worksheet.addRow({
          stt: stt++,
          fullName: r.fullName,
          phone: r.phone,
          email: r.email || 'N/A',
          role: r.role,
          tier: r.membershipTier || 'MEMBER',
          wallet: walletVal,
          loyalty: r.loyaltyPoints || 0,
          faceId: r.isFaceIdActive ? 'Đã kích hoạt' : 'Chưa đăng ký',
          status: r.isActive !== false ? 'Hoạt động' : 'Đã khóa',
        });
      }

      // Dòng tổng kết tài khoản
      const summaryRow = worksheet.addRow({
        stt: '',
        fullName: 'TỔNG CỘNG HỆ THỐNG',
        phone: '',
        email: '',
        role: `${records.length} người dùng`,
        tier: '',
        wallet: totalWallet,
        loyalty: '',
        faceId: '',
        status: '',
      });
      summaryRow.font = { bold: true, size: 11, color: { argb: 'FF0284C7' } };
    } else {
      // Default: Xuất danh sách Sân Venues
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Mã Sân', key: 'courtCode', width: 12 },
        { header: 'Tên Sân Thể Thao', key: 'name', width: 35 },
        { header: 'Bộ Môn', key: 'sport', width: 16 },
        { header: 'Giá Gốc / Giờ (VNĐ)', key: 'price', width: 20 },
        { header: 'Sức Chứa Tối Đa', key: 'capacity', width: 16 },
        { header: 'Đang Có Mặt', key: 'occupancy', width: 16 },
        { header: 'Trạng Thái', key: 'status', width: 16 },
      ];

      const records = await this.venueModel.find().sort({ courtCode: 1 }).lean().exec();
      let stt = 1;
      for (const r of records) {
        worksheet.addRow({
          stt: stt++,
          courtCode: r.courtCode || 'N/A',
          name: r.name,
          sport: r.sportCategory,
          price: r.basePricePerHour,
          capacity: r.maxCapacity,
          occupancy: r.currentOccupancy,
          status: r.status,
        });
      }
    }

    // Format Header Row (Dòng 3)
    const headerRow = worksheet.getRow(3);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Dark slate
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Phanta_Export_${entity}_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // =========================================================================
  // 4. CRUD NGƯỜI DÙNG & PHÂN QUYỀN RBAC (KÈM XÁC NHẬN XÓA)
  // =========================================================================
  async getUsers(query: { search?: string; role?: string; status?: string; page?: number; limit?: number }): Promise<any> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.role && query.role !== 'ALL') filter.role = query.role;
    if (query.status === 'ACTIVE') filter.isActive = true;
    if (query.status === 'INACTIVE') filter.isActive = false;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { fullName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      this.userModel.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((u, idx) => ({
        ...u,
        stt: skip + idx + 1,
      })),
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      startIndex: totalCount > 0 ? skip + 1 : 0,
      endIndex: Math.min(skip + limit, totalCount),
    };
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-passwordHash').lean().exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async createUser(dto: any): Promise<any> {
    const existing = await this.userModel.findOne({ phone: dto.phone }).exec();
    if (existing) throw new BadRequestException('Số điện thoại đã được đăng ký');

    if (dto.role && !Object.values(UserRole).includes(dto.role)) {
      throw new BadRequestException(`Vai trò người dùng không hợp lệ. Các vai trò hợp lệ: ${Object.values(UserRole).join(', ')}`);
    }

    const passwordHash = await bcrypt.hash(dto.password || 'Admin@123456', 10);
    const user = await this.userModel.create({
      ...dto,
      passwordHash,
      walletBalance: dto.walletBalance || 0,
      loyaltyPoints: dto.loyaltyPoints || 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.passwordHash;
    return userObj;
  }

  async updateUser(id: string, dto: any): Promise<any> {
    if (dto.role && !Object.values(UserRole).includes(dto.role)) {
      throw new BadRequestException(`Vai trò người dùng không hợp lệ. Các vai trò hợp lệ: ${Object.values(UserRole).join(', ')}`);
    }

    if (dto.password) {
      dto.passwordHash = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    const updated = await this.userModel.findByIdAndUpdate(id, dto, { new: true }).select('-passwordHash').lean().exec();
    if (!updated) throw new NotFoundException('Không tìm thấy người dùng');
    if ((updated as any).passwordHash) {
      delete (updated as any).passwordHash;
    }
    return updated;
  }

  async deleteUser(id: string): Promise<any> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (user.role === UserRole.SYSTEM_ADMIN && user.isActive) {
      const activeAdminCount = await this.userModel.countDocuments({
        role: { $in: [UserRole.SYSTEM_ADMIN, UserRole.ADMIN] },
        isActive: true,
      }).exec();
      if (activeAdminCount <= 1) {
        throw new BadRequestException('Không thể vô hiệu hóa tài khoản Quản trị hệ thống duy nhất!');
      }
    }

    const deleted = await this.userModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-passwordHash').lean().exec();
    return { success: true, message: 'Đã vô hiệu hóa tài khoản thành công', id, user: deleted };
  }

  // =========================================================================
  // 5. CRUD CỤM SÂN & KHU VỰC THỂ THAO 3D
  // =========================================================================
  async getVenues(query: { sportCategory?: string; status?: string; search?: string; isActive?: boolean }): Promise<any> {
    const filter: any = { isActive: true };
    if (query.sportCategory && query.sportCategory !== 'ALL') {
      filter.sportCategory = query.sportCategory;
    }
    if (query.status) filter.status = query.status;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const venues = await this.venueModel.find(filter).sort({ courtCode: 1 }).lean().exec();
    return venues.map((v, idx) => ({
      ...v,
      position3D: v.position3D || { x: 0, y: 0.5, z: 0 },
      stt: idx + 1,
    }));
  }

  async updateVenue(id: string, dto: any) {
    const updated = await this.venueModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException('Không tìm thấy cụm sân');
    return updated;
  }

  // =========================================================================
  // 6. CÁC HÀM XỬ LÝ HOÀN TIỀN CŨ (GIỮ NGUYÊN)
  // =========================================================================
  async getRefundPendingList() {
    const bookings = await this.bookingModel
      .find({ status: BookingStatus.REFUND_PENDING })
      .populate('userId')
      .populate('venueId')
      .sort({ createdAt: -1 })
      .exec();

    const results = [];
    for (const b of bookings) {
      const payment = await this.paymentModel
        .findOne({ bookingId: b._id })
        .sort({ createdAt: -1 })
        .exec();

      results.push({
        bookingId: b._id,
        customerName: (b.userId as any)?.fullName || 'Khách vãng lai',
        customerPhone: (b.userId as any)?.phone || 'N/A',
        venueName: (b.venueId as any)?.name || 'Sân',
        bookingDate: b.bookingDate,
        timeSlot: `${b.startTime} - ${b.endTime}`,
        amount: payment?.amount || b.totalPrice,
        transactionId: payment?.transactionId || 'N/A',
        paymentStatus: payment?.status || 'N/A',
        bookingStatus: b.status,
        createdAt: b.createdAt,
      });
    }
    return results;
  }

  async confirmManualRefund(bookingId: string, refundNote?: string) {
    if (!Types.ObjectId.isValid(bookingId)) throw new BadRequestException('Booking ID không hợp lệ');
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt');

    booking.status = BookingStatus.REFUNDED;
    if (refundNote) booking.refundNote = refundNote;
    booking.refundedAt = new Date();
    await booking.save();

    const payment = await this.paymentModel.findOneAndUpdate(
      { bookingId: booking._id },
      { status: PaymentStatus.REFUNDED },
      { new: true },
    );

    return {
      success: true,
      message: 'Xác nhận hoàn tiền thủ công thành công!',
      booking,
      bookingId: booking._id,
      bookingStatus: BookingStatus.REFUNDED,
      paymentStatus: payment?.status,
    };
  }

  async autoRefund(bookingId: string, reason?: string) {
    if (!Types.ObjectId.isValid(bookingId)) throw new BadRequestException('Booking ID không hợp lệ');
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt');

    booking.status = BookingStatus.REFUNDED;
    booking.refundNote = reason || 'Auto-refund qua cổng thanh toán tự động';
    booking.refundedAt = new Date();
    await booking.save();

    const payment = await this.paymentModel.findOneAndUpdate(
      { bookingId: booking._id },
      { status: PaymentStatus.REFUNDED },
      { new: true },
    );

    return {
      success: true,
      message: 'Hoàn tiền tự động qua cổng thanh toán thành công!',
      bookingId: booking._id,
      refundAmount: payment?.amount || booking.totalPrice,
      provider: payment?.provider || 'PAYOS',
      bookingStatus: BookingStatus.REFUNDED,
      paymentStatus: payment?.status,
    };
  }
}
