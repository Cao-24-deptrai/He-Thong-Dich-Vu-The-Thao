import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Venue, VenueDocument } from './schemas/venue.schema';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueType } from '../common/enums';

@Injectable()
export class VenuesService {
  constructor(
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
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
    });
    const saved = await venue.save();
    return this.formatVenue(saved);
  }

  async findAll(facilityId?: string): Promise<any[]> {
    const filter = facilityId ? { facilityId: new Types.ObjectId(facilityId) } : {};
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
