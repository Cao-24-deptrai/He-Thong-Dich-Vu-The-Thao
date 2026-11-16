import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GamingPriceRule, GamingPriceRuleDocument } from '../schemas/gaming-price-rule.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { GamingMachineZone } from '@sports/shared';
import { PriceBand } from '@sports/contracts';

export interface PriceBreakdownItem {
  minute: number;
  time: string;
  band: PriceBand;
  minutePrice: number;
}

export interface SessionCostCalculation {
  totalMinutes: number;
  totalCost: number;
  breakdown?: PriceBreakdownItem[];
}

@Injectable()
export class GamingPricingService {
  // Bảng giá mặc định theo giờ cho các nhóm máy (VND/giờ)
  private readonly defaultHourlyPrices: Record<GamingMachineZone, { peak: number; offpeak: number }> = {
    [GamingMachineZone.STANDARD]: { offpeak: 15000, peak: 20000 },
    [GamingMachineZone.VIP]: { offpeak: 25000, peak: 30000 },
    [GamingMachineZone.STREAMING]: { offpeak: 35000, peak: 45000 },
    [GamingMachineZone.PRIVATE_ROOM]: { offpeak: 50000, peak: 60000 },
  };

  constructor(
    @InjectModel(GamingPriceRule.name)
    private readonly priceRuleModel: Model<GamingPriceRuleDocument>,
    @Optional() private readonly settingsService?: SettingsService,
  ) {}

  /**
   * Helper kiểm tra một chuỗi giờ "HH:mm" có nằm trong khoảng [start, end) không
   */
  private isTimeInRange(targetTime: string, startTime: string, endTime: string): boolean {
    if (startTime <= endTime) {
      return targetTime >= startTime && targetTime < endTime;
    }
    // Trường hợp vắt qua đêm (ví dụ: 22:00 -> 06:00)
    return targetTime >= startTime || targetTime < endTime;
  }

  /**
   * SPEC Rule 2: Tính tiền theo phút, làm tròn lên.
   * Nếu phiên đi qua mốc đổi khung giá, mỗi phút được tính theo khung giá của chính phút đó.
   */
  async calculateSessionCost(
    zone: GamingMachineZone,
    startedAt: Date,
    endedAt: Date,
    overrideHourlyPrice?: number,
  ): Promise<SessionCostCalculation> {
    const minMinutes = this.settingsService?.get<number>('gaming.minMinutes', 15) ?? 15;

    // Số phút thực tế, tối thiểu 1 phút và làm tròn lên
    const elapsedMinutes = Math.max(1, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000));
    const billableMinutes = Math.max(minMinutes, elapsedMinutes);

    // Lấy toàn bộ price rules đang kích hoạt của zone này
    const priceRules = await this.priceRuleModel.find({ zone, isActive: true }).exec();

    let totalCost = 0;
    const breakdown: PriceBreakdownItem[] = [];

    // Duyệt qua từng phút để tính đơn giá chính xác của phút đó
    for (let m = 0; m < billableMinutes; m++) {
      const currentMinuteDate = new Date(startedAt.getTime() + m * 60000);
      const hours = String(currentMinuteDate.getHours()).padStart(2, '0');
      const minutes = String(currentMinuteDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      let hourlyRate = overrideHourlyPrice;
      let band = PriceBand.OFFPEAK;

      if (!hourlyRate) {
        // Tìm rule cấu hình phù hợp với khung giờ
        const matchingRule = priceRules.find((rule) =>
          this.isTimeInRange(timeStr, rule.startTime, rule.endTime),
        );

        if (matchingRule) {
          hourlyRate = matchingRule.pricePerHour;
          band = matchingRule.band;
        } else {
          // Fallback theo mặc định: 17:00 - 23:00 là PEAK, còn lại là OFFPEAK
          const isPeak = timeStr >= '17:00' && timeStr < '23:00';
          band = isPeak ? PriceBand.PEAK : PriceBand.OFFPEAK;
          hourlyRate = isPeak
            ? this.defaultHourlyPrices[zone].peak
            : this.defaultHourlyPrices[zone].offpeak;
        }
      }

      // Giá của 1 phút = làm tròn số nguyên VND (hourlyRate / 60)
      const minutePrice = Math.round(hourlyRate / 60);
      totalCost += minutePrice;

      if (m < 5 || m >= billableMinutes - 5) {
        breakdown.push({
          minute: m + 1,
          time: timeStr,
          band,
          minutePrice,
        });
      }
    }

    return {
      totalMinutes: billableMinutes,
      totalCost,
      breakdown,
    };
  }

  /**
   * Tính số tiền tạm giữ cần thiết cho một số phút nhất định (ví dụ 15 phút)
   */
  async calculateHoldAmountForMinutes(
    zone: GamingMachineZone,
    minutes: number,
    startTime: Date = new Date(),
    overrideHourlyPrice?: number,
  ): Promise<number> {
    const endTime = new Date(startTime.getTime() + minutes * 60000);
    const result = await this.calculateSessionCost(zone, startTime, endTime, overrideHourlyPrice);
    return result.totalCost;
  }
}
