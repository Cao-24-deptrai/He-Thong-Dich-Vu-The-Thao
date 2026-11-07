import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CashierShiftService } from './cashier-shift.service.js';
import { CashierShift } from '../schemas/cashier-shift.schema.js';
import { CashierShiftStatus, PaymentMethod } from '@sports/shared';

describe('CashierShiftService', () => {
  let service: CashierShiftService;
  let mockShiftModel: any;

  const inMemoryShifts: any[] = [];

  beforeEach(async () => {
    inMemoryShifts.length = 0;

    mockShiftModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryShifts.findIndex((s) => s._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryShifts[idx] = { ...this };
        } else {
          inMemoryShifts.push({ ...this });
        }
        return this;
      }),
    }));

    mockShiftModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryShifts.find((s) => {
        if (query.cashierId && s.cashierId.toString() !== query.cashierId.toString()) return false;
        if (query.status && s.status !== query.status) return false;
        return true;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockShiftModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryShifts.find(
        (s) => s._id.toString() === id.toString() || s.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryShifts.findIndex((s) => s._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryShifts[idx] = { ...this };
          return this;
        }),
      });
    });

    mockShiftModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryShifts.find((s) => s._id.toString() === query._id.toString());
      if (target && update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          target[k] = (target[k] || 0) + (v as number);
        }
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashierShiftService,
        { provide: getModelToken(CashierShift.name), useValue: mockShiftModel },
      ],
    }).compile();

    service = module.get<CashierShiftService>(CashierShiftService);
  });

  describe('openShift (F12.5)', () => {
    it('mở ca thu ngân thành công với tiền đầu ca', async () => {
      const cashierId = new Types.ObjectId().toString();
      const shift = await service.openShift(cashierId, 'Nguyễn Văn Thu Ngân', {
        openingCash: 1000000,
        notes: 'Tiền lẻ đầu ca',
      });

      expect(shift.status).toBe(CashierShiftStatus.OPEN);
      expect(shift.openingCash).toBe(1000000);
      expect(shift.shiftCode).toMatch(/^SHF-\d{8}-[A-Z0-9]{4}$/);
      expect(inMemoryShifts).toHaveLength(1);
    });

    it('từ chối mở ca nếu thu ngân đang có ca mở chưa chốt (Bất biến SPEC Rule 2)', async () => {
      const cashierId = new Types.ObjectId().toString();
      await service.openShift(cashierId, 'Nguyễn Văn Thu Ngân', {
        openingCash: 1000000,
      });

      await expect(
        service.openShift(cashierId, 'Nguyễn Văn Thu Ngân', {
          openingCash: 500000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordOrderSales & closeShift', () => {
    it('ghi nhận doanh thu các phương thức và chốt ca tính chênh lệch chính xác', async () => {
      const cashierId = new Types.ObjectId().toString();
      const shift = await service.openShift(cashierId, 'Thu Ngân 01', {
        openingCash: 500000,
      });

      // Bán hàng: 1 đơn tiền mặt 200.000 đ, 1 đơn QR 150.000 đ, 1 đơn ví 50.000 đ
      await service.recordOrderSales(shift._id.toString(), 200000, PaymentMethod.CASH);
      await service.recordOrderSales(shift._id.toString(), 150000, PaymentMethod.VIETQR);
      await service.recordOrderSales(shift._id.toString(), 50000, PaymentMethod.INTERNAL_WALLET);

      // Tiền mặt dự kiến = 500.000 (đầu ca) + 200.000 (thu tiền mặt) = 700.000 đ
      // Thực tế đếm cuối ca: 710.000 đ (thừa 10.000 đ)
      const closed = await service.closeShift(shift._id.toString(), cashierId, {
        closingCashActual: 710000,
        notes: 'Khách không lấy tiền thừa 10k',
      });

      expect(closed.status).toBe(CashierShiftStatus.CLOSED);
      expect(closed.closingCashExpected).toBe(700000);
      expect(closed.closingCashActual).toBe(710000);
      expect(closed.difference).toBe(10000); // Thừa 10.000 đ
    });

    it('từ chối chốt ca nếu ca đã được chốt trước đó', async () => {
      const cashierId = new Types.ObjectId().toString();
      const shift = await service.openShift(cashierId, 'Thu Ngân 02', {
        openingCash: 500000,
      });

      await service.closeShift(shift._id.toString(), cashierId, {
        closingCashActual: 500000,
      });

      await expect(
        service.closeShift(shift._id.toString(), cashierId, {
          closingCashActual: 500000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
