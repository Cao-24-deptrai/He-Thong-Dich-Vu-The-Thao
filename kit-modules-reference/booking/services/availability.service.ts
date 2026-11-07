import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookingSlot, BookingSlotDocument } from '../schemas/booking-slot.schema.js';
import { ResourceService } from '../../facility/services/resource.service.js';
import { OperatingHoursService } from '../../facility/services/operating-hours.service.js';
import { ClosureService } from '../../facility/services/closure.service.js';
import { PricingService } from '../../facility/services/pricing.service.js';
import {
  AvailabilityQueryDto,
  AvailabilityResponse,
  SlotAvailabilityDetail,
  SlotAvailabilityStatus,
} from '@sports/contracts';
import {
  parseVietnamDate,
  slotIndexToTimeString,
  slotToUtcRange,
  SLOTS_PER_DAY,
} from '@sports/shared';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(BookingSlot.name) private readonly bookingSlotModel: Model<BookingSlotDocument>,
    private readonly resourceService: ResourceService,
    private readonly operatingHoursService: OperatingHoursService,
    private readonly closureService: ClosureService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Tính toán ma trận trạng thái 48 slot cho một sân/tài nguyên theo ngày
   */
  async getAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResponse> {
    const resource = await this.resourceService.findByCode(query.resourceCode);
    const dateDt = parseVietnamDate(query.date);
    const dayOfWeek = dateDt.weekday % 7; // 0 = Chủ Nhật, 1 = Thứ 2...
    const now = new Date();

    // 1. Phân giải các đơn vị cơ sở (base units)
    const baseUnitIds = await this.resourceService.resolveBaseUnits(resource.code);

    // 2. Tra cứu giờ mở cửa & ngày đặc biệt
    const opHours = await this.operatingHoursService.getOperatingHours();
    const special = opHours.specialDates.find((s) => s.date === query.date);
    const weekly = opHours.weeklySchedules.find((w) => w.dayOfWeek === dayOfWeek);

    const isFacilityOpen = special ? special.isOpen : weekly ? weekly.isOpen : true;
    const openTime = special?.openTime || weekly?.openTime || '06:00';
    const closeTime = special?.closeTime || weekly?.closeTime || '23:00';

    // 3. Tra cứu lịch đóng sân / bảo trì trong ngày
    const startOfDayUtc = dateDt.toUTC().toJSDate();
    const endOfDayUtc = dateDt.endOf('day').toUTC().toJSDate();

    const closures = await this.closureService.findAll({
      fromAt: startOfDayUtc,
      toAt: endOfDayUtc,
    });

    // Lọc các closure ảnh hưởng đến ít nhất 1 baseUnit
    const relevantClosures = closures.filter((c) =>
      c.affectedUnitIds.some((u) => baseUnitIds.includes(u)),
    );

    // 4. Lấy tất cả các booking slots đã đặt hoặc đang giữ
    const existingSlots = await this.bookingSlotModel.find({
      unitId: { $in: baseUnitIds },
      date: query.date,
    }).exec();

    // Lập map để kiểm tra slotIndex đã bị chiếm chưa
    const occupiedSlotMap = new Map<number, 'HELD' | 'CONFIRMED'>();
    for (const s of existingSlots) {
      if (s.status === 'CONFIRMED') {
        occupiedSlotMap.set(s.slotIndex, 'CONFIRMED');
      } else if (s.status === 'HELD') {
        if (s.holdExpiresAt && s.holdExpiresAt > now) {
          if (!occupiedSlotMap.has(s.slotIndex)) {
            occupiedSlotMap.set(s.slotIndex, 'HELD');
          }
        }
      }
    }

    // 5. Tính giá tiền toàn bộ các slot trong ngày
    const allSlotIndices = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);
    let priceDetails: { slotIndex: number; price: number; band: any }[] = [];

    try {
      const priceResult = await this.pricingService.calculatePrice({
        resourceCode: resource.code,
        date: query.date,
        slotIndices: allSlotIndices,
      });
      priceDetails = priceResult.slots;
    } catch {
      // Fallback nếu có lỗi tính giá
      priceDetails = allSlotIndices.map((i) => ({ slotIndex: i, price: 0, band: 'OFFPEAK' as any }));
    }

    // 6. Tổng hợp trạng thái từng slot
    const slots: SlotAvailabilityDetail[] = [];

    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      const { startTime, endTime } = slotIndexToTimeString(i);
      const { startUtc, endUtc } = slotToUtcRange(query.date, i);
      const priceItem = priceDetails.find((p) => p.slotIndex === i);

      let status = SlotAvailabilityStatus.AVAILABLE;

      // Kiểm tra ngoài giờ mở cửa
      if (!isFacilityOpen || startTime < openTime || endTime > closeTime) {
        status = SlotAvailabilityStatus.CLOSED;
      }

      // Kiểm tra rơi vào khung giờ bảo trì/đóng sân
      if (status !== SlotAvailabilityStatus.CLOSED) {
        const isClosed = relevantClosures.some(
          (c) => c.fromAt < endUtc && c.toAt > startUtc,
        );
        if (isClosed) {
          status = SlotAvailabilityStatus.CLOSED;
        }
      }

      // Kiểm tra đã có người đặt hoặc giữ
      if (status === SlotAvailabilityStatus.AVAILABLE) {
        const occupied = occupiedSlotMap.get(i);
        if (occupied === 'CONFIRMED') {
          status = SlotAvailabilityStatus.BOOKED;
        } else if (occupied === 'HELD') {
          status = SlotAvailabilityStatus.HELD;
        }
      }

      slots.push({
        slotIndex: i,
        startTime,
        endTime,
        status,
        price: priceItem?.price || 0,
        band: priceItem?.band || ('OFFPEAK' as any),
      });
    }

    return {
      resourceCode: resource.code,
      date: query.date,
      slots,
    };
  }
}
