import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { BridgeAgent, BridgeAgentDocument } from './schemas/bridge-agent.schema';
import { CreateBridgeAgentDto, AgentHandshakeDto, AgentHeartbeatDto } from './dto/bridge.dto';
import { BridgeAgentStatus, DeviceType } from '../common/enums';

@Injectable()
export class BridgeAgentService {
  private readonly logger = new Logger(BridgeAgentService.name);

  constructor(
    @InjectModel(BridgeAgent.name)
    private readonly agentModel: Model<BridgeAgentDocument>,
  ) {}

  private hashSecret(secret?: string): string {
    if (!secret) return '';
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  async createAgent(dto: CreateBridgeAgentDto): Promise<BridgeAgent> {
    const code = (dto.agentId || dto.agentCode || '').toUpperCase();
    const existing = await this.agentModel.findOne({
      $or: [{ agentId: code }, { agentCode: code }],
    });
    if (existing) {
      Object.assign(existing, dto);
      if (dto.agentId) existing.agentId = dto.agentId;
      if (code) existing.agentCode = code;
      existing.status = BridgeAgentStatus.ONLINE;
      return existing.save();
    }

    const tokenHash = this.hashSecret(dto.secretKey);
    const agent = new this.agentModel({
      ...dto,
      agentId: dto.agentId || code,
      agentCode: code || `AGENT-${Date.now()}`,
      name: dto.name || dto.agentId || code,
      tokenHash,
      status: BridgeAgentStatus.ONLINE,
    });
    return agent.save();
  }

  async handshake(dto: AgentHandshakeDto): Promise<{ success: boolean; agent: BridgeAgent; token: string }> {
    const agent = await this.agentModel.findOne({ agentCode: dto.agentCode.toUpperCase() });
    if (!agent) {
      throw new NotFoundException(`Không tìm thấy Agent ${dto.agentCode}`);
    }

    const inputHash = this.hashSecret(dto.secretKey);
    if (agent.tokenHash !== inputHash) {
      throw new UnauthorizedException('Secret key không chính xác');
    }

    agent.status = BridgeAgentStatus.ONLINE;
    agent.lastHeartbeatAt = new Date();
    if (dto.softwareVersion) {
      agent.softwareVersion = dto.softwareVersion;
    }
    await agent.save();

    // Session token đơn giản
    const token = crypto.randomBytes(32).toString('hex');
    return { success: true, agent, token };
  }

  async heartbeat(dto: AgentHeartbeatDto): Promise<BridgeAgent> {
    const code = (dto.agentId || dto.agentCode || '').toUpperCase();
    const agent = await this.agentModel.findOne({
      $or: [{ agentId: code }, { agentCode: code }],
    });
    if (!agent) {
      // If agent not yet in DB, create on heartbeat to be tolerant
      const newAgent = new this.agentModel({
        agentId: dto.agentId || code,
        agentCode: code,
        name: dto.agentId || code,
        status: (dto.status as BridgeAgentStatus) || BridgeAgentStatus.ONLINE,
        lastHeartbeatAt: new Date(),
      });
      return newAgent.save();
    }

    agent.status = (dto.status as BridgeAgentStatus) || BridgeAgentStatus.ONLINE;
    agent.lastHeartbeatAt = new Date();
    if (dto.diagnostics) {
      agent.diagnostics = new Map(Object.entries(dto.diagnostics));
    }
    return agent.save();
  }

  async getAgents(): Promise<BridgeAgent[]> {
    //return this.agentModel.find().lean();
    return this.agentModel.find().lean() as unknown as BridgeAgent[];
  }

  async seedDefaultAgents(): Promise<number> {
    const count = await this.agentModel.countDocuments();
    if (count > 0) return count;

    const defaultAgents = [
      {
        agentCode: 'AGENT-POS-01',
        name: 'Bridge Agent Quầy Thu Ngân 1',
        secretKey: 'SecretAgent@123',
        location: 'Quầy lễ tân chính',
        supportedDevices: [DeviceType.ESC_POS_PRINTER, DeviceType.CASH_DRAWER, DeviceType.QR_SCANNER],
        config: { printerPort: 9100, baudRate: 115200 },
      },
      {
        agentCode: 'AGENT-TURNSTILE-GYM',
        name: 'Bridge Agent Cửa Xoay Gym & Hồ Bơi',
        secretKey: 'SecretAgent@123',
        location: 'Cửa kiểm soát vào phòng Gym',
        supportedDevices: [DeviceType.QR_SCANNER, DeviceType.TURNSTILE, DeviceType.RFID_READER],
        config: { turnstilePulseDurationMs: 3000 },
      },
    ];

    for (const a of defaultAgents) {
      await this.createAgent(a);
    }

    return this.agentModel.countDocuments();
  }
}
