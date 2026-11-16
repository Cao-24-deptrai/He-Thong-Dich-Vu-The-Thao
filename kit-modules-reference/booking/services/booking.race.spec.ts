import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookingService } from './booking.service.js';
import { Booking } from '../schemas/booking.schema.js';
import { BookingSlot } from '../schemas/booking-slot.schema.js';
import { RedisLockService } from './redis-lock.service.js';
import { ResourceService } from '../../facility/services/resource.service.js';
import { PricingService } from '../../facility/services/pricing.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

describe('BookingService - Race Condition & Composite Court Conflicts', () => {
  let service: BookingService;

  // Giả lập Redis storage và MongoDB Unique compound index
  const redisKeysSet = new Set<string>();
  const mongoSlotsSet = new Set<string>(); // "unitId:date:slotIndex"

  beforeEach(async () => {
    redisKeysSet.clear();
    mongoSlotsSet.clear();

    const mockBookingModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      id: data._id?.toString() || new Types.ObjectId().toString(),
      save: jest.fn().mockResolvedValue(data),
      toObject: () => ({ ...data }),
    }));

    const mockBookingSlotModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      insertMany: jest.fn().mockImplementation(async (slots) => {
        // Mô phỏng Unique compound index { unitId: 1, date: 1, slotIndex: 1 }
        for (const s of slots) {
          const key = `${s.unitId}:${s.date}:${s.slotIndex}`;
          if (mongoSlotsSet.has(key)) {
            const err: any = new Error('E11000 duplicate key error');
            err.code = 11000;
            throw err;
          }
        }
        for (const s of slots) {
          mongoSlotsSet.add(`${s.unitId}:${s.date}:${s.slotIndex}`);
        }
        return slots;
      }),
    };

    // Mô phỏng Redis Multi-lock nguyên tử: nếu có 1 key bị chiếm -> false
    const mockRedisLockService = {
      acquireSlotLocks: jest.fn().mockImplementation(async (keys: string[]) => {
        for (const k of keys) {
          if (redisKeysSet.has(k)) {
            return false;
          }
        }
        for (const k of keys) {
          redisKeysSet.add(k);
        }
        return true;
      }),
      releaseSlotLocks: jest.fn().mockImplementation(async (keys: string[]) => {
        for (const k of keys) {
          redisKeysSet.delete(k);
        }
      }),
    };

    const mockResourceService = {
      findByCode: jest.fn().mockImplementation(async (code: string) => {
        const upper = code.toUpperCase();
        return {
          code: upper,
          sport: upper.startsWith('F') || upper.startsWith('S') ? 'FOOTBALL' : 'TENNIS',
        };
      }),
      resolveBaseUnits: jest.fn().mockImplementation(async (code: string) => {
        const upper = code.toUpperCase();
        if (upper === 'S7-A') return ['F1', 'F2'];
        if (upper === 'S7-B') return ['F3', 'F4'];
        if (upper === 'S11') return ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
        if (upper === 'F1') return ['F1'];
        if (upper === 'F2') return ['F2'];
        if (upper === 'F3') return ['F3'];
        if (upper === 'T1') return ['T1'];
        return [upper];
      }),
    };

    const mockPricingService = {
      calculatePrice: jest.fn().mockResolvedValue({
        totalPrice: 200000,
        depositAmount: 60000,
        slots: [{ slotIndex: 34, price: 200000, band: 'PEAK' }],
      }),
    };

    const mockSettingsService = {
      get: jest.fn().mockReturnValue(10),
    };

    const mockTransactionService = {
      runTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
    };

    const mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    };

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(BookingSlot.name), useValue: mockBookingSlotModel },
        { provide: RedisLockService, useValue: mockRedisLockService },
        { provide: ResourceService, useValue: mockResourceService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: DatabaseTransactionService, useValue: mockTransactionService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('Race Condition Concurrency Test', () => {
    it('10 khách cùng đặt 1 sân tại cùng 1 slot -> CHÍNH XÁC 1 khách thành công, 9 khách nhận ConflictException', async () => {
      const concurrentUsers = Array.from({ length: 10 }, () => new Types.ObjectId().toString());

      const results = await Promise.allSettled(
        concurrentUsers.map((userId) =>
          service.holdBooking(
            {
              resourceCode: 'F1',
              date: '2026-11-20',
              slotIndices: [34],
            },
            userId,
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(9);

      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(ConflictException);
        }
      }
    });
  });

  describe('Composite Courts Conflict Graph Test', () => {
    it('khi đã giữ sân ghép S7-A (F1, F2), không thể đặt F1, F2 hoặc S11 trong cùng khung giờ, nhưng F3 và T1 vẫn đặt được', async () => {
      const userA = new Types.ObjectId().toString();
      const userB = new Types.ObjectId().toString();

      // 1. Đặt sân ghép S7-A thành công
      const holdS7A = await service.holdBooking(
        {
          resourceCode: 'S7-A',
          date: '2026-11-20',
          slotIndices: [34],
        },
        userA,
      );
      expect(holdS7A).toBeDefined();

      // 2. Cố gắng đặt sân con F1 -> Xung đột (F1 thuộc S7-A)
      await expect(
        service.holdBooking(
          {
            resourceCode: 'F1',
            date: '2026-11-20',
            slotIndices: [34],
          },
          userB,
        ),
      ).rejects.toThrow(ConflictException);

      // 3. Cố gắng đặt sân con F2 -> Xung đột (F2 thuộc S7-A)
      await expect(
        service.holdBooking(
          {
            resourceCode: 'F2',
            date: '2026-11-20',
            slotIndices: [34],
          },
          userB,
        ),
      ).rejects.toThrow(ConflictException);

      // 4. Cố gắng đặt sân lớn S11 -> Xung đột (S11 chứa cả F1, F2, F3, F4, F5, F6)
      await expect(
        service.holdBooking(
          {
            resourceCode: 'S11',
            date: '2026-11-20',
            slotIndices: [34],
          },
          userB,
        ),
      ).rejects.toThrow(ConflictException);

      // 5. Đặt sân độc lập F3 (thuộc cụm F3-F4) -> Thành công!
      const holdF3 = await service.holdBooking(
        {
          resourceCode: 'F3',
          date: '2026-11-20',
          slotIndices: [34],
        },
        userB,
      );
      expect(holdF3).toBeDefined();

      // 6. Đặt sân Tennis T1 -> Thành công!
      const holdT1 = await service.holdBooking(
        {
          resourceCode: 'T1',
          date: '2026-11-20',
          slotIndices: [34],
        },
        userB,
      );
      expect(holdT1).toBeDefined();
    });
  });
});
