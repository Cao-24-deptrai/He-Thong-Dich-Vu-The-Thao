import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeviceCommand,
  DeviceCommandDocument,
} from '../schemas/device-command.schema.js';
import {
  BridgeAgent,
  BridgeAgentDocument,
} from '../schemas/bridge-agent.schema.js';
import {
  DispatchDeviceCommandDto,
  DeviceCommandDetailResponse,
  CompleteDeviceCommandDto,
} from '@sports/contracts';
import {
  DeviceCommandStatus,
  DeviceCommandType,
  BridgeAgentStatus,
} from '@sports/shared';

@Injectable()
export class DeviceCommandService {
  constructor(
    @InjectModel(DeviceCommand.name)
    private readonly deviceCommandModel: Model<DeviceCommandDocument>,
    @InjectModel(BridgeAgent.name)
    private readonly bridgeAgentModel: Model<BridgeAgentDocument>,
  ) {}

  /**
   * Tạo lệnh điều khiển thiết bị (in hóa đơn, mở két, mở cửa xoay, bật đèn)
   */
  async createCommand(dto: DispatchDeviceCommandDto): Promise<DeviceCommandDetailResponse> {
    // 1. Kiểm tra Idempotency Replay
    const existing = await this.deviceCommandModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      return this.mapToDetail(existing);
    }

    // 2. Kiểm tra Agent tồn tại và đang hoạt động
    const agent = await this.bridgeAgentModel.findById(dto.agentId).exec();
    if (!agent) {
      throw new NotFoundException(`Không tìm thấy agent với id ${dto.agentId}`);
    }

    if (agent.status === BridgeAgentStatus.REVOKED) {
      throw new BadRequestException('AGENT_REVOKED_CANNOT_DISPATCH');
    }

    // 3. Sinh commandCode duy nhất
    const commandCode = this.generateCommandCode();

    const command = new this.deviceCommandModel({
      commandCode,
      agentId: agent._id,
      commandType: dto.commandType,
      payload: dto.payload || {},
      priority: dto.priority || 1,
      idempotencyKey: dto.idempotencyKey,
      status: DeviceCommandStatus.PENDING,
    });

    const saved = await command.save();
    return this.mapToDetail(saved);
  }

  /**
   * Lấy các lệnh đang chờ (PENDING) dành cho Agent này theo thứ tự ưu tiên
   */
  async getPendingCommandsForAgent(
    agentId: Types.ObjectId | string,
    limit = 10,
  ): Promise<DeviceCommandDetailResponse[]> {
    const commands = await this.deviceCommandModel
      .find({
        agentId: new Types.ObjectId(agentId.toString()),
        status: DeviceCommandStatus.PENDING,
      })
      .sort({ priority: -1, createdAt: 1 })
      .limit(limit)
      .exec();

    // Đánh dấu các lệnh đã được gửi xuống Agent
    const commandIds = commands.map((c) => c._id);
    if (commandIds.length > 0) {
      await this.deviceCommandModel.updateMany(
        { _id: { $in: commandIds } },
        { $set: { status: DeviceCommandStatus.SENT } },
      );
    }

    return commands.map((c) => this.mapToDetail(c));
  }

  /**
   * Báo cáo kết quả thực thi lệnh từ Agent (Thành công hoặc Thất bại)
   */
  async completeCommand(
    agentId: Types.ObjectId | string,
    commandId: string,
    dto: CompleteDeviceCommandDto,
  ): Promise<DeviceCommandDetailResponse> {
    const command = await this.deviceCommandModel
      .findOne({
        _id: new Types.ObjectId(commandId),
        agentId: new Types.ObjectId(agentId.toString()),
      })
      .exec();

    if (!command) {
      throw new NotFoundException(`Không tìm thấy lệnh ${commandId} cho agent này`);
    }

    command.status = dto.status;
    command.executedAt = new Date();
    if (dto.errorMessage) {
      command.errorMessage = dto.errorMessage;
    }

    const saved = await command.save();
    return this.mapToDetail(saved);
  }

  /**
   * Shortcut: Kích mở cửa xoay phòng Gym hoặc cổng sân thể thao
   */
  async triggerTurnstile(
    agentId: string,
    direction: 'IN' | 'OUT' = 'IN',
    pulseDurationMs = 3000,
    idempotencyKey?: string,
  ): Promise<DeviceCommandDetailResponse> {
    const key = idempotencyKey || `TURNSTILE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return this.createCommand({
      agentId,
      commandType: DeviceCommandType.TRIGGER_TURNSTILE,
      payload: { direction, pulseDurationMs },
      priority: 10, // Ưu tiên khẩn cấp mở cửa ngay
      idempotencyKey: key,
    });
  }

  /**
   * Shortcut: Kích mở ngăn kéo đựng tiền tại quầy thu ngân (Cash Drawer)
   */
  async openCashDrawer(agentId: string, idempotencyKey: string): Promise<DeviceCommandDetailResponse> {
    return this.createCommand({
      agentId,
      commandType: DeviceCommandType.OPEN_CASH_DRAWER,
      payload: { pulseMs: 100 },
      priority: 8,
      idempotencyKey,
    });
  }

  /**
   * Shortcut: In phiếu thu / hóa đơn bán hàng ESC/POS
   */
  async printReceipt(
    agentId: string,
    receiptContent: string,
    idempotencyKey: string,
  ): Promise<DeviceCommandDetailResponse> {
    return this.createCommand({
      agentId,
      commandType: DeviceCommandType.PRINT_RECEIPT,
      payload: { receiptContent, cutPaper: true },
      priority: 5,
      idempotencyKey,
    });
  }

  private generateCommandCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CMD-${dateStr}-${rand}`;
  }

  private mapToDetail(c: DeviceCommandDocument): DeviceCommandDetailResponse {
    return {
      id: c._id.toString(),
      commandCode: c.commandCode,
      agentId: c.agentId.toString(),
      commandType: c.commandType,
      payload: c.payload || {},
      status: c.status,
      priority: c.priority,
      idempotencyKey: c.idempotencyKey,
      executedAt: c.executedAt,
      errorMessage: c.errorMessage,
      createdAt: (c as any).createdAt || new Date(),
    };
  }
}
