import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GamingPricingService } from './gaming-pricing.service.js';
import { GamingPriceRule } from '../schemas/gaming-price-rule.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { GamingMachineZone } from '@sports/shared';
import { PriceBand } from '@sports/contracts';

describe('GamingPricingService', () => {
  let service: GamingPricingService;
  let mockPriceRuleModel: any;
  let mockSettingsService: any;

  const inMemoryRules: any[] = [];

  beforeEach(async () => {
    inMemoryRules.length = 0;

    mockPriceRuleModel = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(() => {
          let results = [...inMemoryRules];
          if (query.zone) results = results.filter((r) => r.zone === query.zone);
          if (query.isActive !== undefined) results = results.filter((r) => r.isActive === query.isActive);
          return Promise.resolve(results);
        }),
      })),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
        if (key === 'gaming.minMinutes') return 15;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamingPricingService,
        { provide: getModelToken(GamingPriceRule.name), useValue: mockPriceRuleModel },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<GamingPricingService>(GamingPricingService);
  });

  it('should enforce minimum 15 minutes when session duration is less than 15 minutes', async () => {
    // 5 minutes session
    const startedAt = new Date('2026-10-26T08:00:00.000Z');
    const endedAt = new Date('2026-10-26T08:05:00.000Z');

    const result = await service.calculateSessionCost(
      GamingMachineZone.STANDARD,
      startedAt,
      endedAt,
    );

    // Bắt buộc tính tối thiểu 15 phút
    expect(result.totalMinutes).toBe(15);
    // Standard off-peak mặc định: 15,000 VND / giờ => 250 VND / phút * 15 = 3,750 VND
    expect(result.totalCost).toBe(15 * Math.round(15000 / 60));
  });

  it('should calculate cost with peak and off-peak rate split when session crosses boundary (SPEC Rule 2)', async () => {
    // Cấu hình 2 rules cho zone VIP:
    // Off-peak: 06:00 -> 17:00 (24,000 VND/h => 400 VND/m)
    // Peak: 17:00 -> 23:00 (36,000 VND/h => 600 VND/m)
    inMemoryRules.push(
      {
        zone: GamingMachineZone.VIP,
        band: PriceBand.OFFPEAK,
        startTime: '06:00',
        endTime: '17:00',
        pricePerHour: 24000,
        isActive: true,
      },
      {
        zone: GamingMachineZone.VIP,
        band: PriceBand.PEAK,
        startTime: '17:00',
        endTime: '23:00',
        pricePerHour: 36000,
        isActive: true,
      },
    );

    // Phiên chơi 20 phút: từ 16:50 đến 17:10
    // Lưu ý: Local time của test runner
    const startedAt = new Date(2026, 9, 26, 16, 50, 0);
    const endedAt = new Date(2026, 9, 26, 17, 10, 0);

    const result = await service.calculateSessionCost(
      GamingMachineZone.VIP,
      startedAt,
      endedAt,
    );

    expect(result.totalMinutes).toBe(20);
    // 10 phút off-peak (16:50 - 16:59): 10 * 400 = 4,000 VND
    // 10 phút peak (17:00 - 17:09): 10 * 600 = 6,000 VND
    // Tổng = 10,000 VND
    expect(result.totalCost).toBe(10000);
  });

  it('should calculate hold amount for 15-minute batch accurately', async () => {
    const startTime = new Date(2026, 9, 26, 10, 0, 0);
    // Standard override 18,000 VND/h => 300 VND/min => 15 mins = 4,500 VND
    const holdAmount = await service.calculateHoldAmountForMinutes(
      GamingMachineZone.STANDARD,
      15,
      startTime,
      18000,
    );

    expect(holdAmount).toBe(4500);
  });
});
