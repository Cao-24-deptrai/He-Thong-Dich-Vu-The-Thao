import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import crypto from 'node:crypto';
import {
  GymMembership,
  GymMembershipDocument,
} from '../../gym/schemas/gym-membership.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { BridgeAgentDocument } from '../schemas/bridge-agent.schema.js';
import { DeviceEventService } from './device-event.service.js';
import {
  OfflineMemberItem,
  OfflineMemberSyncResponse,
  DeviceEventItemDto,
  IngestDeviceEventsResponse,
} from '@sports/contracts';
import { GymMembershipStatus } from '@sports/shared';

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);
  private readonly OFFLINE_CACHE_SECRET = 'offline-agent-cache-hmac-secret-key-2026';

  constructor(
    @InjectModel(GymMembership.name)
    private readonly gymMembershipModel: Model<GymMembershipDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly deviceEventService: DeviceEventService,
  ) {}

  /**
   * Sinh snapshot bộ nhớ đệm thành viên hợp lệ để tải về Bridge Agent chạy ngoại tuyến
   */
  async getOfflineMemberSnapshot(): Promise<OfflineMemberSyncResponse> {
    const now = new Date();
    const activeMemberships = await this.gymMembershipModel
      .find({
        status: GymMembershipStatus.ACTIVE,
        endDate: { $gte: now },
      })
      .exec();

    const userIds = activeMemberships.map((m) => m.userId);
    const users = await this.userModel.find({ _id: { $in: userIds } }).exec();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const members: OfflineMemberItem[] = activeMemberships.map((m) => {
      const u = userMap.get(m.userId.toString());
      const memberId = m._id.toString();
      const fullName = u?.fullName || 'Hội viên Gym';
      const phone = u?.phone || '';
      const validUntil = m.endDate;
      const membershipType = (m as any).packageCode || 'GYM';

      // Sinh chữ ký xác thực HMAC-SHA256 để Agent xác minh tính toàn vẹn khi offline
      const signature = crypto
        .createHmac('sha256', this.OFFLINE_CACHE_SECRET)
        .update(`${memberId}:${phone}:${validUntil.toISOString()}`)
        .digest('hex');

      return {
        memberId,
        fullName,
        phone,
        rfidCardNumberHash: (m as any).rfidCardNumber ? this.hashString((m as any).rfidCardNumber) : undefined,
        qrIdentifierHash: this.hashString(memberId),
        validUntil,
        membershipType,
        signature,
      };
    });

    return {
      snapshotTime: new Date(),
      totalMembers: members.length,
      members,
    };
  }

  /**
   * Đồng bộ hàng đợi sự kiện ngoại tuyến được lưu tại Bridge Agent khi mất mạng
   */
  async syncOfflineEvents(
    agent: BridgeAgentDocument,
    events: DeviceEventItemDto[],
  ): Promise<IngestDeviceEventsResponse> {
    this.logger.log(
      `[OfflineSync] Nhận ${events.length} sự kiện ngoại tuyến từ Agent ${agent.agentCode}`,
    );

    const replayedEvents = events.map((e) => ({
      ...e,
      isOfflineReplay: true,
    }));

    return this.deviceEventService.ingestEvents(agent, { events: replayedEvents });
  }

  private hashString(val: string): string {
    return crypto.createHash('sha256').update(val).digest('hex');
  }
}
