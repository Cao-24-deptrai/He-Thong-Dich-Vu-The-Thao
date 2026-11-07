import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EquipmentService } from './equipment.service.js';
import { Equipment } from '../schemas/equipment.schema.js';
import { RentalPricingType, RentalItemCondition } from '@sports/shared';
import { SportType } from '@sports/contracts';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let mockEquipmentModel: any;

  const inMemoryEquipments: any[] = [];

  beforeEach(async () => {
    inMemoryEquipments.length = 0;

    mockEquipmentModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      totalQuantity: data.totalQuantity,
      rentedQuantity: data.rentedQuantity ?? 0,
      damagedQuantity: data.damagedQuantity ?? 0,
      availableQuantity: data.availableQuantity ?? data.totalQuantity,
      isActive: data.isActive ?? true,
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryEquipments.findIndex((e) => e._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryEquipments[idx] = { ...this };
        } else {
          inMemoryEquipments.push({ ...this });
        }
        return this;
      }),
    }));

    mockEquipmentModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryEquipments.find((e) => {
        if (query.code && e.code === query.code) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockEquipmentModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryEquipments.find(
        (e) => e._id.toString() === id.toString() || e.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryEquipments.findIndex((e) => e._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryEquipments[idx] = { ...this };
          return this;
        }),
      });
    });

    mockEquipmentModel.findOneAndUpdate = jest.fn().mockImplementation((query, update, options) => {
      const idx = inMemoryEquipments.findIndex((e) => {
        if (e._id.toString() !== query._id.toString()) return false;
        if (query.isActive !== undefined && e.isActive !== query.isActive) return false;
        if (query.availableQuantity?.$gte !== undefined && e.availableQuantity < query.availableQuantity.$gte) return false;
        return true;
      });

      if (idx < 0) return Promise.resolve(null);

      const target = inMemoryEquipments[idx];
      const beforeAvail = target.availableQuantity;

      if (update.$inc?.availableQuantity) {
        target.availableQuantity += update.$inc.availableQuantity;
      }
      if (update.$inc?.rentedQuantity) {
        target.rentedQuantity += update.$inc.rentedQuantity;
      }

      inMemoryEquipments[idx] = target;

      return Promise.resolve(
        options?.new
          ? { ...target, beforeAvail }
          : { ...target, availableQuantity: beforeAvail },
      );
    });

    mockEquipmentModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryEquipments.find((e) => e._id.toString() === query._id.toString());
      if (target && update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          target[k] = (target[k] || 0) + (v as number);
        }
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    mockEquipmentModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => inMemoryEquipments),
    }));

    mockEquipmentModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryEquipments.length),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getModelToken(Equipment.name), useValue: mockEquipmentModel },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  describe('createEquipment', () => {
    it('tạo dụng cụ mới thành công và số lượng khả dụng ban đầu bằng tổng số lượng', async () => {
      const created = await service.createEquipment({
        code: 'rk01',
        name: 'Vợt tennis Wilson Pro Staff',
        sportType: SportType.TENNIS,
        pricingType: RentalPricingType.PER_TURN,
        price: 50000,
        depositAmount: 200000,
        damageFee: 100000,
        lostFee: 500000,
        totalQuantity: 10,
      });

      expect(created.code).toBe('RK01');
      expect(created.availableQuantity).toBe(10);
      expect(created.rentedQuantity).toBe(0);
      expect(created.damagedQuantity).toBe(0);
      expect(inMemoryEquipments).toHaveLength(1);
    });

    it('từ chối tạo dụng cụ nếu mã code đã tồn tại', async () => {
      await service.createEquipment({
        code: 'RK01',
        name: 'Vợt tennis 1',
        totalQuantity: 5,
        price: 50000,
      });

      await expect(
        service.createEquipment({
          code: 'rk01',
          name: 'Vợt tennis trùng mã',
          totalQuantity: 3,
          price: 50000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reserveEquipments & releaseEquipments', () => {
    it('giữ số lượng khả dụng thành công và trả đồ tốt thì phục hồi khả dụng', async () => {
      const eq = await service.createEquipment({
        code: 'BALL01',
        name: 'Rổ bóng tennis',
        totalQuantity: 8,
        price: 30000,
      });

      // Thuê 3 cái
      await service.reserveEquipments([{ equipmentId: eq._id.toString(), quantity: 3 }]);

      let reloaded = await service.findById(eq._id.toString());
      expect(reloaded.availableQuantity).toBe(5);
      expect(reloaded.rentedQuantity).toBe(3);

      // Trả 3 cái trong tình trạng TỐT (GOOD)
      await service.releaseEquipments([
        { equipmentId: eq._id.toString(), quantity: 3, condition: RentalItemCondition.GOOD },
      ]);

      reloaded = await service.findById(eq._id.toString());
      expect(reloaded.availableQuantity).toBe(8);
      expect(reloaded.rentedQuantity).toBe(0);
    });

    it('trả đồ trong tình trạng HỎNG hoặc MẤT thì cách ly và không đưa lại vào khả dụng (SPEC Rule)', async () => {
      const eq = await service.createEquipment({
        code: 'RACKET_BAD',
        name: 'Vợt cầu lông Yonex',
        totalQuantity: 10,
        price: 40000,
      });

      // Thuê 4 cây vợt
      await service.reserveEquipments([{ equipmentId: eq._id.toString(), quantity: 4 }]);

      // Trả đồ: 2 cây TỐT, 1 cây HỎNG (gãy cán), 1 cây MẤT
      await service.releaseEquipments([
        { equipmentId: eq._id.toString(), quantity: 2, condition: RentalItemCondition.GOOD },
        { equipmentId: eq._id.toString(), quantity: 1, condition: RentalItemCondition.DAMAGED },
        { equipmentId: eq._id.toString(), quantity: 1, condition: RentalItemCondition.LOST },
      ]);

      const reloaded = await service.findById(eq._id.toString());
      // Khả dụng ban đầu 10, thuê 4 -> còn 6. Trả tốt 2 -> khả dụng thành 8.
      expect(reloaded.availableQuantity).toBe(8);
      expect(reloaded.rentedQuantity).toBe(0);
      expect(reloaded.damagedQuantity).toBe(2); // 1 hỏng + 1 mất được ghi nhận vào damagedQuantity
    });

    it('từ chối giữ đồ nếu số lượng yêu cầu vượt quá số lượng khả dụng (Chống thuê vượt)', async () => {
      const eq = await service.createEquipment({
        code: 'SHOES01',
        name: 'Giày tennis size 42',
        totalQuantity: 2,
        price: 30000,
      });

      await expect(
        service.reserveEquipments([{ equipmentId: eq._id.toString(), quantity: 5 }]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
