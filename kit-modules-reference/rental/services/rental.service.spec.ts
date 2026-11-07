import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RentalService } from './rental.service.js';
import { RentalTicket } from '../schemas/rental-ticket.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { EquipmentService } from './equipment.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  RentalPricingType,
  RentalTicketStatus,
  RentalItemCondition,
  PaymentMethod,
  WalletCategory,
  CashierShiftStatus,
} from '@sports/shared';

describe('RentalService', () => {
  let service: RentalService;
  let mockTicketModel: any;
  let mockUserModel: any;
  let mockEquipmentService: any;
  let mockCashierShiftService: any;
  let mockWalletService: any;
  let mockAuditLogService: any;

  const inMemoryTickets: any[] = [];
  const inMemoryUsers: any[] = [];
  const inMemoryEquipments: any[] = [];

  beforeEach(async () => {
    inMemoryTickets.length = 0;
    inMemoryUsers.length = 0;
    inMemoryEquipments.length = 0;

    mockTicketModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryTickets.findIndex((t) => t._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryTickets[idx] = { ...this };
        } else {
          inMemoryTickets.push({ ...this });
        }
        return this;
      }),
    }));

    mockTicketModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryTickets.find((t) => {
        if (query.idempotencyKey && t.idempotencyKey === query.idempotencyKey) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockTicketModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryTickets.find(
        (t) => t._id.toString() === id.toString() || t.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryTickets.findIndex((t) => t._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryTickets[idx] = { ...this };
          return this;
        }),
      });
    });

    mockTicketModel.find = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(() => {
        let results = [...inMemoryTickets];
        if (query.shiftId) {
          results = results.filter((t) => t.shiftId.toString() === query.shiftId.toString());
        }
        if (query.status?.$in) {
          results = results.filter((t) => query.status.$in.includes(t.status));
        }
        return Promise.resolve(results);
      }),
    }));

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        const found = inMemoryUsers.find((u) => u.phone === query.phone);
        return Promise.resolve(found ? { ...found } : null);
      }),
    };

    mockEquipmentService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const found = inMemoryEquipments.find(
          (e) => e._id.toString() === id.toString() || e.id === id.toString(),
        );
        if (!found) {
          throw new NotFoundException('Không tìm thấy dụng cụ');
        }
        return found;
      }),
      reserveEquipments: jest.fn().mockResolvedValue(undefined),
      releaseEquipments: jest.fn().mockResolvedValue(undefined),
      rollbackReservation: jest.fn().mockResolvedValue(undefined),
    };

    mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        shiftCode: 'SHIFT-001',
        status: CashierShiftStatus.OPEN,
      }),
      recordOrderSales: jest.fn().mockResolvedValue(undefined),
      recordOrderRefund: jest.fn().mockResolvedValue(undefined),
    };

    mockWalletService = {
      pay: jest.fn().mockResolvedValue({ success: true }),
      refund: jest.fn().mockResolvedValue({ success: true }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalService,
        { provide: getModelToken(RentalTicket.name), useValue: mockTicketModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: EquipmentService, useValue: mockEquipmentService },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<RentalService>(RentalService);
  });

  describe('createRentalTicket', () => {
    it('should return existing ticket if idempotencyKey already exists', async () => {
      const existingTicket = {
        _id: new Types.ObjectId(),
        ticketCode: 'RNT-20261026-TEST',
        idempotencyKey: 'idemp-rent-1',
        totalRentalAmount: 50000,
      };
      inMemoryTickets.push(existingTicket);

      const result = await service.createRentalTicket('cashier-1', {
        idempotencyKey: 'idemp-rent-1',
        paymentMethod: PaymentMethod.CASH,
        customerPhone: '0901234567',
        items: [{ equipmentId: 'eq-1', quantity: 1 }],
      });

      expect(result.ticketCode).toBe('RNT-20261026-TEST');
      expect(mockEquipmentService.reserveEquipments).not.toHaveBeenCalled();
    });

    it('should throw NO_ACTIVE_SHIFT if cashier has no open shift', async () => {
      mockCashierShiftService.getActiveShift.mockResolvedValueOnce(null);

      await expect(
        service.createRentalTicket('cashier-1', {
          idempotencyKey: 'idemp-rent-2',
          paymentMethod: PaymentMethod.CASH,
          customerPhone: '0901234567',
          items: [{ equipmentId: 'eq-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw CUSTOMER_NOT_FOUND when paying via INTERNAL_WALLET but customer phone does not exist', async () => {
      await expect(
        service.createRentalTicket('cashier-1', {
          idempotencyKey: 'idemp-rent-3',
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          customerPhone: '0999999999',
          items: [{ equipmentId: 'eq-1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw EQUIPMENT_INACTIVE if equipment is inactive', async () => {
      const eqId = new Types.ObjectId();
      inMemoryEquipments.push({
        _id: eqId,
        code: 'EQ-INACTIVE',
        name: 'Vợt cầu lông hỏng',
        price: 20000,
        depositAmount: 100000,
        pricingType: RentalPricingType.HOURLY,
        isActive: false,
      });

      await expect(
        service.createRentalTicket('cashier-1', {
          idempotencyKey: 'idemp-rent-4',
          paymentMethod: PaymentMethod.CASH,
          customerPhone: '0901234567',
          items: [{ equipmentId: eqId.toString(), quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create rental ticket with CASH and record sales to shift', async () => {
      const eqId = new Types.ObjectId();
      inMemoryEquipments.push({
        _id: eqId,
        code: 'RACKET-01',
        name: 'Vợt Tennis Pro',
        price: 50000,
        depositAmount: 200000,
        pricingType: RentalPricingType.HOURLY,
        isActive: true,
      });

      const ticket = await service.createRentalTicket('cashier-1', {
        idempotencyKey: 'idemp-rent-cash',
        paymentMethod: PaymentMethod.CASH,
        rentHours: 2,
        customerPhone: '0901234567',
        customerName: 'Nguyễn Văn A',
        items: [{ equipmentId: eqId.toString(), quantity: 2 }],
      });

      // Price: 50000 * 2 hours * 2 rackets = 200,000 VND
      // Deposit: 200000 * 2 rackets = 400,000 VND
      // Total pay: 600,000 VND
      expect(ticket.totalRentalAmount).toBe(200000);
      expect(ticket.totalDepositAmount).toBe(400000);
      expect(ticket.status).toBe(RentalTicketStatus.RENTING);
      expect(mockEquipmentService.reserveEquipments).toHaveBeenCalledWith([
        { equipmentId: eqId.toString(), quantity: 2 },
      ]);
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        expect.any(String),
        600000,
        PaymentMethod.CASH,
      );
    });

    it('should allow INTERNAL_WALLET payment for rental with WalletCategory.RENTAL and rollback on error', async () => {
      const customerId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: customerId,
        phone: '0912345678',
        fullName: 'Khách Hàng Ví',
      });

      const eqId = new Types.ObjectId();
      inMemoryEquipments.push({
        _id: eqId,
        code: 'BALL-01',
        name: 'Bóng rổ Molten',
        price: 30000,
        depositAmount: 100000,
        pricingType: RentalPricingType.PER_TURN,
        isActive: true,
      });

      // 1. Success wallet payment
      const ticket = await service.createRentalTicket('cashier-1', {
        idempotencyKey: 'idemp-rent-wal-ok',
        paymentMethod: PaymentMethod.INTERNAL_WALLET,
        customerPhone: '0912345678',
        items: [{ equipmentId: eqId.toString(), quantity: 1 }],
      });

      expect(ticket.totalRentalAmount).toBe(30000);
      expect(ticket.totalDepositAmount).toBe(100000);
      expect(mockWalletService.pay).toHaveBeenCalledWith(
        customerId.toString(),
        expect.objectContaining({
          amount: 130000,
          category: WalletCategory.RENTAL,
        }),
        'cashier-1',
      );

      // 2. Failed wallet payment -> rollback
      mockWalletService.pay.mockRejectedValueOnce(new BadRequestException('Số dư ví không đủ'));

      await expect(
        service.createRentalTicket('cashier-1', {
          idempotencyKey: 'idemp-rent-wal-fail',
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          customerPhone: '0912345678',
          items: [{ equipmentId: eqId.toString(), quantity: 1 }],
        }),
      ).rejects.toThrow('Số dư ví không đủ');

      expect(mockEquipmentService.rollbackReservation).toHaveBeenCalledWith([
        { equipmentId: eqId.toString(), quantity: 1 },
      ]);
    });
  });

  describe('returnRentalTicket', () => {
    it('should return ticket in GOOD condition, 100% deposit refunded', async () => {
      const eqId = new Types.ObjectId();
      const ticketId = new Types.ObjectId();
      const shiftId = new Types.ObjectId();
      const customerId = new Types.ObjectId();

      inMemoryEquipments.push({
        _id: eqId,
        code: 'EQ-01',
        name: 'Vợt cầu lông',
        damageFee: 50000,
        lostFee: 200000,
      });

      const initialTicket = {
        _id: ticketId,
        ticketCode: 'RNT-20261026-0001',
        shiftId,
        customerId,
        idempotencyKey: 'idemp-rent-return-1',
        status: RentalTicketStatus.RENTING,
        paymentMethod: PaymentMethod.INTERNAL_WALLET,
        totalRentalAmount: 40000,
        totalDepositAmount: 200000,
        items: [
          {
            equipmentId: eqId,
            code: 'EQ-01',
            name: 'Vợt cầu lông',
            quantity: 1,
            unitPrice: 40000,
            depositPerUnit: 200000,
          },
        ],
      };
      inMemoryTickets.push(initialTicket);

      const returned = await service.returnRentalTicket(ticketId.toString(), 'cashier-1', {
        items: [
          {
            equipmentId: eqId.toString(),
            quantity: 1,
            condition: RentalItemCondition.GOOD,
          },
        ],
      });

      expect(returned.status).toBe(RentalTicketStatus.RETURNED);
      expect(returned.totalPenaltyFee).toBe(0);
      expect(returned.refundDepositAmount).toBe(200000);
      expect(mockEquipmentService.releaseEquipments).toHaveBeenCalledWith([
        { equipmentId: eqId.toString(), quantity: 1, condition: RentalItemCondition.GOOD },
      ]);
      expect(mockWalletService.refund).toHaveBeenCalledWith(
        customerId.toString(),
        200000,
        'EQUIPMENT_RENTAL',
        'RNT-20261026-0001',
        'REF_RENT_idemp-rent-return-1',
        expect.any(String),
        'cashier-1',
      );
    });

    it('should deduct penalty for DAMAGED or LOST items and refund remaining deposit', async () => {
      const eqDamagedId = new Types.ObjectId();
      const eqLostId = new Types.ObjectId();
      const ticketId = new Types.ObjectId();
      const shiftId = new Types.ObjectId();

      inMemoryEquipments.push(
        {
          _id: eqDamagedId,
          code: 'EQ-DAMAGED',
          name: 'Vợt Tennis',
          damageFee: 70000,
          lostFee: 500000,
        },
        {
          _id: eqLostId,
          code: 'EQ-LOST',
          name: 'Bóng thi đấu',
          damageFee: 0,
          lostFee: 80000,
        },
      );

      const initialTicket = {
        _id: ticketId,
        ticketCode: 'RNT-20261026-0002',
        shiftId,
        idempotencyKey: 'idemp-rent-return-2',
        status: RentalTicketStatus.RENTING,
        paymentMethod: PaymentMethod.CASH,
        totalRentalAmount: 100000,
        totalDepositAmount: 300000,
        items: [
          {
            equipmentId: eqDamagedId,
            code: 'EQ-DAMAGED',
            name: 'Vợt Tennis',
            quantity: 1,
            unitPrice: 50000,
            depositPerUnit: 200000,
          },
          {
            equipmentId: eqLostId,
            code: 'EQ-LOST',
            name: 'Bóng thi đấu',
            quantity: 1,
            unitPrice: 50000,
            depositPerUnit: 100000,
          },
        ],
      };
      inMemoryTickets.push(initialTicket);

      const returned = await service.returnRentalTicket(ticketId.toString(), 'cashier-1', {
        items: [
          {
            equipmentId: eqDamagedId.toString(),
            quantity: 1,
            condition: RentalItemCondition.DAMAGED,
          },
          {
            equipmentId: eqLostId.toString(),
            quantity: 1,
            condition: RentalItemCondition.LOST,
          },
        ],
      });

      // Total deposit: 300,000 VND
      // Penalty: 70,000 (damage) + 80,000 (lost) = 150,000 VND
      // Refund deposit: 300,000 - 150,000 = 150,000 VND
      expect(returned.totalPenaltyFee).toBe(150000);
      expect(returned.refundDepositAmount).toBe(150000);
      expect(mockCashierShiftService.recordOrderRefund).toHaveBeenCalledWith(
        shiftId.toString(),
        150000,
        PaymentMethod.CASH,
      );
      expect(mockEquipmentService.releaseEquipments).toHaveBeenCalledWith([
        { equipmentId: eqDamagedId.toString(), quantity: 1, condition: RentalItemCondition.DAMAGED },
        { equipmentId: eqLostId.toString(), quantity: 1, condition: RentalItemCondition.LOST },
      ]);
    });

    it('should reject return if ticket is already returned', async () => {
      const ticketId = new Types.ObjectId();
      inMemoryTickets.push({
        _id: ticketId,
        status: RentalTicketStatus.RETURNED,
        items: [],
      });

      await expect(
        service.returnRentalTicket(ticketId.toString(), 'cashier-1', { items: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUnreturnedRentalsForShift & getUsageReport', () => {
    it('should find unreturned rentals for shift', async () => {
      const shiftId = new Types.ObjectId();
      inMemoryTickets.push(
        {
          _id: new Types.ObjectId(),
          shiftId,
          status: RentalTicketStatus.RENTING,
        },
        {
          _id: new Types.ObjectId(),
          shiftId,
          status: RentalTicketStatus.OVERDUE,
        },
        {
          _id: new Types.ObjectId(),
          shiftId,
          status: RentalTicketStatus.RETURNED,
        },
      );

      const unreturned = await service.getUnreturnedRentalsForShift(shiftId.toString());
      expect(unreturned.length).toBe(2);
    });

    it('should aggregate rental usage report correctly', async () => {
      inMemoryTickets.push(
        {
          totalRentalAmount: 100000,
          totalDepositAmount: 300000,
          refundDepositAmount: 250000,
          totalPenaltyFee: 50000,
          items: [
            { quantity: 1, returnCondition: RentalItemCondition.DAMAGED },
            { quantity: 1, returnCondition: RentalItemCondition.GOOD },
          ],
        },
        {
          totalRentalAmount: 50000,
          totalDepositAmount: 100000,
          refundDepositAmount: 0,
          totalPenaltyFee: 100000,
          items: [{ quantity: 1, returnCondition: RentalItemCondition.LOST }],
        },
      );

      const report = await service.getUsageReport();
      expect(report.totalTickets).toBe(2);
      expect(report.totalRevenue).toBe(150000);
      expect(report.totalDepositCollected).toBe(400000);
      expect(report.totalDepositRefunded).toBe(250000);
      expect(report.totalPenaltyCollected).toBe(150000);
      expect(report.damagedItemCount).toBe(1);
      expect(report.lostItemCount).toBe(1);
    });
  });
});
