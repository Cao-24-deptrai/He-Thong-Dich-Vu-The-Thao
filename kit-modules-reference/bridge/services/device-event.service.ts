import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeviceEvent,
  DeviceEventDocument,
} from '../schemas/device-event.schema.js';
import {
  BridgeAgentDocument,
} from '../schemas/bridge-agent.schema.js';
import { DeviceCommandService } from './device-command.service.js';
import { GymService } from '../../gym/services/gym.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  DeviceEventItemDto,
  IngestDeviceEventsDto,
  IngestDeviceEventsResponse,
} from '@sports/contracts';
import {
  DeviceEventType,
  GymAccessMethod,
} from '@sports/shared';

@Injectable()
export class DeviceEventService {
  private readonly logger = new Logger(DeviceEventService.name);

  constructor(
    @InjectModel(DeviceEvent.name)
    private readonly deviceEventModel: Model<DeviceEventDocument>,
    private readonly deviceCommandService: DeviceCommandService,
    private readonly gymService: GymService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Tiếp nhận danh sách sự kiện từ Bridge Agent gửi lên (Realtime hoặc Replay)
   */
  async ingestEvents(
    agent: BridgeAgentDocument,
    dto: IngestDeviceEventsDto,
  ): Promise<IngestDeviceEventsResponse> {
    const actionResults: {
      eventCode: string;
      success: boolean;
      message?: string;
      triggeredTurnstile: boolean;
    }[] = [];

    let processedCount = 0;

    for (const evtDto of dto.events) {
      // 1. Kiểm tra Idempotency Replay (tránh xử lý trùng khi mạng chập chờn)
      const existing = await this.deviceEventModel
        .findOne({ idempotencyKey: evtDto.idempotencyKey })
        .exec();

      if (existing) {
        actionResults.push({
          eventCode: evtDto.eventCode,
          success: true,
          message: 'Sự kiện đã được ghi nhận trước đó (Idempotent Replay)',
          triggeredTurnstile: false,
        });
        continue;
      }

      // 2. Lưu bản ghi sự kiện thiết bị
      const deviceEvent = new this.deviceEventModel({
        eventCode: evtDto.eventCode,
        agentId: agent._id,
        eventType: evtDto.eventType,
        deviceType: evtDto.deviceType,
        payload: evtDto.payload || {},
        occurredAt: new Date(evtDto.occurredAt),
        syncedAt: new Date(),
        isOfflineReplay: evtDto.isOfflineReplay || false,
        idempotencyKey: evtDto.idempotencyKey,
        processed: false,
      });

      // 3. Xử lý nghiệp vụ theo từng loại sự kiện
      let success = true;
      let message = 'Đã xử lý sự kiện';
      let triggeredTurnstile = false;

      try {
        const result = await this.processSingleEvent(agent, evtDto);
        success = result.success;
        message = result.message;
        triggeredTurnstile = result.triggeredTurnstile;
        deviceEvent.processed = true;
        deviceEvent.processResult = message;
      } catch (err: any) {
        success = false;
        message = err.message || 'Lỗi xử lý sự kiện thiết bị';
        deviceEvent.processed = false;
        deviceEvent.processResult = message;
      }

      await deviceEvent.save();
      processedCount++;

      actionResults.push({
        eventCode: evtDto.eventCode,
        success,
        message,
        triggeredTurnstile,
      });
    }

    return {
      receivedCount: dto.events.length,
      processedCount,
      actionResults,
    };
  }

  /**
   * Phân loại và xử lý logic nghiệp vụ cho 1 sự kiện thiết bị
   */
  private async processSingleEvent(
    agent: BridgeAgentDocument,
    evtDto: DeviceEventItemDto,
  ): Promise<{ success: boolean; message: string; triggeredTurnstile: boolean }> {
    switch (evtDto.eventType) {
      case DeviceEventType.QR_SCANNED:
      case DeviceEventType.RFID_SWIPED: {
        return this.handleAccessCardOrQrScanned(agent, evtDto);
      }

      case DeviceEventType.TURNSTILE_PASSED: {
        this.logger.log(`[BridgeAgent ${agent.agentCode}] Turnstile passed: ${JSON.stringify(evtDto.payload)}`);
        return {
          success: true,
          message: 'Đã xác nhận khách đi qua cửa xoay',
          triggeredTurnstile: false,
        };
      }

      case DeviceEventType.DRAWER_OPENED: {
        await this.auditLogService.record({
          action: 'CASH_DRAWER_KICKED',
          actorId: agent._id.toString(),
          targetType: 'BridgeAgent',
          targetId: agent.agentCode,
          after: { payload: evtDto.payload, occurredAt: evtDto.occurredAt },
        });
        return {
          success: true,
          message: 'Đã ghi nhận sự kiện mở két tiền',
          triggeredTurnstile: false,
        };
      }

      case DeviceEventType.TAMPER_ALERT: {
        this.logger.warn(`[BridgeAgent ${agent.agentCode}] CẢNH BÁO XÂM PHẠM PHẦN CỨNG: ${JSON.stringify(evtDto.payload)}`);
        return {
          success: true,
          message: 'Đã tiếp nhận cảnh báo xâm phạm thiết bị',
          triggeredTurnstile: false,
        };
      }

      case DeviceEventType.PRINTER_STATUS_CHANGED: {
        return {
          success: true,
          message: 'Đã cập nhật trạng thái máy in',
          triggeredTurnstile: false,
        };
      }

      default:
        return {
          success: true,
          message: 'Sự kiện không yêu cầu hành động tự động',
          triggeredTurnstile: false,
        };
    }
  }

  /**
   * Xử lý quẹt thẻ RFID hoặc quét mã QR tại cổng kiểm soát
   */
  private async handleAccessCardOrQrScanned(
    agent: BridgeAgentDocument,
    evtDto: DeviceEventItemDto,
  ): Promise<{ success: boolean; message: string; triggeredTurnstile: boolean }> {
    const payload = evtDto.payload || {};
    const targetService = payload.targetService || 'GYM';

    if (targetService === 'GYM') {
      const isExit = payload.direction === 'OUT';

      if (isExit) {
        // Khách check-out phòng gym
        if (payload.userId) {
          await this.gymService.checkOut({ userId: payload.userId });
        }
        // Kích mở cửa xoay chiều ra
        await this.deviceCommandService.triggerTurnstile(
          agent._id.toString(),
          'OUT',
          3000,
          `AUTO-OPEN-OUT-${evtDto.eventCode}`,
        );
        return {
          success: true,
          message: 'Check-out Gym thành công. Đã mở cửa xoay ra.',
          triggeredTurnstile: true,
        };
      } else {
        // Khách check-in phòng gym vào tập
        const checkInDto = evtDto.eventType === DeviceEventType.QR_SCANNED
          ? { method: GymAccessMethod.DYNAMIC_QR, qrToken: payload.qrToken }
          : { method: GymAccessMethod.RFID, rfidCardId: payload.rfidCardNumber };

        const checkInRes = await this.gymService.checkIn(
          checkInDto as any,
          `bridge-agent-${agent.agentCode}`,
        );

        if (checkInRes.success) {
          // Kích mở rơ-le cửa xoay 3 giây cho khách vào
          await this.deviceCommandService.triggerTurnstile(
            agent._id.toString(),
            'IN',
            3000,
            `AUTO-OPEN-IN-${evtDto.eventCode}`,
          );
          return {
            success: true,
            message: `Check-in Gym thành công. Số người đang tập: ${checkInRes.currentInside}. Cửa xoay đã mở.`,
            triggeredTurnstile: true,
          };
        } else {
          return {
            success: false,
            message: checkInRes.message || 'Check-in thất bại',
            triggeredTurnstile: false,
          };
        }
      }
    }

    return {
      success: true,
      message: 'Đã ghi nhận quét thẻ/mã',
      triggeredTurnstile: false,
    };
  }

  /**
   * Lấy lịch sử sự kiện gần đây theo Agent
   */
  async getRecentEvents(agentId: string, limit = 50): Promise<DeviceEventDocument[]> {
    return this.deviceEventModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .exec();
  }
}
