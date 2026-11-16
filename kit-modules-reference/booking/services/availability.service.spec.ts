import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AvailabilityService } from './availability.service.js';
import { BookingSlot } from '../schemas/booking-slot.schema.js';
import { ResourceService } from '../../facility/services/resource.service.js';
import { OperatingHoursService } from '../../facility/services/operating-hours.service.js';
import { ClosureService } from '../../facility/services/closure.service.js';
import { PricingService } from '../../facility/services/pricing.service.js';
import { SlotAvailabilityStatus, PriceBand } from '@sports/contracts';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let mockBookingSlotModel: any;
  let mockResourceService: any;
  let mockOperatingHoursService: any;
  let mockClosureService: any;
  let mockPricingService: any;

  beforeEach(async () => {
    mockBookingSlotModel = {
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([
          // Slot 20 (10:00 - 10:30) đã CONFIRMED
          { unitId: 'F1', date: '2026-11-10', slotIndex: 20, status: 'CONFIRMED' },
          // Slot 22 (11:00 - 11:30) đang HELD còn hạn
          {
            unitId: 'F1',
            date: '2026-11-10',
            slotIndex: 22,
            status: 'HELD',
            holdExpiresAt: new Date(Date.now() + 600000),
          },
        ]),
      })),
    };

    mockResourceService = {
      findByCode: jest.fn().mockResolvedValue({
        code: 'F1',
        sport: 'FOOTBALL',
        variant: 'F5',
      }),
      resolveBaseUnits: jest.fn().mockResolvedValue(['F1']),
    };

    mockOperatingHoursService = {
      getOperatingHours: jest.fn().mockResolvedValue({
        facilityId: 'MAIN',
        weeklySchedules: [
          { dayOfWeek: 5, openTime: '06:00', closeTime: '23:00', isOpen: true },
        ],
        specialDates: [],
      }),
    };

    mockClosureService = {
      findAll: jest.fn().mockResolvedValue([
        // Đóng sân bảo trì lúc 14:00 - 16:00 (slot 28 - 31)
        {
          resourceIds: ['F1'],
          affectedUnitIds: ['F1'],
          fromAt: new Date('2026-11-10T07:00:00.000Z'), // 14:00 VN
          toAt: new Date('2026-11-10T09:00:00.000Z'), // 16:00 VN
          reason: 'Bảo dưỡng',
        },
      ]),
    };

    mockPricingService = {
      calculatePrice: jest.fn().mockResolvedValue({
        slots: Array.from({ length: 48 }, (_, i) => ({
          slotIndex: i,
          price: 80000,
          band: PriceBand.OFFPEAK,
        })),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: getModelToken(BookingSlot.name), useValue: mockBookingSlotModel },
        { provide: ResourceService, useValue: mockResourceService },
        { provide: OperatingHoursService, useValue: mockOperatingHoursService },
        { provide: ClosureService, useValue: mockClosureService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('getAvailability', () => {
    it('trả về đủ 48 slot trong ngày với các trạng thái chính xác', async () => {
      const result = await service.getAvailability({
        resourceCode: 'F1',
        date: '2026-11-10',
      });

      expect(result.slots.length).toBe(48);

      // Slot 0 (00:00 - 00:30): Ngoài giờ mở cửa (06:00 - 23:00) -> CLOSED
      expect(result.slots[0]!.status).toBe(SlotAvailabilityStatus.CLOSED);

      // Slot 12 (06:00 - 06:30): Mở cửa và chưa ai đặt -> AVAILABLE
      expect(result.slots[12]!.status).toBe(SlotAvailabilityStatus.AVAILABLE);

      // Slot 20 (10:00 - 10:30): Đã có người đặt -> BOOKED
      expect(result.slots[20]!.status).toBe(SlotAvailabilityStatus.BOOKED);

      // Slot 22 (11:00 - 11:30): Đang giữ chỗ tạm thời -> HELD
      expect(result.slots[22]!.status).toBe(SlotAvailabilityStatus.HELD);

      // Slot 28 (14:00 - 14:30): Rơi vào lịch đóng sân bảo trì -> CLOSED
      expect(result.slots[28]!.status).toBe(SlotAvailabilityStatus.CLOSED);
    });
  });
});
