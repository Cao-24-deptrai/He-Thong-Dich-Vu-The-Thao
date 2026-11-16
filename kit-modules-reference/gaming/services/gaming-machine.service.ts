import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { GamingMachine, GamingMachineDocument } from '../schemas/gaming-machine.schema.js';
import { GamingSession, GamingSessionDocument } from '../schemas/gaming-session.schema.js';
import {
  CreateGamingMachineDto,
  UpdateGamingMachineDto,
  GamingMachineListQueryDto,
  RegisterMachineDto,
  GamingFloorMapResponse,
  GamingFloorMapMachine,
} from '@sports/contracts';
import { GamingMachineStatus } from '@sports/shared';

@Injectable()
export class GamingMachineService {
  private readonly logger = new Logger(GamingMachineService.name);

  constructor(
    @InjectModel(GamingMachine.name)
    private readonly machineModel: Model<GamingMachineDocument>,
    @InjectModel(GamingSession.name)
    private readonly sessionModel: Model<GamingSessionDocument>,
  ) {}

  async createMachine(dto: CreateGamingMachineDto): Promise<GamingMachineDocument> {
    const code = dto.machineCode.trim().toUpperCase();
    const existing = await this.machineModel.findOne({ machineCode: code });
    if (existing) {
      throw new ConflictException({
        code: 'MACHINE_CODE_EXISTS',
        message: `Mã máy "${code}" đã tồn tại trên hệ thống`,
      });
    }

    const machine = new this.machineModel({
      machineCode: code,
      zone: dto.zone,
      specs: dto.specs,
      position: dto.position,
      hourlyPrice: dto.hourlyPrice,
      status: GamingMachineStatus.IDLE,
      isActive: dto.isActive ?? true,
    });

    return machine.save();
  }

  async updateMachine(id: string, dto: UpdateGamingMachineDto): Promise<GamingMachineDocument> {
    const machine = await this.findById(id);

    if (dto.machineCode && dto.machineCode.toUpperCase() !== machine.machineCode) {
      const code = dto.machineCode.trim().toUpperCase();
      const existing = await this.machineModel.findOne({ machineCode: code });
      if (existing) {
        throw new ConflictException({
          code: 'MACHINE_CODE_EXISTS',
          message: `Mã máy "${code}" đã tồn tại trên hệ thống`,
        });
      }
      machine.machineCode = code;
    }

    if (dto.zone) machine.zone = dto.zone;
    if (dto.specs) machine.specs = { ...machine.specs, ...dto.specs };
    if (dto.position) machine.position = { ...machine.position, ...dto.position };
    if (dto.hourlyPrice !== undefined) machine.hourlyPrice = dto.hourlyPrice;
    if (dto.status) machine.status = dto.status;
    if (dto.isActive !== undefined) machine.isActive = dto.isActive;

    return machine.save();
  }

  async findById(id: string): Promise<GamingMachineDocument> {
    const machine = await this.machineModel.findById(id);
    if (!machine) {
      throw new NotFoundException({
        code: 'MACHINE_NOT_FOUND',
        message: 'Không tìm thấy máy tính gaming',
      });
    }
    return machine;
  }

  async findByCode(code: string): Promise<GamingMachineDocument | null> {
    return this.machineModel.findOne({ machineCode: code.trim().toUpperCase() });
  }

  async findAll(query: GamingMachineListQueryDto): Promise<{ items: GamingMachineDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.zone) filter.zone = query.zone;
    if (query.status) filter.status = query.status;
    if (query.floor) filter['position.floor'] = query.floor;
    if (query.roomName) filter['position.roomName'] = query.roomName;

