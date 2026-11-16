import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import {
  BridgeAgent,
  BridgeAgentDocument,
  DeviceDiagnosticSubdoc,
} from '../schemas/bridge-agent.schema.js';
import {
  DeviceCommand,
  DeviceCommandDocument,
} from '../schemas/device-command.schema.js';
import {
  CreateBridgeAgentDto,
  RegisterAgentResponse,
  AgentHandshakeDto,
  AgentHandshakeResponse,
  AgentHeartbeatDto,
  AgentHeartbeatResponse,
  BridgeAgentDetailResponse,
} from '@sports/contracts';
import { BridgeAgentStatus, DeviceCommandStatus } from '@sports/shared';

@Injectable()
export class BridgeAgentService {
  constructor(
    @InjectModel(BridgeAgent.name)
    private readonly bridgeAgentModel: Model<BridgeAgentDocument>,
    @InjectModel(DeviceCommand.name)
    private readonly deviceCommandModel: Model<DeviceCommandDocument>,
  ) {}

  /**
   * Đăng ký một Bridge Agent mới tại quầy hoặc cửa xoay (Admin only)
   */
  async registerAgent(dto: CreateBridgeAgentDto): Promise<RegisterAgentResponse> {
    const existing = await this.bridgeAgentModel.findOne({ agentCode: dto.agentCode }).exec();
    if (existing) {
      throw new ConflictException(`Agent với mã ${dto.agentCode} đã tồn tại`);
    }

    // Sinh khóa bí mật ngẫu nhiên 32 bytes an toàn
    const secretKey = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashString(secretKey);

    const agent = new this.bridgeAgentModel({
      agentCode: dto.agentCode,
      name: dto.name,
      location: dto.location,
      tokenHash,
      status: BridgeAgentStatus.OFFLINE,
      supportedDevices: dto.supportedDevices,
      config: dto.config ? new Map(Object.entries(dto.config)) : new Map(),
      deviceStatuses: new Map(),
    });

    const saved = await agent.save();

    return {
      agent: this.mapToDetail(saved),
      secretKey, // Chỉ trả về 1 lần duy nhất để kỹ thuật viên cấu hình vào thiết bị
    };
  }

  /**
   * Bắt tay xác thực (Handshake) khởi động phiên làm việc từ Agent lên Cloud
   */
  async handshake(dto: AgentHandshakeDto): Promise<AgentHandshakeResponse> {
    const agent = await this.bridgeAgentModel.findOne({ agentCode: dto.agentCode }).exec();
    if (!agent) {
      throw new UnauthorizedException('AGENT_NOT_FOUND');
    }

    if (agent.status === BridgeAgentStatus.REVOKED) {
      throw new UnauthorizedException('AGENT_REVOKED');
    }

    // Kiểm tra tính hợp lệ của Secret Key
    const providedHash = this.hashString(dto.secretKey);
    if (agent.tokenHash !== providedHash) {
      throw new UnauthorizedException('INVALID_AGENT_SECRET');
    }

    // Sinh Session Token có thời hạn 24 giờ
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = this.hashString(sessionToken);
    const expiresInSeconds = 86400; // 24h
    const sessionExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    agent.sessionTokenHash = sessionTokenHash;
    agent.sessionExpiresAt = sessionExpiresAt;
    agent.status = BridgeAgentStatus.ONLINE;
    agent.ipAddress = dto.ipAddress;
    agent.version = dto.version;
    agent.lastHeartbeatAt = new Date();

    await agent.save();

    const configObj = agent.config instanceof Map ? Object.fromEntries(agent.config) : agent.config;

    return {
      agentId: agent._id.toString(),
      agentCode: agent.agentCode,
      sessionToken,
      expiresInSeconds,
      serverTime: new Date(),
      config: configObj || {},
    };
  }

