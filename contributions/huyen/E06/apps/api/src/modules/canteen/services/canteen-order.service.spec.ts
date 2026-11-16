import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CanteenOrderService } from './canteen-order.service.js';
import { CanteenOrder } from '../schemas/canteen-order.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { InventoryService } from './inventory.service.js';
import { CashierShiftService } from './cashier-shift.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { InvoiceService } from '../../invoice/services/invoice.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  ProductCategory,
  PaymentMethod,
  CanteenOrderStatus,
  CashierShiftStatus,
} from '@sports/shared';

describe('CanteenOrderService', () => {
  let service: CanteenOrderService;
  let mockOrderModel: any;
  let mockUserModel: any;
  let mockInventoryService: any;
  let mockCashierShiftService: any;
  let mockWalletService: any;
  let mockInvoiceService: any;
  let mockAuditLogService: any;

  const inMemoryOrders: any[] = [];
  const inMemoryUsers: any[] = [];
  const inMemoryProducts: any[] = [];

  beforeEach(async () => {
    inMemoryOrders.length = 0;
    inMemoryUsers.length = 0;
    inMemoryProducts.length = 0;

    mockOrderModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryOrders.findIndex((o) => o._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryOrders[idx] = { ...this };
        } else {
          inMemoryOrders.push({ ...this });
        }
        return this;
      }),
    }));

    mockOrderModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryOrders.find((o) => {
        if (query.idempotencyKey && o.idempotencyKey === query.idempotencyKey) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockOrderModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryOrders.find(
        (o) => o._id.toString() === id.toString() || o.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryOrders.findIndex((o) => o._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryOrders[idx] = { ...this };
          return this;
        }),
      });
    });

    mockOrderModel.find = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryOrders),
    }));

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        const found = inMemoryUsers.find((u) => u.phone === query.phone);
        return Promise.resolve(found ? { ...found } : null);
      }),
    };

    mockInventoryService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const found = inMemoryProducts.find(
          (p) => p._id.toString() === id.toString() || p.id === id.toString(),
        );
        if (!found) {
          throw new NotFoundException('Không tìm thấy sản phẩm');
        }
        return found;
      }),
      deductStockForOrder: jest.fn().mockResolvedValue(undefined),
      restoreStockForCancelledOrder: jest.fn().mockResolvedValue(undefined),
    };

    mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        shiftCode: 'SHF-20261026-TEST',
        status: CashierShiftStatus.OPEN,
      }),
      recordOrderSales: jest.fn().mockResolvedValue(undefined),
      recordOrderRefund: jest.fn().mockResolvedValue(undefined),
    };

    mockWalletService = {
      pay: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      refund: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    mockInvoiceService = {
      createInvoice: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      cancelInvoice: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanteenOrderService,
        { provide: getModelToken(CanteenOrder.name), useValue: mockOrderModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<CanteenOrderService>(CanteenOrderService);
  });

  describe('createPosOrder', () => {
    it('từ chối tạo đơn nếu thu ngân chưa mở ca làm việc (Bất biến SPEC Rule 2)', async () => {
      mockCashierShiftService.getActiveShift.mockResolvedValueOnce(null);

      await expect(
        service.createPosOrder(new Types.ObjectId().toString(), {
          items: [{ productId: new Types.ObjectId().toString(), quantity: 1 }],
          paymentMethod: PaymentMethod.CASH,
          idempotencyKey: 'IDEMP_POS_001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối thanh toán bằng ví nội bộ nếu giỏ hàng có mặt hàng RETAIL (Bất biến SPEC Rule 1)', async () => {
      const cashierId = new Types.ObjectId().toString();
      const customerId = new Types.ObjectId();
      inMemoryUsers.push({ _id: customerId, phone: '0988888888', fullName: 'Khách Hàng' });

      // Sản phẩm RETAIL (bóng tennis)
      const retailProdId = new Types.ObjectId();
      inMemoryProducts.push({
        _id: retailProdId,
        id: retailProdId.toString(),
        sku: 'BALL01',
        name: 'Hộp bóng tennis',
        category: ProductCategory.RETAIL,
        unit: 'hộp',
        price: 120000,
        costPrice: 80000,
        vatRate: 8,
        isActive: true,
      });

      await expect(
        service.createPosOrder(cashierId, {
          items: [{ productId: retailProdId.toString(), quantity: 1 }],
          customerPhone: '0988888888',
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          idempotencyKey: 'IDEMP_POS_RETAIL_WALLET',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cho phép thanh toán bằng ví nội bộ khi toàn bộ món thuộc nhóm CANTEEN', async () => {
      const cashierId = new Types.ObjectId().toString();
      const customerId = new Types.ObjectId();
      inMemoryUsers.push({ _id: customerId, phone: '0988888888', fullName: 'Khách Hàng' });

      // Sản phẩm CANTEEN (nước tăng lực)
      const canteenProdId = new Types.ObjectId();
      inMemoryProducts.push({
        _id: canteenProdId,
        id: canteenProdId.toString(),
        sku: 'DRINK01',
        name: 'Nước tăng lực Redbull',
        category: ProductCategory.CANTEEN,
        unit: 'lon',
        price: 20000,
        costPrice: 12000,
        vatRate: 8,
        isActive: true,
      });

      const order = await service.createPosOrder(cashierId, {
        items: [{ productId: canteenProdId.toString(), quantity: 2 }],
        customerPhone: '0988888888',
        paymentMethod: PaymentMethod.INTERNAL_WALLET,
        idempotencyKey: 'IDEMP_POS_CANTEEN_WALLET',
      });

      expect(order.status).toBe(CanteenOrderStatus.COMPLETED);
      expect(order.totalAmount).toBe(40000);
      expect(mockWalletService.pay).toHaveBeenCalledTimes(1);
      expect(mockInventoryService.deductStockForOrder).toHaveBeenCalledTimes(1);
      expect(mockInvoiceService.createInvoice).toHaveBeenCalledTimes(1);
    });

    it('thanh toán tiền mặt thành công, tự động tính tiền thừa và ghi nhận ca', async () => {
      const cashierId = new Types.ObjectId().toString();

      const prodId = new Types.ObjectId();
      inMemoryProducts.push({
        _id: prodId,
        id: prodId.toString(),
        sku: 'FOOD01',
        name: 'Mì ly Omachi',
        category: ProductCategory.CANTEEN,
        unit: 'ly',
        price: 15000,
        costPrice: 9000,
        vatRate: 8,
        isActive: true,
      });

      const order = await service.createPosOrder(cashierId, {
        items: [{ productId: prodId.toString(), quantity: 2 }],
        paymentMethod: PaymentMethod.CASH,
        cashGiven: 50000,
        idempotencyKey: 'IDEMP_POS_CASH_01',
      });

      expect(order.totalAmount).toBe(30000);
      expect(order.paidAmount).toBe(50000);
      expect(order.changeAmount).toBe(20000); // Tiền thừa: 20.000 đ
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        expect.any(String),
        30000,
        PaymentMethod.CASH,
      );
    });
  });

  describe('cancelOrder (F12.4)', () => {
    it('hủy đơn hàng thành công, hoàn kho nguyên tử và hoàn tiền', async () => {
      const cashierId = new Types.ObjectId().toString();
      const customerId = new Types.ObjectId();
      const prodId = new Types.ObjectId();

      inMemoryProducts.push({
        _id: prodId,
        id: prodId.toString(),
        sku: 'FOOD02',
        name: 'Bánh mì',
        category: ProductCategory.CANTEEN,
        unit: 'cái',
        price: 25000,
        costPrice: 15000,
        vatRate: 8,
        isActive: true,
      });

      inMemoryUsers.push({ _id: customerId, phone: '0977777777', fullName: 'Khách Hủy' });

      const order = await service.createPosOrder(cashierId, {
        items: [{ productId: prodId.toString(), quantity: 2 }],
        customerPhone: '0977777777',
        paymentMethod: PaymentMethod.INTERNAL_WALLET,
        idempotencyKey: 'IDEMP_POS_TO_CANCEL',
      });

      const cancelled = await service.cancelOrder(order._id.toString(), cashierId, {
        reason: 'Khách đổi ý không mua nữa',
      });

      expect(cancelled.status).toBe(CanteenOrderStatus.CANCELLED);
      expect(cancelled.cancelReason).toBe('Khách đổi ý không mua nữa');
      expect(mockInventoryService.restoreStockForCancelledOrder).toHaveBeenCalledTimes(1);
      expect(mockWalletService.refund).toHaveBeenCalledTimes(1);
      expect(mockAuditLogService.record).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProfitReport (F12.9)', () => {
    it('tính toán chính xác tổng doanh thu, giá vốn và lãi gộp', async () => {
      const cashierId = new Types.ObjectId().toString();
      const prodId = new Types.ObjectId();

      inMemoryProducts.push({
        _id: prodId,
        id: prodId.toString(),
        sku: 'FOOD03',
        name: 'Xúc xích',
        category: ProductCategory.CANTEEN,
        unit: 'cây',
        price: 20000,
        costPrice: 12000,
        vatRate: 8,
        isActive: true,
      });

      // Tạo 1 đơn: 3 cây x 20.000 = 60.000 đ. Giá vốn = 3 x 12.000 = 36.000 đ. Lãi gộp = 24.000 đ
      await service.createPosOrder(cashierId, {
        items: [{ productId: prodId.toString(), quantity: 3 }],
        paymentMethod: PaymentMethod.CASH,
        cashGiven: 60000,
        idempotencyKey: 'IDEMP_PROFIT_01',
      });

      const report = await service.getProfitReport();

      expect(report.totalSales).toBe(60000);
      expect(report.totalCost).toBe(36000);
      expect(report.grossProfit).toBe(24000);
      expect(report.profitMarginPercent).toBe(40); // (24.000 / 60.000) * 100 = 40%
      expect(report.orderCount).toBe(1);
    });
  });
});
