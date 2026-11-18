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

    const command = new this.commandModel({
      commandCode,
      agentId: new Types.ObjectId(dto.agentId),
      commandType: dto.commandType,
      payload: dto.payload || {},
      priority: dto.priority || 1,
      status: DeviceCommandStatus.PENDING,
      idempotencyKey,
    });
    return command.save();
  }

  async getPendingCommands(agentId: string): Promise<DeviceCommand[]> {
    return this.commandModel
      .find({
        agentId: new Types.ObjectId(agentId),
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
}