  /**
   * Xác thực Session Token trong các request định kỳ của Agent
   */
  async validateSessionToken(agentCode: string, token: string): Promise<BridgeAgentDocument> {
    const agent = await this.bridgeAgentModel.findOne({ agentCode }).exec();
    if (!agent) {
      throw new UnauthorizedException('AGENT_NOT_FOUND');
    }

    if (agent.status === BridgeAgentStatus.REVOKED) {
      throw new UnauthorizedException('AGENT_REVOKED');
    }

    if (!agent.sessionTokenHash || !agent.sessionExpiresAt) {
      throw new UnauthorizedException('NO_ACTIVE_SESSION');
    }

    if (new Date() > agent.sessionExpiresAt) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }

    const tokenHash = this.hashString(token);
    if (agent.sessionTokenHash !== tokenHash) {
      throw new UnauthorizedException('INVALID_SESSION_TOKEN');
    }

    return agent;
  }

  /**
   * Nhịp tim (Heartbeat) định kỳ gửi từ Agent (mỗi 30s)
   */
  async heartbeat(agent: BridgeAgentDocument, dto: AgentHeartbeatDto): Promise<AgentHeartbeatResponse> {
    agent.lastHeartbeatAt = new Date();
    agent.status = BridgeAgentStatus.ONLINE;
    if (dto.version) {
      agent.version = dto.version;
    }

    // Cập nhật trạng thái sức khỏe từng thiết bị ngoại vi
    if (dto.deviceStatuses) {
      if (!agent.deviceStatuses) {
        agent.deviceStatuses = new Map();
      }
      for (const [devType, diag] of Object.entries(dto.deviceStatuses)) {
        const subdoc: DeviceDiagnosticSubdoc = {
          status: diag.status,
          details: diag.details,
          updatedAt: new Date(),
        };
        agent.deviceStatuses.set(devType, subdoc);
      }
    }

    await agent.save();

    // Kiểm tra xem có lệnh nào đang đợi gửi xuống agent không
    const pendingCount = await this.deviceCommandModel.countDocuments({
      agentId: agent._id,
      status: DeviceCommandStatus.PENDING,
    }).exec();

    return {
      acknowledged: true,
      hasPendingCommands: pendingCount > 0,
      serverTime: new Date(),
    };
  }

  /**
   * Thu hồi token của Agent (khi mất máy, nghi ngờ lộ mã khóa)
   */
  async revokeAgent(agentId: string): Promise<BridgeAgentDetailResponse> {
    const agent = await this.bridgeAgentModel.findById(agentId).exec();
    if (!agent) {
      throw new NotFoundException(`Không tìm thấy agent với id ${agentId}`);
    }

    agent.status = BridgeAgentStatus.REVOKED;
    agent.sessionTokenHash = undefined;
    agent.sessionExpiresAt = undefined;
    const saved = await agent.save();

    return this.mapToDetail(saved);
  }

  /**
   * Lấy danh sách tất cả Agent
   */
  async getAllAgents(): Promise<BridgeAgentDetailResponse[]> {
    const agents = await this.bridgeAgentModel.find().sort({ createdAt: -1 }).exec();
    return agents.map((a) => this.mapToDetail(a));
  }

  /**
   * Lấy chi tiết 1 Agent
   */
  async getAgentById(id: string): Promise<BridgeAgentDetailResponse> {
    const agent = await this.bridgeAgentModel.findById(id).exec();
    if (!agent) {
      throw new NotFoundException(`Không tìm thấy agent với id ${id}`);
    }
    return this.mapToDetail(agent);
  }

  private hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  private mapToDetail(agent: BridgeAgentDocument): BridgeAgentDetailResponse {
    const devStatuses = agent.deviceStatuses instanceof Map
      ? Object.fromEntries(agent.deviceStatuses)
      : agent.deviceStatuses || {};

    const configObj = agent.config instanceof Map
      ? Object.fromEntries(agent.config)
      : agent.config || {};

    return {
      id: agent._id.toString(),
      agentCode: agent.agentCode,
      name: agent.name,
      location: agent.location,
      status: agent.status,
      ipAddress: agent.ipAddress,
      version: agent.version,
      supportedDevices: agent.supportedDevices,
      deviceStatuses: devStatuses,
      config: configObj,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      createdAt: (agent as any).createdAt || new Date(),
      updatedAt: (agent as any).updatedAt,
    };
  }
}
