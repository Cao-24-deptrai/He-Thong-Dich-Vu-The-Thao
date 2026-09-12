import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Venue, VenueDocument } from './schemas/venue.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueType, BookingStatus } from '../common/enums';

@Injectable()
export class VenuesService {
  constructor(
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  private formatVenue(venue: VenueDocument) {
    const obj = venue.toObject ? venue.toObject() : venue;
    const basePrice = obj.basePricePerHour ?? obj.defaultPrice ?? 200000;
    return {
      ...obj,
      basePricePerHour: basePrice,
      defaultPrice: basePrice,
      venueType: obj.type || obj.venueType || VenueType.FOOTBALL_5,
      type: obj.type || obj.venueType || VenueType.FOOTBALL_5,
      pricingConfig: obj.pricingRules?.peakHours || obj.pricingConfig || [],
      isActive: obj.isActive !== false,
      operatingHours: obj.operatingHours || { openTime: '06:00', closeTime: '22:00' },
      slotDurationMinutes: obj.slotDurationMinutes || 60,
      cancellationPolicy: obj.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 },
    };
  }

  async create(dto: CreateVenueDto): Promise<any> {
    let venueType = dto.type || (dto.venueType as any);
    if (!venueType || !Object.values(VenueType).includes(venueType)) {
      venueType = VenueType.FOOTBALL_5;
    }
    const basePricePerHour = dto.basePricePerHour ?? dto.defaultPrice ?? 200000;
    let pricingRules = dto.pricingRules;
    if (!pricingRules && dto.pricingConfig) {
      pricingRules = { peakHours: dto.pricingConfig };
    }

    const venue = new this.venueModel({
      facilityId: new Types.ObjectId(dto.facilityId),
      name: dto.name,
      type: venueType,
      basePricePerHour,
      pricingRules,
      isActive: true,
      operatingHours: dto.operatingHours || { openTime: '06:00', closeTime: '22:00' },
      slotDurationMinutes: dto.slotDurationMinutes || 60,
      cancellationPolicy: dto.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 },
    });
    const saved = await venue.save();
    return this.formatVenue(saved);
  }

  async update(id: string, dto: UpdateVenueDto): Promise<any> {
    const venue = await this.venueModel.findById(id).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân / địa điểm');
    }

    if (dto.name !== undefined) venue.name = dto.name;
    if (dto.type !== undefined) venue.type = dto.type;
    if (dto.venueType !== undefined && Object.values(VenueType).includes(dto.venueType as any)) {
      venue.type = dto.venueType as any;
    }
    if (dto.basePricePerHour !== undefined) {
      venue.basePricePerHour = dto.basePricePerHour;
    } else if (dto.defaultPrice !== undefined) {
      venue.basePricePerHour = dto.defaultPrice;
    }
    if (dto.pricingRules !== undefined) {
      venue.pricingRules = dto.pricingRules;
    } else if (dto.pricingConfig !== undefined) {
      venue.pricingRules = { peakHours: dto.pricingConfig };
    }
    if (dto.operatingHours !== undefined) venue.operatingHours = dto.operatingHours;
    if (dto.slotDurationMinutes !== undefined) venue.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.cancellationPolicy !== undefined) venue.cancellationPolicy = dto.cancellationPolicy;

    if (dto.isActive !== undefined) {
      if (dto.isActive === false) {
        // Kiểm tra ràng buộc: không được vô hiệu hóa nếu còn booking tương lai
        await this.assertNoActiveFutureBookings(id);
      }
      venue.isActive = dto.isActive;
    }

    const saved = await venue.save();
    return this.formatVenue(saved);
  }

  async remove(id: string): Promise<any> {
    const venue = await this.venueModel.findById(id).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân / địa điểm');
    }

    // Kiểm tra ràng buộc: không được xóa cứng/vô hiệu hóa nếu còn booking tương lai
    await this.assertNoActiveFutureBookings(id);

    venue.isActive = false;
    const saved = await venue.save();
    return this.formatVenue(saved);
  }

  private async assertNoActiveFutureBookings(venueId: string): Promise<void> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeBookingCount = await this.bookingModel.countDocuments({
      venueId: new Types.ObjectId(venueId),
      status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
      bookingDate: { $gte: startOfToday },
    });

    if (activeBookingCount > 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'VENUE_HAS_ACTIVE_BOOKINGS',
        message: 'Không thể vô hiệu hóa sân vì còn đơn đặt đang hoạt động trong tương lai',
        activeBookingCount,
      });
    }
  }

  async findAll(facilityId?: string, includeInactive: boolean = false): Promise<any[]> {
    const filter: any = {};
    if (facilityId) {
      filter.facilityId = new Types.ObjectId(facilityId);
    }
    if (!includeInactive) {
      filter.isActive = { $ne: false };
    }
    const venues = await this.venueModel.find(filter).exec();
    return venues.map((v) => this.formatVenue(v));
  }

  async findById(id: string): Promise<any> {
    const venue = await this.venueModel.findById(id).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân / địa điểm');
    }
    return this.formatVenue(venue);
  }
}
