import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PriceRule, PriceRuleDocument, PriceBand } from './schemas/price-rule.schema';
import { Closure, ClosureDocument } from './schemas/closure.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { CreatePriceRuleDto, CalculatePriceDto } from './dto/price-rule.dto';
import { CreateClosureDto } from './dto/create-closure.dto';

export interface PriceCalculationResult {
  venueId: string;
  venueName: string;
  courtCode?: string;
  date: string;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  totalBlocks: number;
  basePricePerHour: number;
  peakHourSurchargePerHour: number;
  isPeakIncluded: boolean;
  totalPriceBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
  blocks: {
    blockIndex: number;
    startTime: string;
    endTime: string;
    isPeak: boolean;
    price: number;
  }[];
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectModel(PriceRule.name) private priceRuleModel: Model<PriceRuleDocument>,
    @InjectModel(Closure.name) private closureModel: Model<ClosureDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
  ) {}

  /**
   * BR-04: Bảng giá động theo khung giờ
   * - Bước thời gian chuẩn: block 30 phút.
   * - Đơn giá tính theo block 30 phút dựa trên giá niêm yết chưa VAT.
   * - Tự động kích hoạt phụ thu giờ cao điểm 50.000 VND/giờ (25.000 VND / block 30p)
   *   vào khung 17:30 - 21:00 từ Thứ Hai đến Thứ Sáu và toàn bộ ngày Thứ Bảy, Chủ Nhật.
   */
  async calculatePrice(dto: CalculatePriceDto): Promise<PriceCalculationResult> {
    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân thể thao');
    }

    const [startH, startM] = dto.startTime.split(':').map(Number);
    const [endH, endM] = dto.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('Giờ kết thúc phải lớn hơn giờ bắt đầu');
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes % 30 !== 0) {
      throw new BadRequestException('Thời lượng đặt sân phải là bội số của block 30 phút (BR-02)');
    }

    const totalBlocks = durationMinutes / 30;
    const dateObj = new Date(`${dto.date}T00:00:00.000Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0: CN, 1: T2, ..., 6: T7

    // Khởi tạo mức giá cơ sở
    const basePricePerHour = venue.basePricePerHour || 250000;
    const baseBlockPrice = Math.round(basePricePerHour / 2);
    const peakSurchargePerBlock = 25000; // 50.000 VND/giờ => 25.000 VND / 30 phút (BR-04)

    let isPeakIncluded = false;
    let totalPriceBeforeVat = 0;
    const blocks = [];

    for (let i = 0; i < totalBlocks; i++) {
      const bStartMin = startMinutes + i * 30;
      const bEndMin = bStartMin + 30;

      const sh = Math.floor(bStartMin / 60).toString().padStart(2, '0');
      const sm = (bStartMin % 60).toString().padStart(2, '0');
      const eh = Math.floor(bEndMin / 60).toString().padStart(2, '0');
      const em = (bEndMin % 60).toString().padStart(2, '0');

      const blockStart = `${sh}:${sm}`;
      const blockEnd = `${eh}:${em}`;

      // Kiểm tra quy tắc giờ cao điểm theo BR-04:
      // - Thứ 7 (6) hoặc Chủ Nhật (0): Toàn bộ các khung giờ đều tính cao điểm
      // - Thứ 2 - Thứ 6: Khung từ 17:30 đến 21:00
      let isPeak = false;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        isPeak = true;
      } else {
        // T2 -> T6: kiểm tra giao thoa với [17:30, 21:00]
        if (blockStart >= '17:30' && blockStart < '21:00') {
          isPeak = true;
        }
      }

      if (isPeak) isPeakIncluded = true;

      const blockPrice = isPeak ? (baseBlockPrice + peakSurchargePerBlock) : baseBlockPrice;
      totalPriceBeforeVat += blockPrice;

      blocks.push({
        blockIndex: i,
        startTime: blockStart,
        endTime: blockEnd,
        isPeak,
        price: blockPrice,
      });
    }

    // Thuế VAT chuẩn 8% hoặc theo chính sách
    const vatRate = 0.08;
    const vatAmount = Math.round(totalPriceBeforeVat * vatRate);
    const totalPrice = totalPriceBeforeVat + vatAmount;

    return {
      venueId: (venue._id as any).toString(),
      venueName: venue.name,
      courtCode: venue.courtCode,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      totalDurationMinutes: durationMinutes,
      totalBlocks,
      basePricePerHour,
      peakHourSurchargePerHour: 50000,
      isPeakIncluded,
      totalPriceBeforeVat,
      vatRate,
      vatAmount,
      totalPrice,
      blocks,
    };
  }

  // --- CRUD Price Rules ---
  async createPriceRule(dto: CreatePriceRuleDto): Promise<PriceRuleDocument> {
    const rule = new this.priceRuleModel({
      appliesTo: dto.appliesTo.toUpperCase(),
      band: dto.band,
      dayOfWeek: dto.dayOfWeek || [],
      startTime: dto.startTime,
      endTime: dto.endTime,
      pricePerHour: dto.pricePerHour,
      surchargePerHour: dto.surchargePerHour || 0,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      isActive: true,
    });
    return rule.save();
  }

  async getPriceRules(appliesTo?: string): Promise<PriceRuleDocument[]> {
    const filter: any = { isActive: true };
    if (appliesTo) {
      filter.appliesTo = appliesTo.toUpperCase();
    }
    return this.priceRuleModel.find(filter).sort({ effectiveFrom: -1 }).exec();
  }

  // --- Closures (Đóng sân bảo trì / sự kiện) ---
  async createClosure(dto: CreateClosureDto, userId?: string): Promise<ClosureDocument> {
    const closure = new this.closureModel({
      facilityId: new Types.ObjectId(dto.facilityId),
      resourceIds: dto.resourceIds,
      fromAt: new Date(dto.fromAt),
      toAt: new Date(dto.toAt),
      reason: dto.reason,
      notes: dto.notes,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: true,
    });
    return closure.save();
  }

  async getClosures(facilityId?: string, resourceId?: string): Promise<ClosureDocument[]> {
    const filter: any = { isActive: true };
    if (facilityId) {
      filter.facilityId = new Types.ObjectId(facilityId);
    }
    if (resourceId) {
      filter.resourceIds = { $in: [resourceId] };
    }
    return this.closureModel.find(filter).sort({ fromAt: -1 }).exec();
  }

  async isResourceClosed(resourceCode: string, startDateTime: Date, endDateTime: Date): Promise<boolean> {
    const count = await this.closureModel.countDocuments({
      isActive: true,
      resourceIds: { $in: [resourceCode] },
      fromAt: { $lt: endDateTime },
      toAt: { $gt: startDateTime },
    });
    return count > 0;
  }
}
