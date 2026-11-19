import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Facility, FacilityDocument } from './schemas/facility.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilityDto } from './dto/query-facility.dto';

@Injectable()
export class FacilitiesService implements OnModuleInit {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.facilityModel.countDocuments();
      if (count > 1) {
        this.logger.log(`[Auto-Consolidate] Phát hiện ${count} cơ sở. Đang tự động gom toàn bộ về 1 cơ sở duy nhất 'Tổ Hợp Thể Thao Phanta Sports'...`);
        await this.consolidateToSingleFacility('Tổ Hợp Thể Thao Phanta Sports');
        this.logger.log(`✅ [Auto-Consolidate] Đã gom toàn bộ cơ sở và các sân về 1 cơ sở duy nhất thành công.`);
      }
    } catch (err: any) {
      this.logger.error(`Lỗi khi tự động gom cơ sở: ${err.message}`);
    }
  }

  async create(dto: CreateFacilityDto, ownerId?: string): Promise<FacilityDocument> {
    const lng = dto.location?.longitude ?? 106.660172;
    const lat = dto.location?.latitude ?? 10.762622;
    const sportTypes = dto.sportTypes || (dto.sportType ? [dto.sportType.toUpperCase()] : []);

    const facility = new this.facilityModel({
      name: dto.name,
      address: dto.address,
      description: dto.description || '',
      openHour: dto.openHour || '06:00',
      closeHour: dto.closeHour || '23:00',
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
    if (dto.description !== undefined) facility.description = dto.description;
    if (dto.openHour !== undefined) facility.openHour = dto.openHour;
    if (dto.closeHour !== undefined) facility.closeHour = dto.closeHour;
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

  /**
   * Gom toàn bộ hệ thống về 1 cơ sở duy nhất, chuyển toàn bộ các sân về cơ sở này
   */
  async consolidateToSingleFacility(targetName = 'Tổ Hợp Thể Thao Phanta Sports'): Promise<FacilityDocument> {
    // 1. Tìm hoặc tạo cơ sở duy nhất
    let singleFacility = await this.facilityModel.findOne({ name: targetName }).exec();

    if (!singleFacility) {
      singleFacility = await this.facilityModel.findOne().exec();
      if (singleFacility) {
        singleFacility.name = targetName;
        singleFacility.address = '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM';
        singleFacility.sportTypes = ['FOOTBALL', 'BADMINTON', 'PICKLEBALL', 'TENNIS', 'ESPORTS'];
        singleFacility.openHour = '06:00';
        singleFacility.closeHour = '23:00';
        singleFacility.isActive = true;
        await singleFacility.save();
      } else {
        singleFacility = new this.facilityModel({
          name: targetName,
          address: '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM',
          sportTypes: ['FOOTBALL', 'BADMINTON', 'PICKLEBALL', 'TENNIS', 'ESPORTS'],
          openHour: '06:00',
          closeHour: '23:00',
          isActive: true,
          location: { type: 'Point', coordinates: [106.660172, 10.762622] },
        });
        await singleFacility.save();
      }
    } else {
      singleFacility.address = '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM';
      singleFacility.sportTypes = ['FOOTBALL', 'BADMINTON', 'PICKLEBALL', 'TENNIS', 'ESPORTS'];
      singleFacility.openHour = '06:00';
      singleFacility.closeHour = '23:00';
      singleFacility.isActive = true;
      await singleFacility.save();
    }

    const singleFacilityId = singleFacility._id;

    // 2. Chuyển toàn bộ các sân (Venues) về cơ sở duy nhất này
    await this.venueModel.updateMany(
      {},
      { $set: { facilityId: singleFacilityId, isActive: true } }
    );

    // 3. Xóa các cơ sở còn lại
    await this.facilityModel.deleteMany({ _id: { $ne: singleFacilityId } });

    this.logger.log(`Đã gom toàn bộ sân về cơ sở ID: ${singleFacilityId}`);
    return singleFacility;
  }
}
