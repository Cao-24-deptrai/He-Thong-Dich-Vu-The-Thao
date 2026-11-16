import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema.js';
import { PriceRule, PriceRuleDocument } from '../schemas/price-rule.schema.js';
import { ResourceKind, SportType, ResourceStatus, PriceBand } from '@sports/contracts';

@Injectable()
export class FacilitySeedService implements OnModuleInit {
  private readonly logger = new Logger(FacilitySeedService.name);

  constructor(
    @InjectModel(Resource.name) private readonly resourceModel: Model<ResourceDocument>,
    @InjectModel(PriceRule.name) private readonly priceRuleModel: Model<PriceRuleDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedResources();
    await this.seedPriceRules();
  }

  async seedResources(): Promise<void> {
    const count = await this.resourceModel.countDocuments().exec();
    if (count > 0) return;

    this.logger.log('Seeding initial facility resources (courts, composite courts, rooms)...');

    const resources: Partial<Resource>[] = [
      // 8 Sân bóng đá 5 người đơn
      { code: 'F1', name: 'Sân bóng đá F1 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F1'], orderIndex: 1, status: ResourceStatus.ACTIVE },
      { code: 'F2', name: 'Sân bóng đá F2 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F2'], orderIndex: 2, status: ResourceStatus.ACTIVE },
      { code: 'F3', name: 'Sân bóng đá F3 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F3'], orderIndex: 3, status: ResourceStatus.ACTIVE },
      { code: 'F4', name: 'Sân bóng đá F4 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F4'], orderIndex: 4, status: ResourceStatus.ACTIVE },
      { code: 'F5', name: 'Sân bóng đá F5 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F5'], orderIndex: 5, status: ResourceStatus.ACTIVE },
      { code: 'F6', name: 'Sân bóng đá F6 (5 người)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F6'], orderIndex: 6, status: ResourceStatus.ACTIVE },
      { code: 'F7', name: 'Sân bóng đá F7 (5 người độc lập)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F7'], orderIndex: 7, status: ResourceStatus.ACTIVE },
      { code: 'F8', name: 'Sân bóng đá F8 (5 người độc lập)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F5', isComposite: false, baseUnitIds: ['F8'], orderIndex: 8, status: ResourceStatus.ACTIVE },

      // 3 Sân bóng đá 7 người ghép từ các cặp F1-F2, F3-F4, F5-F6
      { code: 'S7-A', name: 'Sân bóng đá S7-A (Ghép F1 + F2)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F7', isComposite: true, baseUnitIds: ['F1', 'F2'], orderIndex: 10, status: ResourceStatus.ACTIVE },
      { code: 'S7-B', name: 'Sân bóng đá S7-B (Ghép F3 + F4)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F7', isComposite: true, baseUnitIds: ['F3', 'F4'], orderIndex: 11, status: ResourceStatus.ACTIVE },
      { code: 'S7-C', name: 'Sân bóng đá S7-C (Ghép F5 + F6)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F7', isComposite: true, baseUnitIds: ['F5', 'F6'], orderIndex: 12, status: ResourceStatus.ACTIVE },

      // 1 Sân bóng đá 11 người ghép từ F1..F6
      { code: 'S11', name: 'Sân bóng đá S11 (Ghép F1 đến F6)', kind: ResourceKind.COURT, sport: SportType.FOOTBALL, variant: 'F11', isComposite: true, baseUnitIds: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'], orderIndex: 15, status: ResourceStatus.ACTIVE },

      // 2 Sân Tennis
      { code: 'T1', name: 'Sân Tennis T1', kind: ResourceKind.COURT, sport: SportType.TENNIS, variant: 'STANDARD', isComposite: false, baseUnitIds: ['T1'], orderIndex: 20, status: ResourceStatus.ACTIVE },
      { code: 'T2', name: 'Sân Tennis T2', kind: ResourceKind.COURT, sport: SportType.TENNIS, variant: 'STANDARD', isComposite: false, baseUnitIds: ['T2'], orderIndex: 21, status: ResourceStatus.ACTIVE },

      // 2 Sân Cầu lông
      { code: 'B1', name: 'Sân Cầu lông B1', kind: ResourceKind.COURT, sport: SportType.BADMINTON, variant: 'STANDARD', isComposite: false, baseUnitIds: ['B1'], orderIndex: 30, status: ResourceStatus.ACTIVE },
      { code: 'B2', name: 'Sân Cầu lông B2', kind: ResourceKind.COURT, sport: SportType.BADMINTON, variant: 'STANDARD', isComposite: false, baseUnitIds: ['B2'], orderIndex: 31, status: ResourceStatus.ACTIVE },

      // 2 Sân Bóng rổ
      { code: 'BB1', name: 'Sân Bóng rổ BB1', kind: ResourceKind.COURT, sport: SportType.BASKETBALL, variant: 'STANDARD', isComposite: false, baseUnitIds: ['BB1'], orderIndex: 40, status: ResourceStatus.ACTIVE },
      { code: 'BB2', name: 'Sân Bóng rổ BB2', kind: ResourceKind.COURT, sport: SportType.BASKETBALL, variant: 'STANDARD', isComposite: false, baseUnitIds: ['BB2'], orderIndex: 41, status: ResourceStatus.ACTIVE },

      // 10 Phòng VIP Gaming Esports (R01 -> R10)
      ...Array.from({ length: 10 }, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        const code = `R${num}`;
        return {
          code,
          name: `Phòng Gaming VIP ${code}`,
          kind: ResourceKind.GAME_ROOM,
          sport: SportType.ESPORTS,
          variant: 'VIP',
          isComposite: false,
          baseUnitIds: [code],
          capacity: 5,
          orderIndex: 50 + i,
          status: ResourceStatus.ACTIVE,
        };
      }),

      // 1 Phòng Gym (Sức chứa tối đa 100 người)
      { code: 'GYM_MAIN', name: 'Phòng Gym trung tâm', kind: ResourceKind.COURT, sport: SportType.GYM, variant: 'STANDARD', isComposite: false, baseUnitIds: ['GYM_MAIN'], capacity: 100, orderIndex: 70, status: ResourceStatus.ACTIVE },
    ];

    await this.resourceModel.insertMany(resources);
    this.logger.log(`Successfully seeded ${resources.length} facility resources.`);
  }

  async seedPriceRules(): Promise<void> {
    const count = await this.priceRuleModel.countDocuments().exec();
    if (count > 0) return;

    this.logger.log('Seeding initial price rules (PEAK & OFFPEAK)...');

    const effectiveFrom = new Date('2025-01-01T00:00:00.000Z');

    const rules: Partial<PriceRule>[] = [
      // Bóng đá F5
      { appliesTo: 'FOOTBALL_F5', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 160000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F5', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 260000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F5', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 160000, effectiveFrom, version: 1, isActive: true },

      // Bóng đá F7 (Sân ghép)
      { appliesTo: 'FOOTBALL_F7', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 300000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F7', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 500000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F7', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 300000, effectiveFrom, version: 1, isActive: true },

      // Bóng đá F11 (Sân ghép)
      { appliesTo: 'FOOTBALL_F11', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 800000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F11', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 1200000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'FOOTBALL_F11', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 800000, effectiveFrom, version: 1, isActive: true },

      // Tennis
      { appliesTo: 'TENNIS', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 150000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'TENNIS', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 250000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'TENNIS', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 150000, effectiveFrom, version: 1, isActive: true },

      // Cầu lông
      { appliesTo: 'BADMINTON', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 80000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'BADMINTON', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 140000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'BADMINTON', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 80000, effectiveFrom, version: 1, isActive: true },

      // Bóng rổ
      { appliesTo: 'BASKETBALL', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '06:00', endTime: '17:00', pricePerHour: 150000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'BASKETBALL', band: PriceBand.PEAK, dayOfWeek: [], startTime: '17:00', endTime: '22:00', pricePerHour: 250000, effectiveFrom, version: 1, isActive: true },
      { appliesTo: 'BASKETBALL', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '22:00', endTime: '23:00', pricePerHour: 150000, effectiveFrom, version: 1, isActive: true },

      // Gaming VIP
      { appliesTo: 'ESPORTS_VIP', band: PriceBand.OFFPEAK, dayOfWeek: [], startTime: '00:00', endTime: '23:59', pricePerHour: 120000, effectiveFrom, version: 1, isActive: true },
    ];

    await this.priceRuleModel.insertMany(rules);
    this.logger.log(`Successfully seeded ${rules.length} price rules.`);
  }
}
