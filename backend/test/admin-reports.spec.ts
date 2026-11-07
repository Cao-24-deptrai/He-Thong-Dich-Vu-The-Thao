import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminService } from '../src/admin/admin.service';
import { AdminController } from '../src/admin/admin.controller';
import { RedisService } from '../src/redis/redis.service';
import { BookingStatus, PaymentStatus, UserRole, SportCategory, LedgerType } from '../src/common/enums';

describe('Admin Reports & 4 Bar/Pie Charts (Bước 2.7)', () => {
  let service: AdminService;
  let controller: AdminController;

  const mockVenues = [
    { _id: '671df1111111111111111111', courtCode: 'F1', name: 'Sân bóng mini F1', sportCategory: 'SOCCER', isActive: true, currentOccupancy: 14, maxCapacity: 20 },
    { _id: '671df1111111111111111112', courtCode: 'BAD1', name: 'Sân cầu lông VIP 1', sportCategory: 'BADMINTON', isActive: true, currentOccupancy: 4, maxCapacity: 4 },
    { _id: '671df1111111111111111113', courtCode: 'TEN1', name: 'Sân tennis Grand Slam', sportCategory: 'TENNIS', isActive: true, currentOccupancy: 2, maxCapacity: 4 },
    { _id: '671df1111111111111111114', courtCode: 'GYM1', name: 'Khu Gym & Fitness AI', sportCategory: 'GYM', isActive: true, currentOccupancy: 46, maxCapacity: 100 },
    { _id: '671df1111111111111111115', courtCode: 'POOL1', name: 'Hồ bơi Olympic 50m', sportCategory: 'POOL', isActive: true, currentOccupancy: 28, maxCapacity: 80 },
    { _id: '671df1111111111111111116', courtCode: 'GAME1', name: 'Zone Cyber Gaming RTX 4090', sportCategory: 'GAMING', isActive: true, currentOccupancy: 62, maxCapacity: 100 },
  ];

  const mockBookings = [
    {
      _id: '671df2222222222222222221',
      checkInCode: 'PHANTA-BK1001',
      venueId: '671df1111111111111111111',
      startTime: '17:30',
      endTime: '19:00',
      totalPrice: 432000,
      paymentMethod: 'VIETQR',
      status: BookingStatus.CHECKED_IN,
      customerName: 'Nguyễn Văn Minh',
      customerPhone: '0912345678',
      bookingDate: new Date(),
    },
    {
      _id: '671df2222222222222222222',
      checkInCode: 'PHANTA-BK1002',
      venueId: '671df1111111111111111112',
      startTime: '19:00',
      endTime: '20:30',
      totalPrice: 280000,
      paymentMethod: 'WALLET',
      status: BookingStatus.CONFIRMED,
      customerName: 'Trần Hoàng Long',
      customerPhone: '0988776655',
      bookingDate: new Date(),
    },
    {
      _id: '671df2222222222222222223',
      checkInCode: 'PHANTA-BK1003',
      venueId: '671df1111111111111111113',
      startTime: '07:30',
      endTime: '09:00',
      totalPrice: 350000,
      paymentMethod: 'CASH',
      status: BookingStatus.COMPLETED,
      customerName: 'Lê Văn Cường',
      customerPhone: '0933445566',
      bookingDate: new Date(),
    },
  ];

  const mockOrders = [
    {
      _id: '671df3333333333333333331',
      orderCode: 'HD-20261026-001',
      customerName: 'Khách Căng Tin',
      customerPhone: '0912345678',
      items: [
        { name: 'RedBull', type: 'FOOD', quantity: 2, unitPrice: 25000, totalPrice: 50000 },
        { name: 'Thuê Bóng Molten', type: 'RENTAL', quantity: 1, unitPrice: 50000, totalPrice: 50000 },
      ],
      finalTotal: 100000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      createdAt: new Date(),
    },
  ];

  const mockLedgers = [
    { _id: '671df4444444444444444441', type: LedgerType.TOPUP, amount: 2000000, balanceAfter: 2000000, description: 'Nạp tiền VietQR', createdAt: new Date() },
    { _id: '671df4444444444444444442', type: LedgerType.PAYMENT, amount: 432000, balanceAfter: 1568000, description: 'Thanh toán đặt sân', createdAt: new Date() },
    { _id: '671df4444444444444444443', type: LedgerType.REFUND, amount: 150000, balanceAfter: 1718000, description: 'Hoàn tiền hủy sân', createdAt: new Date() },
  ];

  const mockShifts = [
    {
      _id: '671df5555555555555555551',
      shiftCode: 'CA-20261027-S1',
      cashierName: 'Trần Thị Thu Ngân',
      openedAt: new Date(),
      initialCash: 2000000,
      expectedCash: 3500000,
      vietQrTotal: 1200000,
      difference: 0,
      status: 'CLOSED',
    },
  ];

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeAll(async () => {
    const mockModelHelper = (data: any[]) => {
      const chain: any = {};
      chain.find = jest.fn().mockReturnValue(chain);
      chain.populate = jest.fn().mockReturnValue(chain);
      chain.sort = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockReturnValue(chain);
      chain.skip = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.lean = jest.fn().mockReturnValue(chain);
      chain.exec = jest.fn().mockResolvedValue(data);
      chain.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(120) });
      chain.aggregate = jest.fn().mockImplementation((pipeline: any[]) => {
        if (pipeline[0]?.$match?.status === PaymentStatus.SUCCESS) {
          return Promise.resolve([{ _id: null, total: 15800000 }]);
        }
        if (pipeline[0]?.$group?._id === '$status') {
          return Promise.resolve([
            { _id: BookingStatus.CONFIRMED, count: 12 },
            { _id: BookingStatus.CHECKED_IN, count: 8 },
            { _id: BookingStatus.COMPLETED, count: 45 },
          ]);
        }
        return Promise.resolve([{ _id: null, total: 2500000 }]);
      });
      return chain;
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        { provide: getModelToken('Venue'), useValue: mockModelHelper(mockVenues) },
        { provide: getModelToken('Booking'), useValue: mockModelHelper(mockBookings) },
        { provide: getModelToken('Order'), useValue: mockModelHelper(mockOrders) },
        { provide: getModelToken('WalletLedger'), useValue: mockModelHelper(mockLedgers) },
        { provide: getModelToken('Shift'), useValue: mockModelHelper(mockShifts) },
        { provide: getModelToken('Payment'), useValue: mockModelHelper([]) },
        { provide: getModelToken('User'), useValue: mockModelHelper([{ walletBalance: 500000, heldBalance: 0 }]) },
        { provide: getModelToken('RentalItem'), useValue: mockModelHelper([]) },
        { provide: getModelToken('Voucher'), useValue: mockModelHelper([]) },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    controller = module.get<AdminController>(AdminController);
  });

  describe('1. GET /admin/dashboard/stats - 5 Chỉ Số KPIs Thời Gian Thực', () => {
    it('Phải trả về đủ 5 chỉ số KPIs thời gian thực: monthRevenue, occupancyRate, totalBookings, canteenRevenue, activeMembers', async () => {
      const stats = await service.getDashboardStats();
      expect(stats).toBeDefined();

      // Kiểm tra 5 chỉ số KPIs cốt lõi
      expect(stats.monthRevenue).toBeDefined();
      expect(typeof stats.monthRevenue).toBe('number');

      expect(stats.occupancyRate).toBeDefined();
      expect(typeof stats.occupancyRate).toBe('number');
      expect(stats.occupancyRate).toBeGreaterThan(0);

      expect(stats.totalBookings).toBeDefined();
      expect(stats.totalBookings).toBeGreaterThan(0);

      expect(stats.canteenRevenue).toBeDefined();
      expect(typeof stats.canteenRevenue).toBe('number');

      expect(stats.activeMembers).toBeDefined();
      expect(stats.activeMembers).toBe(120);

      // Caching Redis với TTL 30s
      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:admin:dashboard:stats',
        expect.any(String),
        30,
      );
    });
  });

  describe('2. Báo Cáo 1: Doanh Thu 7 Ngày Gần Nhất & Cơ Cấu Môn (GET /admin/reports/revenue-7days)', () => {
    it('Phải trả về dữ liệu Bar Chart 7 ngày và Pie Chart cơ cấu theo từng bộ môn', async () => {
      const report = await service.getRevenueBySportReport();
      expect(report).toBeDefined();
      expect(report.totalRevenue).toBeGreaterThan(0);

      // Bar Chart 7 ngày
      expect(report.barData).toBeInstanceOf(Array);
      expect(report.barData).toHaveLength(7);
      expect(report.barData[0]).toHaveProperty('date');
      expect(report.barData[0]).toHaveProperty('SOCCER');

      // Pie Chart cơ cấu môn
      expect(report.pieData).toBeInstanceOf(Array);
      expect(report.pieData.length).toBeGreaterThan(0);
      const soccerPie = report.pieData.find(p => p.category === 'SOCCER');
      expect(soccerPie).toBeDefined();
      expect(soccerPie?.label).toContain('Bóng Đá');
      expect(soccerPie?.percentage).toBeDefined();
      expect(soccerPie?.color).toBe('#10B981');
    });
  });

  describe('3. Báo Cáo 2: Tỷ Lệ Lấp Đầy Theo 7 Khung Giờ (GET /admin/reports/occupancy-by-hour)', () => {
    it('Phải trả về tỷ lệ lấp đầy theo 7 khung giờ và phân bổ giờ vàng', async () => {
      const report = await service.getSlotUtilizationReport();
      expect(report).toBeDefined();
      expect(report.totalCourts).toBe(16);
      expect(report.peakHourAverageRate).toBe(92);

      // Bar Chart 7 khung giờ
      expect(report.barData).toBeInstanceOf(Array);
      expect(report.barData).toHaveLength(7);
      expect(report.barData[0]).toHaveProperty('slot');
      expect(report.barData[0]).toHaveProperty('utilizationRate');

      // Pie Chart phân bổ giờ vàng vs giờ thường
      expect(report.pieData).toBeInstanceOf(Array);
      expect(report.pieData.length).toBeGreaterThan(0);
      expect(report.pieData[0].label).toContain('Giờ Vàng');
    });
  });

  describe('4. Báo Cáo 3: Đối Soát Ví Phanta Pay & Sổ Cái (GET /admin/reports/wallet-reconciliation)', () => {
    it('Phải trả về số liệu đối soát nạp ví, thanh toán, hoàn tiền và tỷ lệ ví vs ngân hàng', async () => {
      const report = await service.getWalletReconciliationReport();
      expect(report).toBeDefined();
      expect(report.summary).toHaveProperty('totalTopup');
      expect(report.summary).toHaveProperty('totalPayments');
      expect(report.summary).toHaveProperty('totalRefunds');
      expect(report.summary).toHaveProperty('circulatingBalance');

      // Bar & Pie data
      expect(report.barData).toBeInstanceOf(Array);
      expect(report.barData).toHaveLength(7);
      expect(report.pieBreakdown).toBeInstanceOf(Array);
      expect(report.pieData).toBeInstanceOf(Array);
    });
  });

  describe('5. Báo Cáo 4: Doanh Thu Bán Lẻ Căng Tin & Thuê Dụng Cụ (GET /admin/reports/canteen-equipment-revenue)', () => {
    it('Phải trả về chi tiết F&B đồ ăn uống, thuê dụng cụ và phương thức thanh toán thu ngân', async () => {
      const report = await service.getShiftsSummaryReport();
      expect(report).toBeDefined();
      expect(report.canteenBreakdown).toHaveProperty('foodAndDrinks');
      expect(report.canteenBreakdown).toHaveProperty('equipmentRentals');
      expect(report.canteenBreakdown).toHaveProperty('totalCanteen');

      // Bar & Pie data
      expect(report.barData).toBeInstanceOf(Array);
      expect(report.pieData).toBeInstanceOf(Array);
      const qrPie = report.pieData.find(p => p.label.includes('VietQR'));
      expect(qrPie).toBeDefined();
    });
  });

  describe('6. Drill-Down: Chi Tiết Từng Hóa Đơn Khi Click Biểu Đồ (GET /admin/reports/revenue-by-sport/drilldown)', () => {
    it('Phải trả về danh sách chi tiết các hóa đơn cấu thành với mã vé, số tiền, khung giờ', async () => {
      const drilldown = await service.getRevenueBySportDrilldown('SOCCER');
      expect(drilldown).toBeInstanceOf(Array);
      expect(drilldown.length).toBeGreaterThan(0);

      const inv = drilldown[0];
      expect(inv).toHaveProperty('code');
      expect(inv).toHaveProperty('customerName');
      expect(inv).toHaveProperty('amount');
      expect(inv).toHaveProperty('paymentMethod');
      expect(inv).toHaveProperty('status');
    });

    it('Phải hỗ trợ drill-down cho danh mục bán lẻ Căng Tin RETAIL', async () => {
      const retailDrill: any[] = await service.getRevenueBySportDrilldown('RETAIL');
      expect(retailDrill).toBeInstanceOf(Array);
      expect(retailDrill.length).toBeGreaterThan(0);
      expect(retailDrill[0]).toHaveProperty('serviceName');
      expect(retailDrill[0].serviceName).toContain('RedBull');
    });
  });

  describe('7. Xuất Báo Cáo Ra File Excel .xlsx (GET /admin/reports/export-excel)', () => {
    it('Phải tạo workbook 2 sheet (TONG_HOP_KPIS và DRILLDOWN) với MIME type chuẩn', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
        write: jest.fn().mockImplementation((chunk, cb) => {
          if (typeof cb === 'function') cb();
          return true;
        }),
        end: jest.fn(),
      };

      await service.exportReportsToExcel({ sport: 'SOCCER' }, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=Phanta_Report_SOCCER_'),
      );
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
