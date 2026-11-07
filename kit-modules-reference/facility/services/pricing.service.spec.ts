import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PricingService } from './pricing.service.js';
import { PriceRule } from '../schemas/price-rule.schema.js';
import { ResourceService } from './resource.service.js';
import { SettingsService } from './settings.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import { PriceBand, ResourceKind, SportType } from '@sports/contracts';

describe('PricingService', () => {
  let service: PricingService;
  let mockPriceRuleModel: any;
  let mockResourceService: any;
  let mockSettingsService: any;
  let mockAuditLogService: any;

  const sampleRules = [
    {
      appliesTo: 'FOOTBALL_F5',
      band: PriceBand.OFFPEAK,
      dayOfWeek: [],
      startTime: '06:00',
      endTime: '17:00',
      pricePerHour: 160000,
      effectiveFrom: new Date('2025-01-01'),
      version: 1,
      isActive: true,
    },
    {
      appliesTo: 'FOOTBALL_F5',
      band: PriceBand.PEAK,
      dayOfWeek: [],
      startTime: '17:00',
      endTime: '22:00',
      pricePerHour: 260000,
      effectiveFrom: new Date('2025-01-01'),
      version: 1,
      isActive: true,
    },
  ];

  beforeEach(async () => {
    mockPriceRuleModel = {
      find: jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sampleRules),
        }),
        exec: jest.fn().mockResolvedValue(sampleRules),
      })),
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'rule-new',
        toObject: () => dto,
      })),
    };

    mockResourceService = {
      findByCode: jest.fn().mockImplementation((code) => {
        if (code === 'F1') {
          return Promise.resolve({
            code: 'F1',
            kind: ResourceKind.COURT,
            sport: SportType.FOOTBALL,
            variant: 'F5',
          });
        }
        throw new Error('Not found');
      }),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((key, def) => {
        if (key === 'booking.depositPercent') return 30;
        return def;
      }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getModelToken(PriceRule.name), useValue: mockPriceRuleModel },
        { provide: ResourceService, useValue: mockResourceService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculatePrice', () => {
    it('tính giá giờ thường (OFFPEAK): 2 slot (10:00 - 11:00) = 160.000 VND, cọc 30% = 48.000 VND', async () => {
      // 10:00 -> slot 20, 10:30 -> slot 21
      const result = await service.calculatePrice({
        resourceCode: 'F1',
        date: '2026-03-15',
        slotIndices: [20, 21],
      });

      expect(result.totalSlots).toBe(2);
      expect(result.totalPrice).toBe(160000);
      expect(result.depositAmount).toBe(48000);
      expect(Number.isSafeInteger(result.totalPrice)).toBe(true);
      expect(Number.isSafeInteger(result.depositAmount)).toBe(true);
      expect(result.slots[0]!.band).toBe(PriceBand.OFFPEAK);
      expect(result.slots[0]!.price).toBe(80000);
      expect(result.slots[1]!.price).toBe(80000);
    });

    it('tính giá giờ cao điểm (PEAK): 2 slot (17:30 - 18:30) = 260.000 VND, cọc 30% = 78.000 VND', async () => {
      // 17:30 -> slot 35, 18:00 -> slot 36
      const result = await service.calculatePrice({
        resourceCode: 'F1',
        date: '2026-03-15',
        slotIndices: [35, 36],
      });

      expect(result.totalSlots).toBe(2);
      expect(result.totalPrice).toBe(260000);
      expect(result.depositAmount).toBe(78000);
      expect(result.slots[0]!.band).toBe(PriceBand.PEAK);
      expect(result.slots[0]!.price).toBe(130000);
      expect(result.slots[1]!.price).toBe(130000);
    });

    it('tính giá vắt ngang giờ (1 slot OFFPEAK 16:30-17:00 + 1 slot PEAK 17:00-17:30) = 210.000 VND', async () => {
      // 16:30 -> slot 33 (OFFPEAK: 80.000), 17:00 -> slot 34 (PEAK: 130.000)
      const result = await service.calculatePrice({
        resourceCode: 'F1',
        date: '2026-03-15',
        slotIndices: [33, 34],
      });

      expect(result.totalSlots).toBe(2);
      expect(result.totalPrice).toBe(210000);
      expect(result.depositAmount).toBe(63000);
      expect(result.slots[0]!.band).toBe(PriceBand.OFFPEAK);
      expect(result.slots[0]!.price).toBe(80000);
      expect(result.slots[1]!.band).toBe(PriceBand.PEAK);
      expect(result.slots[1]!.price).toBe(130000);
    });
  });
});
