import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility, FacilityDocument } from './schemas/facility.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilityDto } from './dto/query-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
  ) {}

  async create(dto: CreateFacilityDto, ownerId?: string): Promise<FacilityDocument> {
    const lng = dto.location?.longitude ?? 106.660172;
    const lat = dto.location?.latitude ?? 10.762622;
    const sportTypes = dto.sportTypes || (dto.sportType ? [dto.sportType.toUpperCase()] : []);

    const facility = new this.facilityModel({
      name: dto.name,
      address: dto.address,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      sportTypes,
      ownerId: ownerId ? new Types.ObjectId(ownerId) : undefined,
      isActive: true,
    });
    return facility.save();
  }

  async update(id: string, dto: UpdateFacilityDto): Promise<FacilityDocument> {
    const facility = await this.findById(id);

    if (dto.name !== undefined) facility.name = dto.name;
    if (dto.address !== undefined) facility.address = dto.address;
    if (dto.sportTypes !== undefined) {
      facility.sportTypes = dto.sportTypes;
    } else if (dto.sportType !== undefined) {
      facility.sportTypes = [dto.sportType.toUpperCase()];
    }
    if (dto.location !== undefined) {
      const lng = dto.location.longitude ?? facility.location?.coordinates?.[0] ?? 106.660172;
      const lat = dto.location.latitude ?? facility.location?.coordinates?.[1] ?? 10.762622;
      facility.location = { type: 'Point', coordinates: [lng, lat] };
    }
    if (dto.isActive !== undefined) {
      if (dto.isActive === false) {
        // Kiểm tra ràng buộc các sân con còn active
        const activeVenuesCount = await this.venueModel.countDocuments({
          facilityId: new Types.ObjectId(id),
          isActive: { $ne: false },
        });
        if (activeVenuesCount > 0) {
          throw new BadRequestException({
            statusCode: 400,
            errorCode: 'FACILITY_HAS_ACTIVE_VENUES',
            message: 'Không thể vô hiệu hóa cơ sở khi vẫn còn sân con đang hoạt động',
            activeVenuesCount,
          });
        }
      }
      facility.isActive = dto.isActive;
    }

    return facility.save();
  }

  async remove(id: string): Promise<FacilityDocument> {
    const facility = await this.findById(id);

    // Kiểm tra ràng buộc: Facility chỉ được vô hiệu hóa khi toàn bộ Venues con bên trong đã bị vô hiệu hóa trước
    const activeVenuesCount = await this.venueModel.countDocuments({
      facilityId: new Types.ObjectId(id),
      isActive: { $ne: false },
    });

    if (activeVenuesCount > 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'FACILITY_HAS_ACTIVE_VENUES',
        message: 'Không thể vô hiệu hóa cơ sở khi vẫn còn sân con đang hoạt động',
        activeVenuesCount,
      });
    }

    // Soft delete
    facility.isActive = false;
    return facility.save();
  }

  async findAll(query: QueryFacilityDto): Promise<FacilityDocument[]> {
    const filter: any = {};

    const includeInactive = query.includeInactive === true || query.includeInactive === 'true';
    if (!includeInactive) {
      filter.isActive = { $ne: false };
    }

    if (query.sportType) {
      filter.sportTypes = { $in: [query.sportType.toUpperCase()] };
    }

    if (query.lng !== undefined && query.lat !== undefined) {
      const maxDistance = query.maxDistance || 10000; // 10km
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [query.lng, query.lat],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    return this.facilityModel.find(filter).exec();
  }

  async findById(id: string): Promise<FacilityDocument> {
    const facility = await this.facilityModel.findById(id).exec();
    if (!facility) {
      throw new NotFoundException('Không tìm thấy tổ hợp thể thao');
    }
    return facility;
  }
}
