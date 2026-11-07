import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PricingService } from './pricing.service';
import { PriceRule } from './schemas/price-rule.schema';
import { Closure } from './schemas/closure.schema';
import { Venue } from '../venues/schemas/venue.schema';
import { BadRequestException } from '@nestjs/common';

describe('PricingService (BR-04 Dynamic Pricing Engine)', () => {
  let service: PricingService;

  const mockVenueId = new Types.ObjectId().toString();
  const mockVenue = {
    _id: new Types.ObjectId(mockVenueId),
    name: 'Sân bóng mini F1',
    courtCode: 'F1',
    basePricePerHour: 200000, // 200.000 VND / giờ => 100.000 VND / block 30p
  };

  const mockPriceRuleModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  const mockClosureModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const mockVenueModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockVenue),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getModelToken(PriceRule.name), useValue: mockPriceRuleModel },
        { provide: getModelToken(Closure.name), useValue: mockClosureModel },
        { provide: getModelToken(Venue.name), useValue: mockVenueModel },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePrice - BR-04', () => {
    it('thời gian thường (Thứ Hai 08:00 - 09:30): 3 blocks giá thường', async () => {
      // 2026-11-02 là Thứ Hai
      const result = await service.calculatePrice({
        venueId: mockVenueId,
        date: '2026-11-02',
        startTime: '08:00',
        endTime: '09:30',
      });

      expect(result.totalBlocks).toBe(3);
      expect(result.isPeakIncluded).toBe(false);
      // Mỗi block 30p: 200.000 / 2 = 100.000 VND
      // 3 blocks: 300.000 VND
      expect(result.totalPriceBeforeVat).toBe(300000);
      expect(result.blocks.every((b) => b.isPeak === false && b.price === 100000)).toBe(true);
    });

    it('khung giờ cao điểm ngày thường (Thứ Hai 17:30 - 19:00): phụ thu 25.000 VND/block', async () => {
      // 2026-11-02 là Thứ Hai, 17:30 - 19:00 thuộc khung cao điểm 17:30 - 21:00
      const result = await service.calculatePrice({
        venueId: mockVenueId,
        date: '2026-11-02',
        startTime: '17:30',
        endTime: '19:00',
      });

      expect(result.totalBlocks).toBe(3);
      expect(result.isPeakIncluded).toBe(true);
      // Mỗi block 30p cao điểm: 100.000 + 25.000 = 125.000 VND
      // 3 blocks: 375.000 VND
      expect(result.totalPriceBeforeVat).toBe(375000);
      expect(result.blocks.every((b) => b.isPeak === true && b.price === 125000)).toBe(true);
    });

    it('ngày cuối tuần (Thứ Bảy, Chủ Nhật): toàn bộ khung giờ là cao điểm', async () => {
      // 2026-11-07 là Thứ Bảy
      const result = await service.calculatePrice({
        venueId: mockVenueId,
        date: '2026-11-07',
        startTime: '08:00',
        endTime: '09:00',
      });

      expect(result.totalBlocks).toBe(2);
      expect(result.isPeakIncluded).toBe(true);
      // 2 blocks * 125.000 = 250.000 VND
      expect(result.totalPriceBeforeVat).toBe(250000);
      expect(result.blocks.every((b) => b.isPeak === true)).toBe(true);
    });

    it('báo lỗi nếu thời lượng không phải là bội số của block 30 phút (BR-02)', async () => {
      await expect(
        service.calculatePrice({
          venueId: mockVenueId,
          date: '2026-11-02',
          startTime: '08:00',
          endTime: '08:45',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
