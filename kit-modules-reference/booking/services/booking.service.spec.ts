import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
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
import { BookingStatus } from '@sports/shared';

describe('BookingService', () => {
  let service: BookingService;
  let mockBookingModel: any;
  let mockBookingSlotModel: any;
  let mockRedisLockService: any;
  let mockResourceService: any;
  let mockPricingService: any;
  let mockSettingsService: any;
  let mockTransactionService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;

  const inMemoryBookings: any[] = [];

  beforeEach(async () => {
    inMemoryBookings.length = 0;

    mockBookingModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        id: data._id?.toString() || new Types.ObjectId().toString(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryBookings.findIndex((b) => b.id === doc.id);
          if (index >= 0) inMemoryBookings[index] = doc;
          else inMemoryBookings.push(doc);
          return doc;
        }),
        toObject: () => ({ ...doc }),
      };
      return doc;
    });

    mockBookingModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockResolvedValue(inMemoryBookings.find((b) => b.id === id) || null),
    }));

    mockBookingModel.findOne = jest.fn().mockImplementation((q) => ({
      exec: jest.fn().mockResolvedValue(
        inMemoryBookings.find((b) => b.bookingCode === q.bookingCode) || null,
      ),
    }));

    mockBookingSlotModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      insertMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
    };

    mockRedisLockService = {
      acquireSlotLocks: jest.fn().mockResolvedValue(true),
      releaseSlotLocks: jest.fn().mockResolvedValue(undefined),
    };

    mockResourceService = {
      findByCode: jest.fn().mockResolvedValue({
        code: 'F1',
        sport: 'FOOTBALL',
        variant: 'F5',
      }),
      resolveBaseUnits: jest.fn().mockResolvedValue(['F1']),
    };

    mockPricingService = {
      calculatePrice: jest.fn().mockResolvedValue({
        totalPrice: 200000,
        depositAmount: 60000,
        slots: [
          { slotIndex: 34, price: 100000, band: 'PEAK' },
          { slotIndex: 35, price: 100000, band: 'PEAK' },
        ],
      }),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((key, def) => {
        if (key === 'booking.holdMinutes') return 10;
        if (key === 'booking.cancelRefundCutoffHours') return 24;
        if (key === 'booking.depositPercent') return 30;
        return def;
      }),
    };

    mockTransactionService = {
      runTransaction: jest.fn().mockImplementation(async (cb) => {
        const fakeSession = {} as any;
        return cb(fakeSession);
      }),
    };

    mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    };

    mockAuditLogService = {
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

  describe('holdBooking', () => {
    it('giữ chỗ thành công, tạo booking trạng thái HOLD với 3 lớp phòng thủ', async () => {
      const result = await service.holdBooking(
        {
          resourceCode: 'F1',
          date: '2026-11-15',
          slotIndices: [34, 35],
        },
        new Types.ObjectId().toString(),
      );

      expect(result.status).toBe(BookingStatus.HOLD);
      expect(result.totalPrice).toBe(200000);
      expect(result.depositAmount).toBe(60000);
      expect(result.bookingCode).toMatch(/^BK-20261115-[A-F0-9]{6}$/);
      expect(mockRedisLockService.acquireSlotLocks).toHaveBeenCalled();
      expect(mockBookingSlotModel.insertMany).toHaveBeenCalled();
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'booking.held' }),
        expect.anything(),
      );
    });

    it('từ chối khi đặt ngày trong quá khứ', async () => {
      await expect(
        service.holdBooking(
          {
            resourceCode: 'F1',
            date: '2020-01-01',
            slotIndices: [34, 35],
          },
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmBooking', () => {
    it('xác nhận đặt sân thành công khi thanh toán cọc', async () => {
      const hold = await service.holdBooking(
        {
          resourceCode: 'F1',
          date: '2026-11-15',
          slotIndices: [34, 35],
        },
        new Types.ObjectId().toString(),
      );

      const confirmed = await service.confirmBooking(
        hold.id,
        { paidAmount: 60000 },
        'staff-1',
      );

      expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
      expect(confirmed.paidAmount).toBe(60000);
      expect(mockBookingSlotModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: hold._id }),
        expect.objectContaining({ $set: { status: 'CONFIRMED' } }),
        expect.anything(),
      );
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'booking.confirmed' }),
        expect.anything(),
      );
    });
  });

  describe('cancelBooking', () => {
    it('hủy trước 24h: hoàn 100% tiền đã cọc và bắn sự kiện wallet.refund_requested', async () => {
      const hold = await service.holdBooking(
        {
          resourceCode: 'F1',
          date: '2026-11-20', // Xa hơn 24h
          slotIndices: [34, 35],
        },
        new Types.ObjectId().toString(),
      );

      await service.confirmBooking(hold.id, { paidAmount: 60000 }, 'staff-1');

      const cancelled = await service.cancelBooking(
        hold.id,
        { reason: 'Bận đột xuất' },
        'customer-1',
      );

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.refundAmount).toBe(60000);
      expect(mockBookingSlotModel.deleteMany).toHaveBeenCalled();
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'wallet.refund_requested' }),
        expect.anything(),
      );
    });
  });

  describe('checkIn and complete', () => {
    it('thực hiện check-in và complete theo đúng vòng đời', async () => {
      const hold = await service.holdBooking(
        {
          resourceCode: 'F1',
          date: '2026-11-15',
          slotIndices: [34, 35],
        },
        new Types.ObjectId().toString(),
      );

      await service.confirmBooking(hold.id, { paidAmount: 60000 }, 'staff-1');

      const checkedIn = await service.checkIn(hold.id, 'cashier-1');
      expect(checkedIn.status).toBe(BookingStatus.CHECKED_IN);
      expect(checkedIn.checkInAt).toBeDefined();

      const completed = await service.complete(hold.id, 'cashier-1');
      expect(completed.status).toBe(BookingStatus.COMPLETED);
      expect(completed.checkOutAt).toBeDefined();
    });
  });
});
