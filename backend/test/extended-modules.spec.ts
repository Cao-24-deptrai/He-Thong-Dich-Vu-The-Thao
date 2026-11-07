import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CanteenService } from '../src/canteen/canteen.service';
import { CanteenController } from '../src/canteen/canteen.controller';
import { RentalsService } from '../src/rentals/rentals.service';
import { RentalsController } from '../src/rentals/rentals.controller';
import { PoolService } from '../src/pool/pool.service';
import { PoolController } from '../src/pool/pool.controller';
import { GymService } from '../src/gym/gym.service';
import { GymController } from '../src/gym/gym.controller';
import { GamingService } from '../src/gaming/gaming.service';
import { GamingController } from '../src/gaming/gaming.controller';
import { WalletService } from '../src/wallet/wallet.service';
import { WalletController } from '../src/wallet/wallet.controller';
import { Order } from '../src/orders/schemas/order.schema';
import { Shift } from '../src/shifts/schemas/shift.schema';
import { RentalItem } from '../src/rentals/schemas/rental-item.schema';
import { RentalTicket } from '../src/rentals/schemas/rental-ticket.schema';
import { User } from '../src/users/schemas/user.schema';
import { WalletLedger } from '../src/payments/schemas/wallet-ledger.schema';
import { EventsGateway } from '../src/events/events.gateway';
import { UserRole, MembershipTier, LedgerType, PaymentProvider } from '../src/common/enums';

