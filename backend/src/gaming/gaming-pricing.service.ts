import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GamingMachineZone } from '../common/enums';
import { GamingPriceRule, GamingPriceRuleDocument } from './schemas/gaming-price-rule.schema';
import { CreateGamingPriceRuleDto } from './dto/gaming.dto';

@Injectable()
export class GamingPricingService {
  constructor(
    @InjectModel(GamingPriceRule.name)
    private readonly priceRuleModel: Model<GamingPriceRuleDocument>,
  ) {}

  async createPriceRule(dto: CreateGamingPriceRuleDto): Promise<GamingPriceRule> {
    const rule = new this.priceRuleModel({
      zone: dto.zone,
      hourlyRate: dto.hourlyRate,
      offpeakPricePerHour: dto.hourlyRate,
      peakPricePerHour: dto.hourlyRate,
      minBlockMinutes: dto.minBlockMinutes ?? 15,
      roundingBlockMinutes: dto.roundingBlockMinutes ?? 15,
      active: dto.active ?? true,
    });
    return rule.save();
  }

  async getPriceRules(): Promise<GamingPriceRule[]> {
    return this.priceRuleModel.find().lean();
  }
  private readonly defaultRates: Record<GamingMachineZone, { offpeak: number; peak: number }> = {
    [GamingMachineZone.STANDARD]: { offpeak: 10000, peak: 15000 },
    [GamingMachineZone.VIP]: { offpeak: 15000, peak: 20000 },
    [GamingMachineZone.STREAMING]: { offpeak: 20000, peak: 25000 },
    [GamingMachineZone.PRIVATE_ROOM]: { offpeak: 15000, peak: 20000 },
  };

  /**
   * Tính tiền thực tế theo phút, làm tròn lên theo SPEC Rule 2.
   * Tách tiền chính xác khi phiên chơi vắt qua mốc cao điểm (17:00 - 23:00).
   */
  calculateCost(
    zone: GamingMachineZone = GamingMachineZone.STANDARD,
    startedAt: Date,
    endedAt: Date,
  ): { totalMinutes: number; totalCost: number } {
    const diffMs = endedAt.getTime() - startedAt.getTime();
    const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));

    const rates = this.defaultRates[zone] || this.defaultRates[GamingMachineZone.STANDARD];
    let totalCost = 0;

    // Duyệt qua từng phút để áp dụng đúng đơn giá khung giờ
    for (let m = 0; m < totalMinutes; m++) {
      const currentMinuteTime = new Date(startedAt.getTime() + m * 60000);
      const hour = currentMinuteTime.getHours();

      // Cao điểm từ 17:00 đến 23:00
      const isPeak = hour >= 17 && hour < 23;
      const hourlyRate = isPeak ? rates.peak : rates.offpeak;
      const minuteRate = hourlyRate / 60;
      totalCost += minuteRate;
    }

    return {
      totalMinutes,
      totalCost: Math.ceil(totalCost), // Làm tròn lên đồng
    };
  }

  getHoldAmountForBlock(zone: GamingMachineZone = GamingMachineZone.STANDARD, blockMinutes: number = 15): number {
    const rates = this.defaultRates[zone] || this.defaultRates[GamingMachineZone.STANDARD];
    // Tạm giữ theo mức giá cao điểm để đảm bảo an toàn ví
    return Math.ceil((rates.peak / 60) * blockMinutes);
  }
}
