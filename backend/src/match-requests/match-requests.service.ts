import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MatchRequest,
  MatchRequestDocument,
} from './schemas/match-request.schema';
import { MatchRequestStatus } from '../common/enums';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MatchRequestsService {
  private readonly logger = new Logger(MatchRequestsService.name);

  constructor(
    @InjectModel(MatchRequest.name)
    private matchRequestModel: Model<MatchRequestDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Tạo bài đăng cáp kèo / tìm đồng đội (Mục 5 & Mục 6.3)
   */
  async create(creatorId: string, dto: CreateMatchRequestDto): Promise<MatchRequestDocument> {
    const matchDate = new Date(dto.matchDate);
    if (isNaN(matchDate.getTime())) {
      throw new BadRequestException('Ngày giờ trận đấu không hợp lệ');
    }

    const matchRequest = new this.matchRequestModel({
      creatorId: new Types.ObjectId(creatorId),
      sportType: dto.sportType.toUpperCase(),
      matchDate,
      locationDescription: dto.locationDescription,
      slotsNeeded: dto.slotsNeeded,
      slotsFilled: 0,
      joinedUserIds: [],
      status: MatchRequestStatus.OPEN,
    });

    const saved = await matchRequest.save();
    this.logger.log(`⚽ Tạo bài cáp kèo thành công: ID ${saved._id} môn ${saved.sportType} bởi User ${creatorId}`);

    // Broadcast sự kiện kèo mới
    this.eventsGateway.server.emit('new_match_request', {
      id: saved._id,
      sportType: saved.sportType,
      matchDate: saved.matchDate,
      slotsNeeded: saved.slotsNeeded,
    });

    return saved;
  }

  /**
   * Lấy danh sách kèo thể thao đang tìm người (Mục 5)
   */
  async findAll(sportType?: string, status?: MatchRequestStatus) {
    const filter: any = {};
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: [MatchRequestStatus.OPEN, MatchRequestStatus.FULL] };
    }

    if (sportType) {
      filter.sportType = sportType.toUpperCase();
    }

    return this.matchRequestModel
      .find(filter)
      .populate('creatorId', 'fullName phone')
      .populate('joinedUserIds', 'fullName phone')
      .sort({ matchDate: 1 })
      .exec();
  }

  /**
   * Xem chi tiết kèo
   */
  async findOne(id: string): Promise<MatchRequestDocument> {
    const match = await this.matchRequestModel
      .findById(id)
      .populate('creatorId', 'fullName phone')
      .populate('joinedUserIds', 'fullName phone')
      .exec();

    if (!match) {
      throw new NotFoundException('Không tìm thấy bài đăng cáp kèo');
    }

    return match;
  }

  /**
   * Tham gia cáp kèo (Mục 5 - POST /match-requests/:id/join)
   */
  async joinMatch(id: string, userId: string): Promise<MatchRequestDocument> {
    const match = await this.matchRequestModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException('Không tìm thấy bài đăng cáp kèo');
    }

    if (match.status !== MatchRequestStatus.OPEN) {
      throw new BadRequestException(`Kèo này hiện ở trạng thái ${match.status}, không thể tham gia!`);
    }

    if (match.creatorId.toString() === userId) {
      throw new BadRequestException('Bạn là người tạo kèo này, không thể tự tham gia lại!');
    }

    const alreadyJoined = match.joinedUserIds?.some((uId) => uId.toString() === userId);
    if (alreadyJoined) {
      throw new ConflictException('Bạn đã tham gia kèo này trước đó rồi!');
    }

    if (match.slotsFilled >= match.slotsNeeded) {
      throw new BadRequestException('Kèo này đã đủ số lượng người chơi!');
    }

    // Cập nhật slotsFilled và danh sách người tham gia
    match.slotsFilled += 1;
    match.joinedUserIds.push(new Types.ObjectId(userId));

    if (match.slotsFilled >= match.slotsNeeded) {
      match.status = MatchRequestStatus.FULL;
    }

    const updated = await match.save();
    this.logger.log(`🤝 User ${userId} đã tham gia kèo ${id} (${match.slotsFilled}/${match.slotsNeeded})`);

    // Broadcast cập nhật người tham gia
    this.eventsGateway.server.emit('match_request_updated', {
      id: updated._id,
      slotsFilled: updated.slotsFilled,
      slotsNeeded: updated.slotsNeeded,
      status: updated.status,
    });

    return updated;
  }

  /**
   * Hủy bài đăng cáp kèo (Chỉ người tạo hoặc Admin)
   */
  async cancelMatch(id: string, userId: string, isAdmin = false): Promise<MatchRequestDocument> {
    const match = await this.matchRequestModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException('Không tìm thấy bài đăng cáp kèo');
    }

    if (!isAdmin && match.creatorId.toString() !== userId) {
      throw new ConflictException('Bạn không có quyền hủy bài đăng cáp kèo này');
    }

    match.status = MatchRequestStatus.CLOSED;
    const updated = await match.save();

    this.eventsGateway.server.emit('match_request_closed', { id: updated._id });
    return updated;
  }
}
