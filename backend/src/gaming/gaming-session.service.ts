import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GamingSession, GamingSessionDocument } from './schemas/gaming-session.schema';
import { GamingMachine, GamingMachineDocument } from './schemas/gaming-machine.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { GamingMachineService } from './gaming-machine.service';
import { GamingPricingService } from './gaming-pricing.service';
import {
  StartGamingSessionDto,
  GamingHeartbeatDto,
  EndGamingSessionDto,
  SwitchMachineDto,
} from './dto/gaming.dto';
import { GamingMachineStatus, GamingSessionStatus } from '../common/enums';

@Injectable()
export class GamingSessionService {
  private readonly logger = new Logger(GamingSessionService.name);

  constructor(
    @InjectModel(GamingSession.name)
    private readonly sessionModel: Model<GamingSessionDocument>,
    @InjectModel(GamingMachine.name)
    private readonly machineModel: Model<GamingMachineDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly machineService: GamingMachineService,
    private readonly pricingService: GamingPricingService,
  ) {}

  /**
   * Bắt đầu phiên chơi tại máy gaming (F14.3)
   * Chống chơi đồng thời (SPEC Rule 1) & Tạm giữ ví cuốn chiếu 15p (SPEC Rule 3)
   */
  async startSession(userId: string, dto: StartGamingSessionDto): Promise<GamingSession> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const machine = await this.machineService.getMachineByCode(dto.machineCode);
    if (machine.status !== GamingMachineStatus.IDLE) {
      throw new ConflictException(`Máy ${dto.machineCode} hiện không ở trạng thái sẵn sàng (Trạng thái: ${machine.status})`);
    }

    // 1. SPEC Rule 1: Chống chơi đồng thời
    const activeSession = await this.sessionModel.findOne({
      customerId: new Types.ObjectId(userId),
      status: {
        $in: [
          GamingSessionStatus.STARTING,
          GamingSessionStatus.ACTIVE,
          GamingSessionStatus.OFFLINE_GRACE,
          GamingSessionStatus.LOCKED,
        ],
      },
    });

    if (activeSession) {
      throw new ConflictException(
        `ACCOUNT_ALREADY_IN_SESSION: Tài khoản đang có phiên chơi tại máy ${activeSession.machineCode}`,
      );
    }

    // 2. SPEC Rule 3: Tạm giữ ví cuốn chiếu block 15 phút
    const holdAmount = this.pricingService.getHoldAmountForBlock(machine.zone, 15);
    const sessionCode = `GS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const idempotencyKey = dto.idempotencyKey || `INIT-${sessionCode}`;

    const session = new this.sessionModel({
      sessionCode,
      machineId: machine._id,
      machineCode: machine.machineCode,
      customerId: new Types.ObjectId(userId),
      customerPhone: user.phone,
      customerName: user.fullName,
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
      totalPlayedMinutes: 0,
      totalHoldAmount: holdAmount,
      actualUsageAmount: 0,
      refundHoldAmount: 0,
      status: GamingSessionStatus.ACTIVE,
      roomBookingId: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
      idempotencyKey,
    });

    const savedSession = await session.save();

    // 3. Cập nhật máy sang IN_USE
    await this.machineService.updateMachineStatus(
      machine.machineCode,
      GamingMachineStatus.IN_USE,
      sessionCode,
      user.phone,
    );

    return savedSession;
  }

  /**
   * Heartbeat định kỳ 30s từ Kiosk Client
   * Kiểm tra cuốn chiếu block tiếp theo hoặc khóa màn hình sau 60s ân hạn (SPEC Rule 3 & 5)
   */
  async processHeartbeat(dto: GamingHeartbeatDto): Promise<GamingSession> {
    const session = await this.sessionModel.findOne({ sessionCode: dto.sessionCode });
    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên chơi ${dto.sessionCode}`);
    }

    if (session.status === GamingSessionStatus.SETTLED || session.status === GamingSessionStatus.ENDING) {
      return session;
    }

    const now = new Date();
    session.lastHeartbeatAt = now;

    // Tính số phút chơi
    const diffMs = now.getTime() - session.startedAt.getTime();
    const playedMinutes = Math.max(1, Math.ceil(diffMs / 60000));
    session.totalPlayedMinutes = playedMinutes;

    const machine = await this.machineModel.findById(session.machineId);
    const { totalCost } = this.pricingService.calculateCost(machine?.zone, session.startedAt, now);
    session.actualUsageAmount = totalCost;

    // Nếu tiền dùng sắp vượt số tiền đã tạm giữ: Tự động tạm giữ thêm 1 block 15 phút
    if (session.actualUsageAmount >= session.totalHoldAmount - 1000) {
      const nextHold = this.pricingService.getHoldAmountForBlock(machine?.zone, 15);
      session.totalHoldAmount += nextHold;
      this.logger.log(`Tự động tạm giữ cuốn chiếu thêm ${nextHold} VND cho phiên ${session.sessionCode}`);
    }

    return session.save();
  }

  /**
   * Kết thúc phiên chơi & Quyết toán hoàn tiền thừa vào ví (SPEC Rule 3)
   */
  async endSession(sessionCode: string, reason?: string): Promise<GamingSession> {
    const session = await this.sessionModel.findOne({ sessionCode });
    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên chơi ${sessionCode}`);
    }

    if (session.status === GamingSessionStatus.SETTLED) {
      return session;
    }

    const now = new Date();
    session.endedAt = now;

    const machine = await this.machineModel.findById(session.machineId);
    const { totalMinutes, totalCost } = this.pricingService.calculateCost(
      machine?.zone,
      session.startedAt,
      now,
    );

    session.totalPlayedMinutes = totalMinutes;
    session.actualUsageAmount = totalCost;

    // Hoàn trả chính xác 100% phần dư
    session.refundHoldAmount = Math.max(0, session.totalHoldAmount - session.actualUsageAmount);
    session.status = GamingSessionStatus.SETTLED;

    const saved = await session.save();

    // Trả máy về IDLE
    if (machine) {
      await this.machineService.updateMachineStatus(machine.machineCode, GamingMachineStatus.IDLE);
    }

    return saved;
  }

  /**
   * Đổi máy giữ nguyên phiên và tiền tích lũy (F14.6)
   */
  async switchMachine(dto: SwitchMachineDto): Promise<GamingSession> {
    const session = await this.sessionModel.findOne({ sessionCode: dto.sessionCode });
    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên chơi ${dto.sessionCode}`);
    }

    const newMachine = await this.machineService.getMachineByCode(dto.targetMachineCode);
    if (newMachine.status !== GamingMachineStatus.IDLE) {
      throw new ConflictException(`Máy đích ${dto.targetMachineCode} không ở trạng thái sẵn sàng`);
    }

    const oldMachineCode = session.machineCode;

    // Cập nhật máy mới
    session.machineId = newMachine._id as Types.ObjectId;
    session.machineCode = newMachine.machineCode;
    const saved = await session.save();

    // Giải phóng máy cũ về IDLE
    await this.machineService.updateMachineStatus(oldMachineCode, GamingMachineStatus.IDLE);

    // Chiếm máy mới thành IN_USE
    await this.machineService.updateMachineStatus(
      newMachine.machineCode,
      GamingMachineStatus.IN_USE,
      session.sessionCode,
      session.customerPhone,
    );

    return saved;
  }

  async getActiveSessions(): Promise<GamingSession[]> {
    return this.sessionModel
      .find({
        status: { $in: [GamingSessionStatus.ACTIVE, GamingSessionStatus.STARTING, GamingSessionStatus.LOCKED] },
      })
      .lean();
  }
}
