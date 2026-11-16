import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GamingSession, GamingSessionDocument } from '../schemas/gaming-session.schema.js';
import { GamingMachine, GamingMachineDocument } from '../schemas/gaming-machine.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { GamingMachineService } from './gaming-machine.service.js';
import { GamingPricingService } from './gaming-pricing.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  StartGamingSessionDto,
  GamingHeartbeatDto,
  EndGamingSessionDto,
  SwitchMachineDto,
  RemoteControlDto,
  GamingUsageReport,
} from '@sports/contracts';
import {
  GamingMachineStatus,
  GamingSessionStatus,
  GamingRemoteAction,
  WalletCategory,
} from '@sports/shared';

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
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly settingsService?: SettingsService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  private generateSessionCode(): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GMS-${todayStr}-${randomHex}`;
  }

  /**
   * F14.3 Bắt đầu phiên chơi gaming:
   * - Bất biến SPEC Rule 1: Chống chơi đồng thời (1 tài khoản chỉ có 1 phiên active trên toàn hệ thống).
   * - Khóa máy nguyên tử: Chuyển máy sang IN_USE.
   * - Tạm giữ tiền đợt đầu (Block-based hold 15 phút) từ Ví nội bộ (WalletCategory.GAME_TIME).
   */
  async startSession(actorId: string, dto: StartGamingSessionDto): Promise<GamingSessionDocument> {
    // 1. Kiểm tra Idempotency Replay
    const existing = await this.sessionModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent gaming session replay: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Tìm tài khoản khách hàng
    const customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Không tìm thấy tài khoản với số điện thoại ${dto.customerPhone}`,
      });
    }

    // 3. Bất biến SPEC Rule 1: Chống chơi đồng thời (Anti-concurrency session defense)
    const activeSession = await this.sessionModel.findOne({
      customerId: customer._id,
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
      throw new BadRequestException({
        code: 'ACCOUNT_ALREADY_IN_SESSION',
        message: `Tài khoản đang có phiên chơi tại máy ${activeSession.machineCode}. Không thể đăng nhập đồng thời`,
      });
    }

    // 4. Khóa máy nguyên tử (Atomic Machine Reservation)
    const machine = await this.machineModel.findOneAndUpdate(
      {
        machineCode: dto.machineCode.trim().toUpperCase(),
        status: GamingMachineStatus.IDLE,
        isActive: true,
      },
      {
        $set: { status: GamingMachineStatus.IN_USE },
      },
      { new: true },
    );

    if (!machine) {
      throw new BadRequestException({
        code: 'MACHINE_NOT_AVAILABLE',
        message: `Máy ${dto.machineCode} hiện không khả dụng (đang có người chơi, bảo trì hoặc không tồn tại)`,
      });
    }

    const dummySessionId = new Types.ObjectId();
    let initialHoldAmount = 0;

    // 5. Tạm giữ tiền ví nội bộ (SPEC Rule 3 - Block Hold) nếu không phải phòng trọn gói Game Room
    if (!dto.roomBookingId) {
      const holdMinutes = this.settingsService?.get<number>('gaming.holdBatchMinutes', 15) ?? 15;
      initialHoldAmount = await this.pricingService.calculateHoldAmountForMinutes(
        machine.zone,
        holdMinutes,
        new Date(),
        machine.hourlyPrice,
      );

      if (this.walletService) {
        try {
          await this.walletService.hold(
            customer._id.toString(),
            {
              amount: initialHoldAmount,
              refType: 'GAMING_SESSION',
              refId: dummySessionId.toString(),
              idempotencyKey: `HOLD_${dto.idempotencyKey}`,
              note: `Tạm giữ ${holdMinutes} phút đầu phiên gaming máy ${machine.machineCode}`,
            },
            actorId,
          );
        } catch (walletErr: unknown) {
          // Hoàn trả trạng thái máy về IDLE nếu trừ tiền ví thất bại
          await this.machineModel.updateOne(
            { _id: machine._id },
            { $set: { status: GamingMachineStatus.IDLE } },
          );
          throw walletErr;
        }
      }
    }

    // 6. Khởi tạo phiên chơi GamingSession
    const sessionCode = this.generateSessionCode();
    const session = new this.sessionModel({
      _id: dummySessionId,
      sessionCode,
      machineId: machine._id,
      machineCode: machine.machineCode,
      customerId: customer._id,
      customerPhone: customer.phone,
      customerName: customer.fullName,
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
      totalPlayedMinutes: 0,
      totalHoldAmount: initialHoldAmount,
      actualUsageAmount: 0,
      refundHoldAmount: 0,
      status: GamingSessionStatus.ACTIVE,
      roomBookingId: dto.roomBookingId ? new Types.ObjectId(dto.roomBookingId) : undefined,
      idempotencyKey: dto.idempotencyKey,
    });

    let savedSession: GamingSessionDocument;
    try {
      savedSession = await session.save();
    } catch (saveErr: any) {
      await this.machineModel.updateOne(
        { _id: machine._id },
        { $set: { status: GamingMachineStatus.IDLE } },
      );

      if (this.walletService && initialHoldAmount > 0) {
        try {
          await this.walletService.release(
            customer._id.toString(),
            {
              amount: initialHoldAmount,
              refId: dummySessionId.toString(),
              idempotencyKey: `REL_${dto.idempotencyKey}`,
              note: 'Giải tỏa tiền tạm giữ do trùng lặp phiên',
            },
            actorId,
          );
        } catch {
          // Ignore release error
        }
      }

      if (saveErr?.code === 11000 || saveErr?.message?.includes('E11000')) {
        throw new BadRequestException({
          code: 'ACCOUNT_ALREADY_IN_SESSION',
          message: `Tài khoản đang có phiên chơi tại máy khác. Không thể đăng nhập đồng thời`,
        });
      }
      throw saveErr;
    }

    // Gắn phiên đang chơi vào máy trạm
    await this.machineModel.updateOne(
      { _id: machine._id },
      { $set: { currentSessionId: savedSession._id } },
    );

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'START_GAMING_SESSION',
        targetType: 'gaming_session',
        targetId: savedSession._id.toString(),
        after: {
          sessionCode: savedSession.sessionCode,
          machineCode: savedSession.machineCode,
          customerId: customer._id.toString(),
          initialHoldAmount,
        },
      });
    }

    return savedSession;
  }

  /**
   * F14.4 & F14.9 Xử lý Heartbeat, gia hạn block tạm giữ và cảnh báo hết tiền
   */
  async processHeartbeat(dto: GamingHeartbeatDto): Promise<GamingSessionDocument> {
    const session = await this.sessionModel.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy phiên chơi gaming',
      });
    }

    if (
      session.status === GamingSessionStatus.SETTLED ||
      session.status === GamingSessionStatus.ENDING
    ) {
      return session;
    }

    const machine = await this.machineService.findById(session.machineId.toString());
    const now = new Date();

    // Cập nhật số phút đã chơi thực tế
    const elapsedMinutes = Math.max(1, Math.ceil((now.getTime() - session.startedAt.getTime()) / 60000));
    session.totalPlayedMinutes = elapsedMinutes;
    session.lastHeartbeatAt = now;

    // Nếu chơi phòng riêng trọn gói -> không cần tính ví lẻ
    if (session.roomBookingId) {
      await this.machineService.recordHeartbeat(session.machineCode);
      return session.save();
    }

    // Tính toán chi phí thực tế phát sinh tới thời điểm hiện tại
    const costCalculation = await this.pricingService.calculateSessionCost(
      machine.zone,
      session.startedAt,
      now,
      machine.hourlyPrice,
    );
    session.actualUsageAmount = costCalculation.totalCost;

    // Tính số tiền và số phút còn lại trong hạn mức tạm giữ
    const remainingHoldBalance = session.totalHoldAmount - costCalculation.totalCost;
    const minuteRate = Math.max(1, Math.round((machine.hourlyPrice || 15000) / 60));
    const approxMinutesRemaining = Math.floor(remainingHoldBalance / minuteRate);

    // Nếu còn dưới hoặc bằng 5 phút -> Kích hoạt tạm giữ đợt tiếp theo từ ví (15 phút)
    if (approxMinutesRemaining <= 5 && session.status === GamingSessionStatus.ACTIVE) {
      const nextBatchMinutes = this.settingsService?.get<number>('gaming.holdBatchMinutes', 15) ?? 15;
      const nextBatchAmount = await this.pricingService.calculateHoldAmountForMinutes(
        machine.zone,
        nextBatchMinutes,
        now,
        machine.hourlyPrice,
      );

      if (this.walletService) {
        const nextBatchKey = `HOLD_NEXT_${session._id}_${session.totalHoldAmount}_${session.totalPlayedMinutes}`;
        try {
          await this.walletService.hold(
            session.customerId.toString(),
            {
              amount: nextBatchAmount,
              refType: 'GAMING_SESSION',
              refId: session._id.toString(),
              idempotencyKey: nextBatchKey,
              note: `Gia hạn tạm giữ đợt ${nextBatchMinutes} phút phiên gaming máy ${session.machineCode}`,
            },
          );
          session.totalHoldAmount += nextBatchAmount;
          session.warningMinutesRemaining = undefined;
          this.logger.log(`Extended hold for session ${session.sessionCode}: +${nextBatchAmount} VND`);
        } catch {
          // Ví không đủ tiền nạp thêm đợt mới -> Bật cảnh báo (còn 10, 5, 1 phút)
          session.warningMinutesRemaining = Math.max(0, approxMinutesRemaining);

          if (approxMinutesRemaining <= 0) {
            // Hết hạn mức tạm giữ -> Khóa máy (có thời gian ân hạn)
            session.status = GamingSessionStatus.LOCKED;
            session.isLocked = true;
            this.logger.warn(`Session ${session.sessionCode} locked due to insufficient funds`);
          }
        }
      }
    }

    await this.machineService.recordHeartbeat(session.machineCode);
    return session.save();
  }

  /**
   * F14.3 Kết thúc phiên chơi & Quyết toán số dư ví:
   * - Tính tổng tiền thực tế theo số phút đã chơi
   * - Hoàn trả 100% phần tiền tạm giữ thừa về ví của khách (SPEC Rule 3)
   * - Trả máy về IDLE
   */
  async endSession(actorId: string, dto: EndGamingSessionDto): Promise<GamingSessionDocument> {
    const session = await this.sessionModel.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy phiên chơi gaming',
      });
    }

    if (session.status === GamingSessionStatus.SETTLED) {
      return session;
    }

    const machine = await this.machineService.findById(session.machineId.toString());
    const now = new Date();

    const elapsedMinutes = Math.max(1, Math.ceil((now.getTime() - session.startedAt.getTime()) / 60000));
    session.totalPlayedMinutes = elapsedMinutes;
    session.endedAt = now;

    let finalCost = 0;
    let refundHoldAmount = 0;

    if (!session.roomBookingId) {
      const costCalculation = await this.pricingService.calculateSessionCost(
        machine.zone,
        session.startedAt,
        now,
        machine.hourlyPrice,
      );

      // Chi phí thực tế tối đa không được vượt quá số tiền đã tạm giữ
      finalCost = Math.min(costCalculation.totalCost, session.totalHoldAmount);
      refundHoldAmount = Math.max(0, session.totalHoldAmount - finalCost);

      // Quyết toán ví qua WalletService.settle
      if (this.walletService && session.totalHoldAmount > 0) {
        await this.walletService.settle(
          session.customerId.toString(),
          {
            amount: finalCost,
            heldToRelease: session.totalHoldAmount,
            category: WalletCategory.GAME_TIME,
            refId: session._id.toString(),
            idempotencyKey: `SETTLE_${session.idempotencyKey}`,
            note: `Quyết toán phiên gaming máy ${session.machineCode} (${elapsedMinutes} phút, dùng ${finalCost.toLocaleString('vi-VN')} đ, hoàn ${refundHoldAmount.toLocaleString('vi-VN')} đ)`,
          },
          actorId,
        );
      }
    }

    session.actualUsageAmount = finalCost;
    session.refundHoldAmount = refundHoldAmount;
    session.status = GamingSessionStatus.SETTLED;
    session.isLocked = false;
    session.warningMinutesRemaining = undefined;

    const saved = await session.save();

    // Giải phóng máy trạm về trạng thái IDLE
    await this.machineModel.updateOne(
      { _id: session.machineId },
      {
        $set: {
          status: GamingMachineStatus.IDLE,
          currentSessionId: null,
        },
      },
    );

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'END_GAMING_SESSION',
        targetType: 'gaming_session',
        targetId: session._id.toString(),
        after: {
          sessionCode: session.sessionCode,
          totalPlayedMinutes: elapsedMinutes,
          finalCost,
          refundHoldAmount,
        },
      });
    }

    this.logger.log(`Settled gaming session ${session.sessionCode}: cost=${finalCost}, refund=${refundHoldAmount}`);
    return saved;
  }

  /**
   * F14.6 Chuyển máy giữ nguyên phiên và chi phí tích lũy
   */
  async switchMachine(actorId: string, dto: SwitchMachineDto): Promise<GamingSessionDocument> {
    const session = await this.sessionModel.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy phiên chơi gaming',
      });
    }

    if (
      session.status === GamingSessionStatus.SETTLED ||
      session.status === GamingSessionStatus.ENDING
    ) {
      throw new BadRequestException('Phiên chơi đã kết thúc, không thể chuyển máy');
    }

    const targetCode = dto.targetMachineCode.trim().toUpperCase();
    if (session.machineCode === targetCode) {
      return session;
    }

    // Khóa máy mới nguyên tử
    const targetMachine = await this.machineModel.findOneAndUpdate(
      {
        machineCode: targetCode,
        status: GamingMachineStatus.IDLE,
        isActive: true,
      },
      {
        $set: {
          status: GamingMachineStatus.IN_USE,
          currentSessionId: session._id,
        },
      },
      { new: true },
    );

    if (!targetMachine) {
      throw new BadRequestException({
        code: 'TARGET_MACHINE_BUSY',
        message: `Máy đích "${targetCode}" hiện không khả dụng để chuyển`,
      });
    }

    // Trả máy cũ về IDLE
    await this.machineModel.updateOne(
      { _id: session.machineId },
      {
        $set: {
          status: GamingMachineStatus.IDLE,
          currentSessionId: null,
        },
      },
    );

    const oldCode = session.machineCode;
    session.machineId = targetMachine._id;
    session.machineCode = targetMachine.machineCode;

    const saved = await session.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'SWITCH_GAMING_MACHINE',
        targetType: 'gaming_session',
        targetId: session._id.toString(),
        after: {
          sessionCode: session.sessionCode,
          fromMachine: oldCode,
          toMachine: targetMachine.machineCode,
        },
      });
    }

    this.logger.log(`Switched session ${session.sessionCode} from ${oldCode} to ${targetMachine.machineCode}`);
    return saved;
  }

  /**
   * F14.6 Điều khiển từ xa máy trạm
   */
  async executeRemoteControl(actorId: string, dto: RemoteControlDto): Promise<{ success: boolean; message: string }> {
    const machine = await this.machineService.findByCode(dto.machineCode);
    if (!machine) {
      throw new NotFoundException({
        code: 'MACHINE_NOT_FOUND',
        message: `Không tìm thấy máy ${dto.machineCode}`,
      });
    }

    switch (dto.action) {
      case GamingRemoteAction.LOCK:
        machine.status = GamingMachineStatus.LOCKED;
        await machine.save();
        break;

      case GamingRemoteAction.UNLOCK:
        machine.status = machine.currentSessionId ? GamingMachineStatus.IN_USE : GamingMachineStatus.IDLE;
        await machine.save();
        break;

      case GamingRemoteAction.END_SESSION:
        if (machine.currentSessionId) {
          await this.endSession(actorId, {
            sessionId: machine.currentSessionId.toString(),
            idempotencyKey: `REMOTE_END_${machine.currentSessionId}_${Date.now()}`,
            reason: 'Kết thúc bởi quản lý qua điều khiển từ xa',
          });
        }
        break;

      case GamingRemoteAction.SWITCH_MACHINE:
        if (machine.currentSessionId && dto.targetMachineCode) {
          await this.switchMachine(actorId, {
            sessionId: machine.currentSessionId.toString(),
            targetMachineCode: dto.targetMachineCode,
            idempotencyKey: `REMOTE_SWITCH_${machine.currentSessionId}_${Date.now()}`,
          });
        }
        break;

      default:
        this.logger.log(`Simulated hardware command ${dto.action} to ${dto.machineCode}`);
        break;
    }

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: `REMOTE_${dto.action}`,
        targetType: 'gaming_machine',
        targetId: machine._id.toString(),
        after: { action: dto.action, message: dto.message, note: dto.note },
      });
    }

    return {
      success: true,
      message: `Đã thực hiện lệnh ${dto.action} tới máy ${dto.machineCode}`,
    };
  }

  /**
   * F14.10 Báo cáo gaming
   */
  async getUsageReport(fromDate?: Date, toDate?: Date): Promise<GamingUsageReport> {
    const filter: Record<string, unknown> = {};
    if (fromDate || toDate) {
      const startedAt: Record<string, Date> = {};
      if (fromDate) startedAt.$gte = fromDate;
      if (toDate) startedAt.$lte = toDate;
      filter.startedAt = startedAt;
    }

    const sessions = await this.sessionModel.find(filter).exec();
    const totalSessions = sessions.length;

    let totalPlayedMinutes = 0;
    let totalRevenue = 0;
    let totalHoldAmount = 0;
    let totalRefundAmount = 0;

    for (const session of sessions) {
      totalPlayedMinutes += session.totalPlayedMinutes || 0;
      totalRevenue += session.actualUsageAmount || 0;
      totalHoldAmount += session.totalHoldAmount || 0;
      totalRefundAmount += session.refundHoldAmount || 0;
    }

    const totalMachines = await this.machineModel.countDocuments({ isActive: true }).exec();
    const totalPlayedHours = Math.round((totalPlayedMinutes / 60) * 10) / 10;
    const averageSessionMinutes = totalSessions > 0 ? Math.round(totalPlayedMinutes / totalSessions) : 0;

    // Tỷ lệ lấp đầy ước tính (theo tổng giờ chơi so với công suất máy 24h)
    const theoreticalMaxHours = (totalMachines || 1) * 24;
    const occupancyRatePercent =
      Math.min(100, Math.round((totalPlayedHours / theoreticalMaxHours) * 100 * 10) / 10) || 0;

    return {
      totalSessions,
      totalPlayedHours,
      totalRevenue,
      totalHoldAmount,
      totalRefundAmount,
      averageSessionMinutes,
      occupancyRatePercent,
    };
  }
}
