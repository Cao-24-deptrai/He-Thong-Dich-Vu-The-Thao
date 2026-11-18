import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceCommand, DeviceCommandDocument } from './schemas/device-command.schema';
import { CreateDeviceCommandDto } from './dto/bridge.dto';
import { DeviceCommandStatus } from '../common/enums';

@Injectable()
export class DeviceCommandService {
  private readonly logger = new Logger(DeviceCommandService.name);

  constructor(
    @InjectModel(DeviceCommand.name)
    private readonly commandModel: Model<DeviceCommandDocument>,
  ) {}

  async createCommand(dto: CreateDeviceCommandDto): Promise<DeviceCommand> {
    const commandCode = `CMD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const idempotencyKey = `KEY-${commandCode}`;

    const targetAgentId = Types.ObjectId.isValid(dto.agentId)
      ? new Types.ObjectId(dto.agentId)
      : dto.agentId;

    const command = new this.commandModel({
      commandCode,
      agentId: targetAgentId,
      commandType: dto.commandType,
      payload: dto.params || dto.payload || {},
      priority: dto.priority || 1,
      status: DeviceCommandStatus.PENDING,
      idempotencyKey,
    });
    return command.save();
  }

  async getPendingCommands(agentId: string): Promise<DeviceCommand[]> {
    const agentQuery = Types.ObjectId.isValid(agentId)
      ? { $in: [new Types.ObjectId(agentId), agentId] }
      : agentId;
    return this.commandModel
      .find({
        agentId: agentQuery,
        status: DeviceCommandStatus.PENDING,
      })
      .sort({ priority: -1, createdAt: 1 })
      .lean();
  }

  async markCommandExecuted(commandId: string, error?: string): Promise<DeviceCommand> {
    const command = await this.commandModel.findById(commandId);
    if (!command) {
      throw new NotFoundException('Không tìm thấy lệnh');
    }
    command.status = error ? DeviceCommandStatus.FAILED : DeviceCommandStatus.EXECUTED;
    command.executedAt = new Date();
    command.errorMessage = error;
    return command.save();
  }

  async ackCommand(commandId: string, data?: { status?: string; result?: any; error?: string }): Promise<any> {
    const command = await this.commandModel.findById(commandId);
    if (!command) {
      throw new NotFoundException('Không tìm thấy lệnh');
    }
    command.status = data?.error ? DeviceCommandStatus.FAILED : DeviceCommandStatus.EXECUTED;
    command.executedAt = new Date();
    if (data?.error) command.errorMessage = data.error;
    const saved = await command.save();
    return {
      ...(saved.toObject ? saved.toObject() : saved),
      status: data?.status || (data?.error ? 'FAILED' : 'COMPLETED'),
    };
  }
}
