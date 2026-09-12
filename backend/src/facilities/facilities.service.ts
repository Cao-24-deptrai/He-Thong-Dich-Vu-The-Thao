import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility, FacilityDocument } from './schemas/facility.schema';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { QueryFacilityDto } from './dto/query-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
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
    });
    return facility.save();
  }

  async findAll(query: QueryFacilityDto): Promise<FacilityDocument[]> {
    const filter: any = {};

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