describe('Extended Modules Testing (Bước 2.8)', () => {
  let canteenService: CanteenService;
  let rentalsService: RentalsService;
  let poolService: PoolService;
  let gymService: GymService;
  let gamingService: GamingService;
  let walletService: WalletService;

  // Mock User
  const mockUser = {
    _id: '671df0000000000000000005',
    phone: '0900000005',
    fullName: 'Đỗ Văn Khang',
    role: UserRole.CUSTOMER,
    walletBalance: 1500000,
    heldBalance: 0,
    loyaltyPoints: 12000,
    membershipTier: MembershipTier.GOLD,
    isFaceIdActive: true,
    faceIdVector: 'VEC_MOCK_12345',
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock Models
  const mockOrderModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: '671df8888888888888888888',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: '671df8888888888888888888',
    }),
  }));
  mockOrderModel.find = jest.fn();

  const mockShiftModel = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockRentalItemModel: any = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockRentalTicketModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: '671df9999999999999999999',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: '671df9999999999999999999',
    }),
  }));
  mockRentalTicketModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  });
  mockRentalTicketModel.findOne = jest.fn();

  const mockUserModel = {
    findOne: jest.fn().mockImplementation((query) => {
      return {
        exec: jest.fn().mockResolvedValue(mockUser),
      };
    }),
    findById: jest.fn().mockImplementation((id) => {
      return {
        exec: jest.fn().mockResolvedValue(mockUser),
      };
    }),
  };

  const mockWalletLedgerModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: '671df7777777777777777777',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: '671df7777777777777777777',
    }),
  }));
  mockWalletLedgerModel.countDocuments = jest.fn().mockResolvedValue(1);
  mockWalletLedgerModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: '671df7777777777777777777',
              type: LedgerType.TOPUP,
              amount: 500000,
              balanceBefore: 1000000,
              balanceAfter: 1500000,
              referenceId: 'TOPUP_1',
              paymentMethod: 'VIETQR',
              description: 'Nạp tiền vào ví Phanta Pay',
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    }),
  });

  const mockEventsGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanteenService,
        CanteenController,
        RentalsService,
        RentalsController,
        PoolService,
        PoolController,
        GymService,
        GymController,
        GamingService,
        GamingController,
        WalletService,
        WalletController,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Shift.name), useValue: mockShiftModel },
        { provide: getModelToken(RentalItem.name), useValue: mockRentalItemModel },
        { provide: getModelToken(RentalTicket.name), useValue: mockRentalTicketModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(WalletLedger.name), useValue: mockWalletLedgerModel },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    canteenService = module.get<CanteenService>(CanteenService);
    rentalsService = module.get<RentalsService>(RentalsService);
    poolService = module.get<PoolService>(PoolService);
    gymService = module.get<GymService>(GymService);
    gamingService = module.get<GamingService>(GamingService);
    walletService = module.get<WalletService>(WalletService);
  });

  // =========================================================================
  // 1. CANTEEN POS & F&B
  // =========================================================================
  describe('Canteen Service (/canteen)', () => {
    it('1.1 Lấy danh mục sản phẩm F&B căng tin', async () => {
      const res = await canteenService.getProducts();
      expect(res.total).toBeGreaterThan(5);
      expect(res.items.some((i: any) => i.name.includes('Pocari'))).toBe(true);
    });

    it('1.2 Lọc theo danh mục DRINK', async () => {
      const res = await canteenService.getProducts('DRINK');
      expect(res.items.every((i: any) => i.category === 'DRINK')).toBe(true);
    });

    it('1.3 Tạo đơn mua F&B, tính thuế VAT 8% chính xác', async () => {
      const order = await canteenService.createOrder({
        customerName: 'Nguyễn Văn Test',
        customerPhone: '0912345678',
        items: [
          { name: 'Nước tăng lực RedBull lon vàng', quantity: 2, unitPrice: 20000 },
          { name: 'Snack khoai tây Oishi phô mai', quantity: 1, unitPrice: 12000 },
        ],
        paymentMethod: PaymentProvider.CASH,
      });

      expect(order.subtotal).toBe(52000); // 40k + 12k
      expect(order.vatAmount).toBe(Math.round(52000 * 0.08)); // 4160
      expect(order.finalTotal).toBe(52000 + 4160); // 56160
      expect(order.orderCode).toMatch(/^HD-\d{8}-\d{3}$/);
    });
  });

  // =========================================================================
  // 2. RENTALS & EQUIPMENT
  // =========================================================================
  describe('Rentals Service (/rentals)', () => {
    it('2.1 Lấy danh mục dụng cụ cho thuê kèm số lượng', async () => {
      const res = await rentalsService.getItems();
      expect(res.total).toBeGreaterThan(0);
      expect(res.items.some((i: any) => i.name.includes('Molten'))).toBe(true);
    });

    it('2.2 Lập phiếu thuê dụng cụ, tính tiền cọc và tiền thuê', async () => {
      const ticket = await rentalsService.rent({
        itemName: 'Bóng đá Molten Vantaggio 5000',
        quantity: 2,
        customerName: 'Đội Trưởng FC',
        customerPhone: '0988112233',
      });

      expect(ticket.quantity).toBe(2);
      expect(ticket.depositAmount).toBe(400000); // 200k * 2
      expect(ticket.rentalFee).toBe(100000); // 50k * 2
      expect(ticket.totalCollected).toBe(500000);
      expect(ticket.status).toBe('RENTING');
    });

    it('2.3 Hoàn trả dụng cụ và hoàn cọc cho khách', async () => {
      mockRentalTicketModel.findOne.mockResolvedValueOnce({
        ticketCode: 'RENT-20261027-101',
        itemName: 'Bóng đá Molten Vantaggio 5000',
        quantity: 2,
        depositAmount: 400000,
        status: 'RENTING',
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await rentalsService.returnRental({ ticketCode: 'RENT-20261027-101' });
      expect(res.status).toBe('RETURNED');
      expect(res.depositRefunded).toBe(400000);
    });
  });

  // =========================================================================
  // 3. POOL SAFETY & TICKETS
  // =========================================================================
  describe('Pool Service (/pool)', () => {
    it('3.1 Giám sát sức chứa thời gian thực 2 hồ bơi', async () => {
      const status = await poolService.getStatus();
      expect(status.pools.length).toBe(2);
      expect(status.totalCapacity).toBe(120); // 80 + 40
      expect(status.overallOccupancy).toMatch(/\d+%/);
    });

    it('3.2 Xuất vé bơi 120 phút và tăng số người trong hồ', async () => {
      const ticket = await poolService.createTicket({
        poolCode: 'POOL_50M',
        customerName: 'Vận động viên bơi',
        ticketCount: 2,
      });

      expect(ticket.ticketCode).toMatch(/^POOL-BK\d{4}$/);
      expect(ticket.ticketCount).toBe(2);
      expect(ticket.durationMinutes).toBe(120);
      expect(ticket.status).toBe('ACTIVE');
    });

    it('3.3 Khách rời hồ check-out giảm sức chứa', async () => {
      const res = await poolService.checkOut({ poolCode: 'POOL_50M' });
      expect(res.status).toBe('CHECKED_OUT');
    });
  });

  // =========================================================================
  // 4. GYM FACE ID & PACKAGES
  // =========================================================================
  describe('Gym Service (/gym)', () => {
    it('4.1 Lấy danh sách 4 gói tập Gym', async () => {
      const res = await gymService.getPackages();
      expect(res.total).toBe(4);
      expect(res.items.some((p: any) => p.code === 'GYM_YEAR')).toBe(true);
    });

    it('4.2 Nhận diện khuôn mặt Face ID AI và mở cổng xoay Turnstile', async () => {
      const checkin = await gymService.faceCheckIn({ phone: '0900000005' });
      expect(checkin.accessGranted).toBe(true);
      expect(checkin.turnstileAction).toBe('OPEN');
      expect(checkin.message).toContain('Đỗ Văn Khang');
      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith('turnstile_open', expect.anything());
    });

    it('4.3 Đăng ký vector Face ID cho hội viên', async () => {
      const reg = await gymService.registerFace({
        phone: '0900000005',
        faceIdVector: 'VEC_FACE_VECTOR_HASH',
      });
      expect(reg.success).toBe(true);
      expect(reg.isFaceIdActive).toBe(true);
    });
  });

  // =========================================================================
  // 5. CYBER GAMING 100 PC MATRIX
  // =========================================================================
  describe('Gaming Service (/gaming)', () => {
    it('5.1 Lấy sơ đồ ma trận 100 máy trạm RTX 4090', async () => {
      const res = await gamingService.getStations();
      expect(res.summary.totalStations).toBe(100);
      expect(res.stations.length).toBe(100);
      expect(res.stations[0].gpu).toContain('RTX 4090');
    });

    it('5.2 Mở máy trạm và nạp tiền cọc giờ chơi', async () => {
      const session = await gamingService.startSession({
        stationId: 'PC-05',
        customerName: 'Pro Gamer',
        depositVnd: 50000,
      });

      expect(session.stationId).toBe('PC-05');
      expect(session.depositVnd).toBe(50000);
      expect(session.status).toBe('IN_USE');
    });

    it('5.3 Đóng máy trạm, tính cước cuốn chiếu 15 phút và hoàn tiền', async () => {
      const endRes = await gamingService.endSession({ stationId: 'PC-01' });
      expect(endRes.status).toBe('AVAILABLE');
      expect(endRes.billedMinutes % 15).toBe(0);
      expect(endRes.billedCost).toBeGreaterThan(0);
      expect(endRes.depositRefunded).toBeDefined();
    });

    it('5.4 Nạp thêm tiền giờ chơi vào máy đang hoạt động', async () => {
      await gamingService.startSession({ stationId: 'PC-08', depositVnd: 20000 });
      const topup = await gamingService.topup({ stationId: 'PC-08', amountVnd: 30000 });
      expect(topup.newTotalDeposit).toBe(50000);
      expect(topup.additionalMinutes).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. WALLET PHANTA PAY & IMMUTABLE LEDGER
  // =========================================================================
  describe('Wallet Service (/wallet)', () => {
    it('6.1 Xem số dư ví và hạng hội viên', async () => {
      const bal = await walletService.getBalance('0900000005');
      expect(bal.phone).toBe('0900000005');
      expect(bal.walletBalance).toBe(1500000);
      expect(bal.membershipTier).toBe(MembershipTier.GOLD);
    });

    it('6.2 Nạp tiền vào ví và ghi sổ cái bất biến', async () => {
      const res = await walletService.topup({
        phone: '0900000005',
        amount: 500000,
        paymentMethod: 'VIETQR',
      });

      expect(res.amount).toBe(500000);
      expect(res.walletBalance).toBe(2000000);
      expect(res.ledgerId).toBeDefined();
    });

    it('6.3 Thanh toán dịch vụ bằng số dư ví và tích điểm', async () => {
      mockUser.walletBalance = 2000000;
      const res = await walletService.pay({
        phone: '0900000005',
        amount: 300000,
        serviceType: 'BOOKING',
      });

      expect(res.walletBalance).toBe(1700000);
      expect(res.pointsAwarded).toBe(15000); // 5% của 300k
      expect(res.ledgerId).toBeDefined();
    });

    it('6.4 Chặn thanh toán khi số dư ví không đủ', async () => {
      mockUser.walletBalance = 50000;
      await expect(
        walletService.pay({
          phone: '0900000005',
          amount: 500000,
          serviceType: 'BOOKING',
        }),
      ).rejects.toThrow('Số dư ví không đủ');
    });

    it('6.5 Hoàn tiền tức thì trong 3 giây khi hủy đặt sân', async () => {
      mockUser.walletBalance = 1000000;
      const res = await walletService.refund({
        phone: '0900000005',
        amount: 200000,
        reason: 'Khách báo bận hủy sân trước 12 tiếng',
      });

      expect(res.walletBalance).toBe(1200000);
      expect(res.refundSpeed).toBe('< 3s');
      expect(res.ledgerId).toBeDefined();
    });

    it('6.6 Lấy lịch sử giao dịch ví có phân trang và STT', async () => {
      const hist = await walletService.getHistory('0900000005', undefined, 1, 10);
      expect(hist.total).toBe(1);
      expect(hist.items[0].stt).toBe(1);
      expect(hist.items[0].type).toBe(LedgerType.TOPUP);
    });
  });
});