    if (query.search) {
      filter.machineCode = { $regex: query.search.trim(), $options: 'i' };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.machineModel.find(filter).sort({ machineCode: 1 }).skip(skip).limit(limit).exec(),
      this.machineModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * Sinh mã OTP 6 số để đăng ký thiết bị máy trạm lần đầu
   */
  async generateRegistrationCode(machineCode: string): Promise<string> {
    const machine = await this.findByCode(machineCode);
    if (!machine) {
      throw new NotFoundException({
        code: 'MACHINE_NOT_FOUND',
        message: `Không tìm thấy máy ${machineCode}`,
      });
    }

    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    machine.oneTimeCode = oneTimeCode;
    await machine.save();

    this.logger.log(`Generated registration OTP for ${machineCode}: ${oneTimeCode}`);
    return oneTimeCode;
  }

  /**
   * F14.1 Đăng ký thiết bị bằng mã dùng 1 lần (Device Registration)
   */
  async registerMachine(dto: RegisterMachineDto): Promise<{ machine: GamingMachineDocument; token: string }> {
    const machine = await this.findByCode(dto.machineCode);
    if (!machine) {
      throw new NotFoundException({
        code: 'MACHINE_NOT_FOUND',
        message: `Không tìm thấy máy ${dto.machineCode}`,
      });
    }

    if (!machine.oneTimeCode || machine.oneTimeCode !== dto.oneTimeCode.trim()) {
      throw new BadRequestException({
        code: 'INVALID_REGISTRATION_CODE',
        message: 'Mã đăng ký thiết bị không hợp lệ hoặc chưa được khởi tạo',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    machine.registrationToken = token;
    machine.oneTimeCode = undefined;
    if (dto.ipAddress) machine.ipAddress = dto.ipAddress;
    if (dto.macAddress) machine.macAddress = dto.macAddress;
    machine.status = GamingMachineStatus.IDLE;
    machine.lastHeartbeatAt = new Date();

    const saved = await machine.save();
    this.logger.log(`Machine ${dto.machineCode} registered successfully`);

    return { machine: saved, token };
  }

  /**
   * Ghi nhận heartbeat từ client
   */
  async recordHeartbeat(machineCode: string): Promise<void> {
    await this.machineModel.updateOne(
      { machineCode: machineCode.toUpperCase() },
      {
        $set: {
          lastHeartbeatAt: new Date(),
        },
      },
    );
  }

  /**
   * F14.5 Sơ đồ phòng máy thời gian thực
   */
  async getFloorMap(floor: number = 1): Promise<GamingFloorMapResponse> {
    const machines = await this.machineModel
      .find({ 'position.floor': floor, isActive: true })
      .sort({ machineCode: 1 })
      .exec();

    // Lấy thông tin các phiên đang hoạt động nếu có
    const activeSessionIds = machines
      .map((m) => m.currentSessionId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const activeSessions = await this.sessionModel
      .find({ _id: { $in: activeSessionIds } })
      .exec();

    const sessionMap = new Map<string, GamingSessionDocument>();
    for (const session of activeSessions) {
      sessionMap.set(session._id.toString(), session);
    }

    const mapMachines: GamingFloorMapMachine[] = machines.map((machine) => {
      let currentSessionData: GamingFloorMapMachine['currentSession'];

      if (machine.currentSessionId) {
        const session = sessionMap.get(machine.currentSessionId.toString());
        if (session) {
          const now = Date.now();
          const playedMinutes = Math.max(1, Math.ceil((now - session.startedAt.getTime()) / 60000));
          currentSessionData = {
            sessionId: session._id.toString(),
            sessionCode: session.sessionCode,
            customerPhone: session.customerPhone,
            customerName: session.customerName,
            playedMinutes,
            estimatedCost: session.actualUsageAmount,
            remainingHoldMinutes: session.warningMinutesRemaining,
          };
        }
      }

      return {
        id: machine._id.toString(),
        machineCode: machine.machineCode,
        zone: machine.zone,
        status: machine.status,
        position: machine.position,
        currentSession: currentSessionData,
      };
    });

    const activeCount = mapMachines.filter((m) => m.status === GamingMachineStatus.IN_USE).length;

    return {
      floor,
      machines: mapMachines,
      totalMachines: mapMachines.length,
      activeSessions: activeCount,
    };
  }
}
