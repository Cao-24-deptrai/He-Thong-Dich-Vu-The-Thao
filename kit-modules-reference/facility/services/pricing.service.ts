import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PriceRule, PriceRuleDocument } from '../schemas/price-rule.schema.js';
import { ResourceService } from './resource.service.js';
import { SettingsService } from './settings.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreatePriceRuleDto,
  CalculatePriceDto,
  PriceCalculationResult,
  SlotPriceDetail,
} from '@sports/contracts';
import {
  parseVietnamDate,
  slotIndexToTimeString,
  assertValidSlotIndex,
} from '@sports/shared';
import { multiplyMoney, addMoney, assertValidMoney } from '@sports/shared';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(PriceRule.name) private readonly priceRuleModel: Model<PriceRuleDocument>,
    private readonly resourceService: ResourceService,
    private readonly settingsService: SettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter?: { appliesTo?: string; isActive?: boolean }): Promise<PriceRuleDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.appliesTo) query.appliesTo = filter.appliesTo.toUpperCase();
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;

    return this.priceRuleModel.find(query).sort({ appliesTo: 1, effectiveFrom: -1 }).exec();
  }

  async findById(id: string): Promise<PriceRuleDocument> {
    const doc = await this.priceRuleModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Price rule with ID ${id} not found`);
    }
    return doc;
  }

  async createRule(dto: CreatePriceRuleDto, actorId?: string): Promise<PriceRuleDocument> {
    assertValidMoney(dto.pricePerHour, 'pricePerHour');

    const created = await this.priceRuleModel.create({
      ...dto,
      appliesTo: dto.appliesTo.toUpperCase(),
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      createdBy: actorId,
    });

    await this.auditLogService.record({
      actorId,
      action: 'PRICE_RULE_CREATE',
      targetType: 'price_rule',
      targetId: created.id,
      after: created.toObject() as unknown as Record<string, unknown>,
    });

    return created;
  }

  async updateRule(id: string, dto: Partial<CreatePriceRuleDto> & { isActive?: boolean }, actorId?: string): Promise<PriceRuleDocument> {
    const rule = await this.findById(id);
    const beforeObj = rule.toObject();

    if (dto.pricePerHour !== undefined) {
      assertValidMoney(dto.pricePerHour, 'pricePerHour');
    }

    if (dto.effectiveFrom) {
      rule.effectiveFrom = new Date(dto.effectiveFrom);
    }
    if (dto.effectiveTo !== undefined) {
      rule.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : undefined;
    }
    if (dto.appliesTo) rule.appliesTo = dto.appliesTo.toUpperCase();
    if (dto.band) rule.band = dto.band;
    if (dto.dayOfWeek) rule.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime) rule.startTime = dto.startTime;
    if (dto.endTime) rule.endTime = dto.endTime;
    if (dto.pricePerHour !== undefined) rule.pricePerHour = dto.pricePerHour;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    rule.version += 1;
    const updated = await rule.save();

    await this.auditLogService.record({
      actorId,
      action: 'PRICE_RULE_UPDATE',
      targetType: 'price_rule',
      targetId: id,
      before: beforeObj as unknown as Record<string, unknown>,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Tính giá tiền cho danh sách các slot của một sân/tài nguyên vào ngày xác định
   */
  async calculatePrice(dto: CalculatePriceDto): Promise<PriceCalculationResult> {
    const resource = await this.resourceService.findByCode(dto.resourceCode);
    const dateDt = parseVietnamDate(dto.date);
    const dayOfWeek = dateDt.weekday % 7; // 0 = CN, 1 = T2, ... 6 = T7

    if (!dto.slotIndices || dto.slotIndices.length === 0) {
      throw new BadRequestException('slotIndices cannot be empty');
    }

    // Sort slot indices
    const sortedSlots: number[] = [...new Set(dto.slotIndices)].sort((a: number, b: number) => a - b);
    for (const slot of sortedSlots) {
      assertValidSlotIndex(slot);
    }

    // Lấy tất cả price rules đang hoạt động
    const dateJs = dateDt.toJSDate();
    const activeRules = await this.priceRuleModel.find({
      isActive: true,
      effectiveFrom: { $lte: dateJs },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: dateJs } }],
    }).sort({ version: -1, effectiveFrom: -1 }).exec();

    // Các targets áp dụng theo thứ tự ưu tiên:
    // 1. Mã sân cụ thể: S11, F1, T1
    // 2. Sport + Variant: FOOTBALL_F5, FOOTBALL_F7, FOOTBALL_F11
    // 3. Sport: FOOTBALL, TENNIS, BADMINTON, BASKETBALL, ESPORTS, GYM
    const targets = [
      resource.code.toUpperCase(),
      resource.variant ? `${resource.sport}_${resource.variant}`.toUpperCase() : null,
      resource.sport.toUpperCase(),
    ].filter(Boolean) as string[];

    const slotBreakdown: SlotPriceDetail[] = [];
    let totalPrice = 0;

    for (const slotIndex of sortedSlots) {
      const { startTime, endTime } = slotIndexToTimeString(slotIndex);

      // Tìm rule thích hợp nhất
      let matchedRule: PriceRuleDocument | undefined;

      for (const target of targets) {
        matchedRule = activeRules.find((r) => {
          if (r.appliesTo !== target) return false;
          if (r.dayOfWeek && r.dayOfWeek.length > 0 && !r.dayOfWeek.includes(dayOfWeek)) {
            return false;
          }
          // Kiểm tra xem slot có nằm trong khoảng [startTime, endTime) của rule không
          return r.startTime <= startTime && r.endTime >= endTime;
        });
        if (matchedRule) break;
      }

      if (!matchedRule) {
        // Fallback: tìm rule áp dụng cho target bất kỳ trong ngày mà không bị hạn chế giờ
        for (const target of targets) {
          matchedRule = activeRules.find((r) => {
            if (r.appliesTo !== target) return false;
            return !r.dayOfWeek || r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek);
          });
          if (matchedRule) break;
        }
      }

      if (!matchedRule) {
        throw new BadRequestException(
          `No price rule found for resource ${resource.code} at slot ${slotIndex} (${startTime}-${endTime}) on ${dto.date}`,
        );
      }

      // Mỗi slot 30 phút = 1/2 giá mỗi giờ (Integer VND)
      const slotPrice = Math.round(matchedRule.pricePerHour / 2);
      assertValidMoney(slotPrice, `Slot price for index ${slotIndex}`);

      slotBreakdown.push({
        slotIndex,
        startTime,
        endTime,
        band: matchedRule.band,
        price: slotPrice,
      });

      totalPrice = addMoney(totalPrice, slotPrice);
    }

    const depositPercent = this.settingsService.get<number>('booking.depositPercent', 30);
    const depositAmount = Math.round(multiplyMoney(totalPrice, depositPercent) / 100);

    return {
      resourceCode: resource.code,
      date: dto.date,
      totalSlots: slotBreakdown.length,
      totalPrice,
      depositAmount,
      currency: 'VND',
      slots: slotBreakdown,
    };
  }
}
