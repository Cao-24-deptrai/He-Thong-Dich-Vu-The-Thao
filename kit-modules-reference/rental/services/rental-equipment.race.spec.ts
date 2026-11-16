import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EquipmentService } from './equipment.service.js';
import { Equipment } from '../schemas/equipment.schema.js';
import { RentalPricingType } from '@sports/shared';

describe('EquipmentService Concurrency Defense (20 Concurrent Rentals for 5 Available Units Race)', () => {
  let service: EquipmentService;

  let currentAvailable = 5;
  let currentRented = 0;
  const equipmentId = new Types.ObjectId();

  beforeEach(async () => {
    currentAvailable = 5;
    currentRented = 0;

    let lock = Promise.resolve();

    const mockEquipmentModel: any = jest.fn();

    mockEquipmentModel.findById = jest.fn().mockImplementation((id: string) => {
      if (id.toString() !== equipmentId.toString()) return Promise.resolve(null);
      return Promise.resolve({
        _id: equipmentId,
        id: equipmentId.toString(),
        code: 'RACE-RACKET',
        name: 'Vợt cầu lông Yonex Carbon',
        pricingType: RentalPricingType.HOURLY,
        price: 30000,
        depositAmount: 150000,
        totalQuantity: 5,
        rentedQuantity: currentRented,
        damagedQuantity: 0,
        availableQuantity: currentAvailable,
        isActive: true,
      });
    });

    mockEquipmentModel.findOneAndUpdate = jest.fn().mockImplementation((query, update, options) => {
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          // Thêm jitter ngẫu nhiên mô phỏng trễ mạng đa luồng đồng thời
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

          if (query._id.toString() !== equipmentId.toString()) {
            return resolve(null);
          }

          if (query.isActive !== undefined && query.isActive !== true) {
            return resolve(null);
          }

          const reqQty = query.availableQuantity?.$gte ?? 0;
          if (currentAvailable < reqQty) {
            // Không đủ số lượng khả dụng -> Trả về null (từ chối nguyên tử)
            return resolve(null);
          }

          const beforeAvail = currentAvailable;
          if (update.$inc?.availableQuantity) {
            currentAvailable += update.$inc.availableQuantity;
          }
          if (update.$inc?.rentedQuantity) {
            currentRented += update.$inc.rentedQuantity;
          }
          const afterAvail = currentAvailable;

          resolve(
            options?.new
              ? { _id: equipmentId, availableQuantity: afterAvail, rentedQuantity: currentRented }
              : { _id: equipmentId, availableQuantity: beforeAvail, rentedQuantity: currentRented },
          );
        });
      });
    });

    mockEquipmentModel.updateOne = jest.fn().mockImplementation((_query, update) => {
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          if (update.$inc?.availableQuantity) {
            currentAvailable += update.$inc.availableQuantity;
          }
          if (update.$inc?.rentedQuantity) {
            currentRented += update.$inc.rentedQuantity;
          }
          resolve({ modifiedCount: 1 });
        });
      });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getModelToken(Equipment.name), useValue: mockEquipmentModel },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  it('20 yêu cầu thuê đồng thời khi chỉ còn 5 dụng cụ khả dụng -> Đúng 5 yêu cầu thành công, 15 yêu cầu bị từ chối INSUFFICIENT_EQUIPMENT, khả dụng bằng 0', async () => {
    const totalRequests = 20;

    // Kích hoạt đồng thời 20 lượt thuê dụng cụ
    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map(() => {
        return service.reserveEquipments([
          { equipmentId: equipmentId.toString(), quantity: 1 },
        ]);
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến Concurrency: Chính xác 5 đơn thành công và 15 đơn thất bại
    expect(succeeded).toHaveLength(5);
    expect(failed).toHaveLength(15);

    // Xác minh 15 đơn thất bại đều bị từ chối do thiếu dụng cụ khả dụng
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('INSUFFICIENT_EQUIPMENT');
      }
    }

    // Số lượng khả dụng cuối cùng chính xác bằng 0, số lượng đang thuê bằng 5
    expect(currentAvailable).toBe(0);
    expect(currentRented).toBe(5);
  });
});
