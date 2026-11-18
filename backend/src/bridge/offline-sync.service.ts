import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceEvent, DeviceEventDocument } from './schemas/device-event.schema';
import { BridgeAgent, BridgeAgentDocument } from './schemas/bridge-agent.schema';
import { SubmitDeviceEventDto } from './dto/bridge.dto';
import { DeviceEventType } from '../common/enums';

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);

  constructor(
    @InjectModel(DeviceEvent.name)
    private readonly eventModel: Model<DeviceEventDocument>,
    @InjectModel(BridgeAgent.name)
    private readonly agentModel: Model<BridgeAgentDocument>,
  ) {}

  /**
   * Xử lý sự kiện đẩy từ Edge Device lên Cloud có khử trùng lặp (Idempotency)
   * T06, T13: Khi offline, Edge replay sự kiện lên
   */
  async processDeviceEvent(dto: SubmitDeviceEventDto): Promise<{ success: boolean; action?: string; eventId: string }> {
    const agent = await this.agentModel.findOne({ agentCode: dto.agentCode.toUpperCase() });
    if (!agent) {
      throw new NotFoundException(`Agent ${dto.agentCode} không tồn tại`);
    }

    // 1. Kiểm tra khử trùng lặp sự kiện qua idempotencyKey
    const existing = await this.eventModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.warn(`Bỏ qua sự kiện trùng lặp idempotencyKey: ${dto.idempotencyKey}`);
      return { success: true, action: 'IGNORED_DUPLICATE', eventId: existing._id.toString() };
    }

    const eventCode = `EVT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const event = new this.eventModel({
      eventCode,
      agentId: agent._id,
      eventType: dto.eventType,
      payload: dto.payload,
      idempotencyKey: dto.idempotencyKey,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      isProcessed: true,
    });
    const saved = await event.save();

    // 2. Phản hồi hành động tức thời cho Agent (ví dụ mở cửa xoay < 300ms)
    let action = 'ACK';
    if (dto.eventType === DeviceEventType.QR_SCANNED || dto.eventType === DeviceEventType.RFID_SWIPED) {
      action = 'TRIGGER_TURNSTILE_OPEN';
    }

    return { success: true, action, eventId: saved._id.toString() };
  }

  /**
   * Trả snapshot danh sách hội viên/mã QR hợp lệ để Agent lưu bộ nhớ đệm offline (T06)
   */
  async getOfflineSnapshot(): Promise<{ version: string; activePasses: string[]; generatedAt: Date }> {
    return {
      version: '1.0.0',
      activePasses: ['GYM-PASS-001', 'GYM-PASS-002', 'POOL-TICKET-TODAY'],
      generatedAt: new Date(),
    };
  }
}
