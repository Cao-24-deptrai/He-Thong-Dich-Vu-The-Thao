import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { User, UserDocument } from './users/schemas/user.schema';
import { Facility, FacilityDocument } from './facilities/schemas/facility.schema';
import { Venue, VenueDocument } from './venues/schemas/venue.schema';
import { Booking, BookingDocument } from './bookings/schemas/booking.schema';
import { Payment, PaymentDocument } from './payments/schemas/payment.schema';
import { WalletLedger, WalletLedgerDocument } from './payments/schemas/wallet-ledger.schema';
import { Shift, ShiftDocument } from './shifts/schemas/shift.schema';
import { Order, OrderDocument } from './orders/schemas/order.schema';
import { RentalItem, RentalItemDocument } from './rentals/schemas/rental-item.schema';
import { Voucher, VoucherDocument } from './vouchers/schemas/voucher.schema';
import {
  UserRole,
  VenueType,
  SportCategory,
  BookingStatus,
  BookingSource,
  PaymentProvider,
  PaymentStatus,
  LedgerType,
  ShiftStatus,
  RentalItemType,
  DiscountType,
  OrderStatus,
  OrderItemType,
  MembershipTier,
} from './common/enums';

async function seed() {
  const logger = new Logger('PhantaSeed');
  logger.log('🚀 Khởi động nạp dữ liệu mẫu toàn diện cho Phanta Sports...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const facilityModel = app.get<Model<FacilityDocument>>(getModelToken(Facility.name));
  const venueModel = app.get<Model<VenueDocument>>(getModelToken(Venue.name));
  const bookingModel = app.get<Model<BookingDocument>>(getModelToken(Booking.name));
  const paymentModel = app.get<Model<PaymentDocument>>(getModelToken(Payment.name));
  const ledgerModel = app.get<Model<WalletLedgerDocument>>(getModelToken(WalletLedger.name));
  const shiftModel = app.get<Model<ShiftDocument>>(getModelToken(Shift.name));
  const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
  const rentalItemModel = app.get<Model<RentalItemDocument>>(getModelToken(RentalItem.name));
  const voucherModel = app.get<Model<VoucherDocument>>(getModelToken(Voucher.name));

  try {
    // -------------------------------------------------------------
    // 1. SEED TÀI KHOẢN NGƯỜI DÙNG (6 VAI TRÒ CHUẨN)
    // -------------------------------------------------------------
    logger.log('👤 Đang khởi tạo tài khoản theo 6 vai trò...');
    const defaultPassword = 'Admin@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const usersToSeed = [
      {
        phone: '0999999999',
        fullName: 'Quản Trị Viên Hệ Thống',
        email: 'admin@phanta.vn',
        role: UserRole.SYSTEM_ADMIN,
        walletBalance: 100000000,
        membershipTier: MembershipTier.PLATINUM,
        isFaceIdActive: true,
      },
      {
        phone: '0900000001',
        fullName: 'Phan Anh Tuấn (Chủ Cơ Sở)',
        email: 'owner@phanta.vn',
        role: UserRole.OWNER,
        walletBalance: 50000000,
        membershipTier: MembershipTier.PLATINUM,
        isFaceIdActive: true,
      },
      {
        phone: '0900000002',
        fullName: 'Lê Hoàng Quản Lý',
        email: 'manager@phanta.vn',
        role: UserRole.MANAGER,
        walletBalance: 10000000,
        membershipTier: MembershipTier.GOLD,
        isFaceIdActive: true,
      },
      {
        phone: '0900000003',
        fullName: 'Trần Thị Thu Ngân',
        email: 'cashier@phanta.vn',
        role: UserRole.CASHIER,
        walletBalance: 5000000,
        membershipTier: MembershipTier.SILVER,
        isFaceIdActive: true,
      },
      {
        phone: '0900000004',
        fullName: 'Nguyễn Văn Huấn Luyện Viên',
        email: 'pt@phanta.vn',
        role: UserRole.PT,
        walletBalance: 3000000,
        membershipTier: MembershipTier.GOLD,
        isFaceIdActive: true,
      },
      {
        phone: '0911223344',
        fullName: 'Nguyễn Văn Khách Hàng',
        email: 'customer@phanta.vn',
        role: UserRole.CUSTOMER,
        walletBalance: 2450000,
        heldBalance: 0,
        loyaltyPoints: 18500000,
        membershipTier: MembershipTier.GOLD,
        isFaceIdActive: true,
      },
      {
        phone: '0988888888',
        fullName: 'Nhân viên Quầy Vận Hành',
        email: 'staff@phanta.vn',
        role: UserRole.STAFF,
        walletBalance: 2000000,
        membershipTier: MembershipTier.MEMBER,
        isFaceIdActive: false,
      },
    ];

    const seededUsers: Record<string, UserDocument> = {};
    for (const u of usersToSeed) {
      let existing = await userModel.findOne({ phone: u.phone }).exec();
      if (!existing) {
        existing = await userModel.create({
          phone: u.phone,
          passwordHash,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          walletBalance: u.walletBalance,
          heldBalance: u.heldBalance || 0,
          loyaltyPoints: u.loyaltyPoints || 0,
          membershipTier: u.membershipTier,
          isFaceIdActive: u.isFaceIdActive,
          isActive: true,
        });
        logger.log(`  ➕ Tạo người dùng: ${u.fullName} (${u.role}) - ${u.phone}`);
      } else {
        existing.role = u.role;
        existing.walletBalance = u.walletBalance;
        existing.membershipTier = u.membershipTier;
        existing.isFaceIdActive = u.isFaceIdActive;
        await existing.save();
        logger.log(`  🔄 Cập nhật người dùng: ${u.fullName} (${u.role}) - ${u.phone}`);
      }
      seededUsers[u.phone] = existing;
    }

    const adminUser = seededUsers['0999999999'];
    const cashierUser = seededUsers['0900000003'];
    const customerUser = seededUsers['0911223344'];

    // -------------------------------------------------------------
    // 2. SEED CƠ SỞ VẬT CHẤT (TỔ HỢP THỂ THAO PHANTA)
    // -------------------------------------------------------------
    let facility = await facilityModel.findOne({ name: 'Tổ hợp Thể thao & Esports Phanta Olympic' }).exec();
    if (!facility) {
      facility = await facilityModel.create({
        name: 'Tổ hợp Thể thao & Esports Phanta Olympic',
        address: 'Số 1 Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
        location: {
          type: 'Point',
          coordinates: [105.7725, 21.0185],
        },
        sportTypes: ['FOOTBALL', 'BADMINTON', 'TENNIS', 'BASKETBALL', 'GYM', 'POOL', 'GAMING'],
        ownerId: seededUsers['0900000001']._id,
        isActive: true,
      });
      logger.log(`🏟️ Đã tạo cơ sở: ${facility.name}`);
    }

    // -------------------------------------------------------------
    // 3. SEED 16 CỤM SÂN & KHU VỰC THỂ THAO 3D
    // -------------------------------------------------------------
    logger.log('⚽ Đang khởi tạo 16 cụm sân & tọa độ 3D...');
    const venuesData = [
      // Bóng đá F1 - F8
      { courtCode: 'F1', name: 'Sân bóng mini F1 (Ghép Sân 7 & 11)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -44, y: 0.5, z: -20 }, maxCap: 14, curOcc: 10, status: 'AVAILABLE' },
      { courtCode: 'F2', name: 'Sân bóng mini F2 (Ghép Sân 7 & 11)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -32, y: 0.5, z: -20 }, maxCap: 14, curOcc: 14, status: 'OCCUPIED' },
      { courtCode: 'F3', name: 'Sân bóng mini F3 (Ghép Sân 7 & 11)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -44, y: 0.5, z: -10 }, maxCap: 14, curOcc: 0, status: 'AVAILABLE' },
      { courtCode: 'F4', name: 'Sân bóng mini F4 (Ghép Sân 7 & 11)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -32, y: 0.5, z: -10 }, maxCap: 14, curOcc: 12, status: 'AVAILABLE' },
      { courtCode: 'F5', name: 'Sân bóng mini F5 (Độc Lập & Đèn LED)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -44, y: 0.5, z: 10 }, maxCap: 14, curOcc: 14, status: 'OCCUPIED' },
      { courtCode: 'F6', name: 'Sân bóng mini F6 (Độc Lập & Đèn LED)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -32, y: 0.5, z: 10 }, maxCap: 14, curOcc: 0, status: 'AVAILABLE' },
      { courtCode: 'F7', name: 'Sân bóng mini F7 (Độc Lập & Đèn LED)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -44, y: 0.5, z: 20 }, maxCap: 14, curOcc: 0, status: 'AVAILABLE' },
      { courtCode: 'F8', name: 'Sân bóng mini F8 (Độc Lập & Đèn LED)', type: VenueType.FOOTBALL_5, sportCategory: SportCategory.SOCCER, basePrice: 250000, pos: { x: -32, y: 0.5, z: 20 }, maxCap: 14, curOcc: 0, status: 'AVAILABLE' },
      // Cầu lông CL1 - CL3
      { courtCode: 'CL1', name: 'Sân cầu lông CL-01 (Thảm PVC BWF)', type: VenueType.BADMINTON, sportCategory: SportCategory.BADMINTON, basePrice: 120000, pos: { x: -7, y: 0.5, z: -20 }, maxCap: 6, curOcc: 4, status: 'OCCUPIED' },
      { courtCode: 'CL2', name: 'Sân cầu lông CL-02 (Thảm PVC BWF)', type: VenueType.BADMINTON, sportCategory: SportCategory.BADMINTON, basePrice: 120000, pos: { x: 0, y: 0.5, z: -20 }, maxCap: 6, curOcc: 2, status: 'AVAILABLE' },
      { courtCode: 'CL3', name: 'Sân cầu lông CL-03 (Thảm PVC BWF)', type: VenueType.BADMINTON, sportCategory: SportCategory.BADMINTON, basePrice: 120000, pos: { x: 7, y: 0.5, z: -20 }, maxCap: 6, curOcc: 0, status: 'AVAILABLE' },
      // Tennis T1 & T2
      { courtCode: 'T1', name: 'Sân tennis T1 (Mặt Acrylic US Open)', type: VenueType.TENNIS, sportCategory: SportCategory.TENNIS, basePrice: 200000, pos: { x: -6, y: 0.5, z: 8 }, maxCap: 6, curOcc: 4, status: 'OCCUPIED' },
      { courtCode: 'T2', name: 'Sân tennis T2 (Mặt Acrylic US Open)', type: VenueType.TENNIS, sportCategory: SportCategory.TENNIS, basePrice: 200000, pos: { x: 6, y: 0.5, z: 8 }, maxCap: 6, curOcc: 0, status: 'AVAILABLE' },
        // Sân bóng đá 7 người (Ghép từ 2 sân 5 theo SRS v2.0)
        { courtCode: 'S7-A', name: 'Sân bóng 7 người S7-A (Ghép F1 + F2)', type: VenueType.FOOTBALL_7, sportCategory: SportCategory.SOCCER, basePrice: 450000, pos: { x: -38, y: 0.5, z: -20 }, maxCap: 20, curOcc: 0, status: 'AVAILABLE', isComposite: true, baseUnitCodes: ['F1', 'F2'] },
        { courtCode: 'S7-B', name: 'Sân bóng 7 người S7-B (Ghép F3 + F4)', type: VenueType.FOOTBALL_7, sportCategory: SportCategory.SOCCER, basePrice: 450000, pos: { x: -38, y: 0.5, z: -10 }, maxCap: 20, curOcc: 0, status: 'AVAILABLE', isComposite: true, baseUnitCodes: ['F3', 'F4'] },
        { courtCode: 'S7-C', name: 'Sân bóng 7 người S7-C (Ghép F5 + F6)', type: VenueType.FOOTBALL_7, sportCategory: SportCategory.SOCCER, basePrice: 450000, pos: { x: -38, y: 0.5, z: 10 }, maxCap: 20, curOcc: 0, status: 'AVAILABLE', isComposite: true, baseUnitCodes: ['F5', 'F6'] },
        // Sân bóng đá 11 người (Ghép toàn bộ 6 sân 5: F1..F6 theo SRS v2.0)
        { courtCode: 'S11', name: 'Sân bóng 11 người S11 (Ghép F1..F6)', type: VenueType.FOOTBALL_11, sportCategory: SportCategory.SOCCER, basePrice: 1200000, pos: { x: -38, y: 0.5, z: 0 }, maxCap: 30, curOcc: 0, status: 'AVAILABLE', isComposite: true, baseUnitCodes: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] },
      // Bóng rổ BB1 & BB2
      { courtCode: 'BB1', name: 'Sân bóng rổ BB1 (Cao su FIBA)', type: VenueType.BASKETBALL, sportCategory: SportCategory.BASKETBALL, basePrice: 180000, pos: { x: -6, y: 0.5, z: 36 }, maxCap: 12, curOcc: 10, status: 'OCCUPIED' },
      { courtCode: 'BB2', name: 'Sân bóng rổ BB2 (Cao su FIBA)', type: VenueType.BASKETBALL, sportCategory: SportCategory.BASKETBALL, basePrice: 180000, pos: { x: 6, y: 0.5, z: 36 }, maxCap: 12, curOcc: 0, status: 'AVAILABLE' },
      // Bể bơi Olympic & Ấm
      { courtCode: 'POOL1', name: 'Hồ bơi Olympic 50m (8 Làn Chuẩn)', type: VenueType.POOL, sportCategory: SportCategory.POOL, basePrice: 25000, pos: { x: 38, y: 0.5, z: -20 }, maxCap: 80, curOcc: 28, status: 'AVAILABLE' },
      { courtCode: 'POOL2', name: 'Hồ bơi Nước Ấm 25m (Trẻ Em & Dưỡng Sinh)', type: VenueType.POOL, sportCategory: SportCategory.POOL, basePrice: 25000, pos: { x: 64, y: 0.5, z: -20 }, maxCap: 50, curOcc: 14, status: 'AVAILABLE' },
      // Phòng Gym
      { courtCode: 'GYM', name: 'Tổ hợp Phòng Gym & Fitness (AI Face ID)', type: VenueType.GYM, sportCategory: SportCategory.GYM, basePrice: 80000, pos: { x: 40, y: 0.5, z: 12 }, maxCap: 100, curOcc: 46, status: 'AVAILABLE' },
      // Cyber Gaming
      { courtCode: 'CYBER', name: 'Khu Gaming 100 Máy (Sảnh & 4 VIP)', type: VenueType.ESPORT_VIP, sportCategory: SportCategory.GAMING, basePrice: 35000, pos: { x: 40, y: 0.5, z: 36 }, maxCap: 100, curOcc: 62, status: 'AVAILABLE' },
    ];

    const seededVenues: Record<string, any> = {};
    for (const vd of venuesData) {
      let venue = await venueModel.findOne({ facilityId: facility._id, courtCode: vd.courtCode }).exec();
      if (!venue) {
        venue = await venueModel.create({
          facilityId: facility._id,
          name: vd.name,
          courtCode: vd.courtCode,
          type: vd.type,
          sportCategory: vd.sportCategory,
          basePricePerHour: vd.basePrice,
          isComposite: vd.isComposite || false,
          baseUnitCodes: vd.baseUnitCodes || [],
          position3D: vd.pos,
          maxCapacity: vd.maxCap,
          currentOccupancy: vd.curOcc,
          status: vd.status,
          lightingFeePerHour: 50000,
          operatingHours: { openTime: '06:00', closeTime: '23:00' },
          pricingRules: {
            peakHours: [
              { startTime: '17:00', endTime: '21:00', price: Math.round(vd.basePrice * 1.3) },
            ],
          },
          isActive: true,
        });
        logger.log(`  ➕ Tạo sân: ${vd.courtCode} - ${vd.name}`);
      } else {
        venue.position3D = vd.pos;
        venue.sportCategory = vd.sportCategory;
        venue.maxCapacity = vd.maxCap;
        venue.currentOccupancy = vd.curOcc;
        venue.status = vd.status;
        await venue.save();
      }
      seededVenues[vd.courtCode] = venue;
    }

    // -------------------------------------------------------------
    // 4. SEED DỤNG CỤ CHO THUÊ (RENTAL ITEMS)
    // -------------------------------------------------------------
    logger.log('🏸 Đang khởi tạo danh mục dụng cụ cho thuê...');
    const rentalItemsData = [
      { name: 'Bóng Molten Vantaggio 5000', type: RentalItemType.BALL, sportCategory: SportCategory.SOCCER, rentalPrice: 50000, deposit: 200000, stock: 30, avail: 24 },
      { name: 'Bộ 7 áo bib thi đấu Phanta', type: RentalItemType.BIB, sportCategory: SportCategory.SOCCER, rentalPrice: 30000, deposit: 100000, stock: 20, avail: 16 },
      { name: 'Vợt cầu lông Yonex Astrox 88D', type: RentalItemType.RACKET, sportCategory: SportCategory.BADMINTON, rentalPrice: 40000, deposit: 300000, stock: 25, avail: 18 },
      { name: 'Vợt Tennis Wilson Pro Staff v14', type: RentalItemType.RACKET, sportCategory: SportCategory.TENNIS, rentalPrice: 60000, deposit: 500000, stock: 15, avail: 11 },
      { name: 'Bóng rổ Molten BG4500 FIBA', type: RentalItemType.BALL, sportCategory: SportCategory.BASKETBALL, rentalPrice: 40000, deposit: 200000, stock: 20, avail: 15 },
      { name: 'Bộ kính bơi và nón Speedo Pro', type: RentalItemType.OTHER, sportCategory: SportCategory.POOL, rentalPrice: 25000, deposit: 100000, stock: 40, avail: 32 },
      { name: 'Khăn tập và bình nước giữ nhiệt', type: RentalItemType.OTHER, sportCategory: SportCategory.GYM, rentalPrice: 15000, deposit: 50000, stock: 50, avail: 45 },
    ];

    const seededRentals: Record<string, any> = {};
    for (const r of rentalItemsData) {
      let item = await rentalItemModel.findOne({ name: r.name }).exec();
      if (!item) {
        item = await rentalItemModel.create({
          name: r.name,
          type: r.type,
          sportCategory: r.sportCategory,
          rentalPricePerSlot: r.rentalPrice,
          depositPrice: r.deposit,
          stockQty: r.stock,
          availableQty: r.avail,
          isActive: true,
        });
        logger.log(`  ➕ Tạo dụng cụ: ${r.name}`);
      }
      seededRentals[r.name] = item;
    }

    // -------------------------------------------------------------
    // 5. SEED VOUCHER MÃ KHUYẾN MÃI
    // -------------------------------------------------------------
    logger.log('🎟️ Đang khởi tạo kho mã giảm giá...');
    const vouchersData = [
      { code: 'PHANTA50K', title: 'Ưu đãi giảm 50.000đ cho đơn đầu tiên', discountType: DiscountType.FIXED, discountValue: 50000, minOrder: 200000, limit: 500, used: 124 },
      { code: 'CHAOSAN10', title: 'Giảm 10% tổng hóa đơn đặt sân', discountType: DiscountType.PERCENT, discountValue: 10, minOrder: 150000, maxDiscount: 100000, limit: 1000, used: 348 },
      { code: 'VIPGOLD', title: 'Đặc quyền Hội viên Vàng giảm 15%', discountType: DiscountType.PERCENT, discountValue: 15, minOrder: 300000, maxDiscount: 200000, limit: 200, used: 64 },
    ];

    for (const v of vouchersData) {
      const existing = await voucherModel.findOne({ code: v.code }).exec();
      if (!existing) {
        await voucherModel.create({
          code: v.code,
          title: v.title,
          discountType: v.discountType,
          discountValue: v.discountValue,
          minOrderValue: v.minOrder,
          maxDiscountAmount: v.maxDiscount,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          usageLimit: v.limit,
          usedCount: v.used,
          isActive: true,
        });
        logger.log(`  ➕ Tạo voucher: ${v.code}`);
      }
    }

    // -------------------------------------------------------------
    // 6. SEED CA THU NGÂN (SHIFTS)
    // -------------------------------------------------------------
    logger.log('💵 Đang khởi tạo các ca thu ngân...');
    const shiftsData = [
      {
        shiftCode: 'CA-20261025-S1',
        cashierId: cashierUser._id,
        cashierName: cashierUser.fullName,
        openedAt: new Date('2026-10-25T06:00:00Z'),
        closedAt: new Date('2026-10-25T14:00:00Z'),
        initialCash: 2000000,
        expectedCash: 5450000,
        actualCash: 5450000,
        vietQrTotal: 8900000,
        difference: 0,
        status: ShiftStatus.CLOSED,
        notes: 'Bàn giao ca sáng khớp 100% két tiền',
      },
      {
        shiftCode: 'CA-20261025-S2',
        cashierId: cashierUser._id,
        cashierName: cashierUser.fullName,
        openedAt: new Date('2026-10-25T14:00:00Z'),
        closedAt: new Date('2026-10-25T22:30:00Z'),
        initialCash: 2000000,
        expectedCash: 7200000,
        actualCash: 7200000,
        vietQrTotal: 12400000,
        difference: 0,
        status: ShiftStatus.CLOSED,
        notes: 'Ca tối giờ vàng đông khách, không có chênh lệch',
      },
      {
        shiftCode: 'CA-20261026-S1',
        cashierId: cashierUser._id,
        cashierName: cashierUser.fullName,
        openedAt: new Date('2026-10-26T06:00:00Z'),
        closedAt: undefined,
        initialCash: 2000000,
        expectedCash: 4150000,
        actualCash: undefined,
        vietQrTotal: 6850000,
        difference: 0,
        status: ShiftStatus.OPEN,
        notes: 'Ca làm việc hiện tại đang mở',
      },
    ];

    let currentShiftDoc: any = null;
    for (const s of shiftsData) {
      let shift = await shiftModel.findOne({ shiftCode: s.shiftCode }).exec();
      if (!shift) {
        shift = await shiftModel.create(s);
        logger.log(`  ➕ Tạo ca thu ngân: ${s.shiftCode} (${s.status})`);
      }
      if (s.status === ShiftStatus.OPEN) {
        currentShiftDoc = shift;
      }
    }

    // -------------------------------------------------------------
    // 7. SEED HÓA ĐƠN BÁN LẺ POS & CĂNG TIN (ORDERS)
    // -------------------------------------------------------------
    logger.log('🛒 Đang khởi tạo hóa đơn căng tin & bán lẻ POS...');
    const posOrdersData = [
      {
        orderCode: 'HD-20261026-001',
        customerName: 'Anh Minh (FC Báo Đen)',
        items: [
          { name: 'Nước tăng lực RedBull', type: OrderItemType.PRODUCT, quantity: 4, unitPrice: 20000, totalPrice: 80000 },
          { name: 'Nước suối Aquafina 500ml', type: OrderItemType.PRODUCT, quantity: 6, unitPrice: 10000, totalPrice: 60000 },
          { name: 'Bóng Molten Vantaggio 5000 (Thuê)', type: OrderItemType.RENTAL, quantity: 1, unitPrice: 50000, totalPrice: 50000 },
        ],
        subtotal: 190000,
        discountAmount: 0,
        vatRate: 8,
        vatAmount: 15200,
        finalTotal: 205200,
        paymentMethod: PaymentProvider.CASH,
      },
      {
        orderCode: 'HD-20261026-002',
        customerName: 'Chị Lan (CLB Cầu Lông Ba Đình)',
        items: [
          { name: 'Nước Pocari Sweat 500ml', type: OrderItemType.PRODUCT, quantity: 4, unitPrice: 18000, totalPrice: 72000 },
          { name: 'Vợt cầu lông Yonex Astrox (Thuê)', type: OrderItemType.RENTAL, quantity: 2, unitPrice: 40000, totalPrice: 80000 },
        ],
        subtotal: 152000,
        discountAmount: 0,
        vatRate: 8,
        vatAmount: 12160,
        finalTotal: 164160,
        paymentMethod: PaymentProvider.VIETQR,
      },
      {
        orderCode: 'HD-20261026-003',
        customerName: 'Nguyễn Văn Khách Hàng',
        customerId: customerUser._id,
        items: [
          { name: 'Combo Đồ Uống Phanta Pro', type: OrderItemType.PRODUCT, quantity: 1, unitPrice: 85000, totalPrice: 85000 },
        ],
        subtotal: 85000,
        discountAmount: 10000,
        vatRate: 8,
        vatAmount: 6000,
        finalTotal: 81000,
        paymentMethod: PaymentProvider.WALLET,
      },
    ];

    for (const od of posOrdersData) {
      const existing = await orderModel.findOne({ orderCode: od.orderCode }).exec();
      if (!existing) {
        await orderModel.create({
          ...od,
          cashierId: cashierUser._id,
          shiftId: currentShiftDoc?._id,
          status: OrderStatus.COMPLETED,
        });
        logger.log(`  ➕ Tạo hóa đơn POS: ${od.orderCode} (${od.finalTotal.toLocaleString('vi-VN')}đ)`);
      }
    }

    // -------------------------------------------------------------
    // 8. SEED ĐƠN ĐẶT SÂN (BOOKINGS - 50+ BẢN GHI ĐA DẠNG)
    // -------------------------------------------------------------
    logger.log('📅 Đang khởi tạo các đơn đặt sân mẫu sống động...');
    const venuesList = Object.values(seededVenues);
    const bookingStatuses = [
      BookingStatus.COMPLETED,
      BookingStatus.CONFIRMED,
      BookingStatus.CHECKED_IN,
      BookingStatus.HELD,
      BookingStatus.CANCELLED,
    ];

    const timeSlots = [
      { start: '06:00', end: '07:30', isPeak: false },
      { start: '07:30', end: '09:00', isPeak: false },
      { start: '09:00', end: '10:30', isPeak: false },
      { start: '15:00', end: '16:30', isPeak: false },
      { start: '17:30', end: '19:00', isPeak: true },
      { start: '19:00', end: '20:30', isPeak: true },
      { start: '20:30', end: '22:00', isPeak: true },
    ];

    // Xóa các booking mẫu cũ nếu có để tránh trùng lịch unique partial index
    await bookingModel.deleteMany({ checkInCode: { $regex: '^PHANTA-BK' } }).exec();

    let bookingCounter = 1000;
    const now = new Date();

    for (let dayOffset = -4; dayOffset <= 2; dayOffset++) {
      const bDate = new Date(now);
      bDate.setDate(bDate.getDate() + dayOffset);
      bDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < venuesList.length; i++) {
        // Mỗi sân chọn 1 - 2 khung giờ trong ngày
        const venue = venuesList[i];
        const slot = timeSlots[(i + Math.abs(dayOffset)) % timeSlots.length];
        bookingCounter++;

        let status: BookingStatus;
        if (dayOffset < 0) {
          status = BookingStatus.COMPLETED;
        } else if (dayOffset === 0) {
          status = i % 3 === 0 ? BookingStatus.CHECKED_IN : (i % 2 === 0 ? BookingStatus.CONFIRMED : BookingStatus.HELD);
        } else {
          status = i % 4 === 0 ? BookingStatus.HELD : BookingStatus.CONFIRMED;
        }

        const baseHourly = venue.basePricePerHour || 200000;
        const durationHours = 1.5;
        const multiplier = slot.isPeak ? 1.3 : 1.0;
        const subtotal = Math.round(baseHourly * durationHours * multiplier);
        const vatRate = 8;
        const vatAmount = Math.round(subtotal * 0.08);
        const totalPrice = subtotal + vatAmount;

        const checkInCode = `PHANTA-BK${bookingCounter}`;
        const hasRentals = i % 2 === 0;

        const booking = await bookingModel.create({
          userId: customerUser._id,
          venueId: venue._id,
          bookingDate: bDate,
          startTime: slot.start,
          endTime: slot.end,
          totalPrice,
          bookingSource: i % 4 === 0 ? BookingSource.WALK_IN : BookingSource.APP,
          status,
          checkInCode,
          isCheckedIn: status === BookingStatus.CHECKED_IN || status === BookingStatus.COMPLETED,
          checkedInAt: status === BookingStatus.CHECKED_IN || status === BookingStatus.COMPLETED ? new Date() : undefined,
          isWalkIn: i % 4 === 0,
          customerName: i % 4 === 0 ? `Khách vãng lai #${bookingCounter}` : customerUser.fullName,
          customerPhone: i % 4 === 0 ? `090123${bookingCounter}` : customerUser.phone,
          paymentMethod: i % 3 === 0 ? 'WALLET' : (i % 2 === 0 ? 'VIETQR' : 'CASH'),
          vatRate,
          vatAmount,
          equipmentRentals: hasRentals
            ? [
                {
                  itemId: seededRentals['Bóng Molten Vantaggio 5000']?._id?.toString() || 'ball-1',
                  name: 'Bóng Molten Vantaggio 5000',
                  quantity: 1,
                  price: 50000,
                },
              ]
            : [],
        });

        // Tạo bản ghi Payment tương ứng nếu đã thanh toán
        if (status === BookingStatus.CONFIRMED || status === BookingStatus.CHECKED_IN || status === BookingStatus.COMPLETED) {
          await paymentModel.create({
            bookingId: booking._id,
            amount: totalPrice,
            provider: i % 3 === 0 ? PaymentProvider.WALLET : (i % 2 === 0 ? PaymentProvider.VIETQR : PaymentProvider.CASH),
            status: PaymentStatus.SUCCESS,
            transactionId: `TXN-${bookingCounter}-${Date.now().toString().slice(-6)}`,
          });
        }
      }
    }
    logger.log(`  ✅ Đã tạo thành công ${bookingCounter - 1000} đơn đặt sân với đầy đủ hóa đơn và thuế VAT.`);

    // -------------------------------------------------------------
    // 9. SEED SỔ CÁI BIẾN ĐỘNG SỐ DƯ (WALLET LEDGER)
    // -------------------------------------------------------------
    logger.log('📖 Đang khởi tạo sổ cái tài chính Phanta Pay...');
    await ledgerModel.deleteMany({ userId: customerUser._id }).exec();

    let curBalance = 0;
    const ledgerEntries = [
      { type: LedgerType.TOPUP, amount: 2000000, desc: 'Nạp tiền vào Ví Phanta qua VietQR PayOS' },
      { type: LedgerType.PAYMENT, amount: 405000, desc: 'Thanh toán đặt Sân bóng mini F1 (17:30 - 19:00)' },
      { type: LedgerType.PAYMENT, amount: 194400, desc: 'Thanh toán đặt Sân cầu lông CL-01' },
      { type: LedgerType.TOPUP, amount: 1500000, desc: 'Nạp tiền nạp ví khuyến mãi chào sân' },
      { type: LedgerType.PAYMENT, amount: 324000, desc: 'Thanh toán đặt Sân tennis T1' },
      { type: LedgerType.REFUND, amount: 324000, desc: 'Hoàn tiền 100% hủy lịch Sân tennis T1 trước 12h' },
      { type: LedgerType.HOLD, amount: 150000, desc: 'Tạm giữ số dư chơi máy Gaming VIP-02' },
      { type: LedgerType.RELEASE, amount: 150000, desc: 'Hoàn trả tạm giữ sau khi đóng phiên máy Gaming' },
      { type: LedgerType.PAYMENT, amount: 70000, desc: 'Thanh toán tiền giờ chơi máy Gaming (2 giờ)' },
      { type: LedgerType.PAYMENT, amount: 81000, desc: 'Thanh toán hóa đơn căng tin HD-20261026-003' },
    ];

    for (let i = 0; i < ledgerEntries.length; i++) {
      const e = ledgerEntries[i];
      const balBefore = curBalance;
      if (e.type === LedgerType.TOPUP || e.type === LedgerType.REFUND || e.type === LedgerType.RELEASE) {
        curBalance += e.amount;
      } else {
        curBalance -= e.amount;
      }
      const entryDate = new Date();
      entryDate.setMinutes(entryDate.getMinutes() - (ledgerEntries.length - i) * 60);

      await ledgerModel.create({
        userId: customerUser._id,
        type: e.type,
        amount: e.amount,
        balanceBefore: balBefore,
        balanceAfter: curBalance,
        referenceId: `REF-${10000 + i}`,
        paymentMethod: 'VIETQR',
        description: e.desc,
        createdAt: entryDate,
      });
    }

    customerUser.walletBalance = curBalance;
    await customerUser.save();
    logger.log(`  ✅ Đã tạo ${ledgerEntries.length} dòng biến động sổ cái. Số dư hiện tại của khách: ${curBalance.toLocaleString('vi-VN')}đ`);

    logger.log('🎉🎉🎉 HOÀN THÀNH TOÀN BỘ SEED DỮ LIỆU PHANTA SPORTS THÀNH CÔNG RỰC RỠ!');
  } catch (err) {
    logger.error('❌ Lỗi trong quá trình seed dữ liệu:', err);
  } finally {
    await app.close();
  }
}

seed();
