import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import {
  GymQrCredential,
  GymQrCredentialDocument,
} from './schemas/gym-qr-credential.schema';
import {
  GymAccessLog,
  GymAccessLogDocument,
} from './schemas/gym-access-log.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { GymQrStatus } from './enums/gym-plan-type.enum';
import { ScanGymTurnstileDto, OverrideGymCapacityDto } from './dto/scan-gym-turnstile.dto';

export const MAX_GYM_CAPACITY = 100; // BR-29: Sức chứa tối đa 100 người
export const DEBOUNCE_SECONDS = 300; // BR-30: Khóa chống quét trùng 5 phút cùng một chiều

@Injectable()
export class GymAccessService {
  private readonly logger = new Logger(GymAccessService.name);

  // In-memory fallback counter khi Redis không khả dụng
  private inMemoryInsideCount = 0;

  constructor(
    @InjectModel(GymQrCredential.name)
    private readonly qrCredentialModel: Model<GymQrCredentialDocument>,
    @InjectModel(GymAccessLog.name)
    private readonly accessLogModel: Model<GymAccessLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Lấy số người hiện tại đang ở trong phòng gym thời gian thực (BR-29)
   */
  async getInsideCount(): Promise<number> {
    try {
      const val = await this.redisService.get('gym:inside');
      if (val !== null && val !== undefined) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          this.inMemoryInsideCount = parsed;
          return parsed;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi đọc số đếm Redis gym:inside: ${err.message}, dùng fallback in-memory`);
    }
    return this.inMemoryInsideCount;
  }

  /**
   * Cập nhật số người trong phòng gym vào Redis và in-memory
   */
  private async setInsideCount(count: number): Promise<void> {
    const safeCount = Math.max(0, count);
    this.inMemoryInsideCount = safeCount;
    try {
      await this.redisService.set('gym:inside', safeCount.toString(), 86400);
    } catch (err: any) {
      this.logger.warn(`Lỗi ghi Redis gym:inside: ${err.message}`);
    }
  }

  /**
   * Lấy trạng thái sức chứa phòng gym hiện tại
   */
  async getCapacityStatus(): Promise<{
    insideCount: number;
    maxCapacity: number;
    availableSlots: number;
    isFull: boolean;
    occupancyRate: number;
  }> {
    const insideCount = await this.getInsideCount();
    const availableSlots = Math.max(0, MAX_GYM_CAPACITY - insideCount);
    const isFull = insideCount >= MAX_GYM_CAPACITY;
    const occupancyRate = Math.min(100, Math.round((insideCount / MAX_GYM_CAPACITY) * 100));

    return {
      insideCount,
      maxCapacity: MAX_GYM_CAPACITY,
      availableSlots,
      isFull,
      occupancyRate,
    };
  }

  /**
   * Quét mã QR định danh qua cửa xoay 2 chiều (IN / OUT)
   * Kiểm soát: Mã hợp lệ, Còn hạn (AC-70), Chống quét trùng 5 phút (BR-30), Sức chứa 100 người (BR-29, AC-31, AC-32)
   */
  async scanTurnstile(dto: ScanGymTurnstileDto): Promise<{
    accessGranted: boolean;
    turnstileAction: 'OPEN';
    direction: 'IN' | 'OUT';
    memberName: string;
    insideCount: number;
    maxCapacity: number;
    message: string;
    timestamp: Date;
  }> {
    const qrCode = dto.qrCode.trim();
    const direction = dto.direction;
    const now = new Date();

    // 1. Kiểm tra mã QR định danh trong hệ thống (BR-26, BR-30a)
    const credential = await this.qrCredentialModel.findOne({ qrCode }).exec();
    if (!credential) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'QR_NOT_FOUND',
        message: 'Mã QR Gym không tồn tại hoặc không hợp lệ. Cửa không mở.',
      });
    }

    // 2. Lấy thông tin hội viên
    const user = await this.userModel.findById(credential.userId).exec();
    const memberName = user?.fullName || 'Hội Viên Phanta';

    // 3. Nếu là chiều VÀO (IN): Kiểm tra hiệu lực gói tập (AC-70)
    if (direction === 'IN') {
      if (now > credential.activeUntil || credential.status === GymQrStatus.EXPIRED) {
        if (credential.status !== GymQrStatus.EXPIRED) {
          credential.status = GymQrStatus.EXPIRED;
          await credential.save();
        }
        this.logger.warn(`🚫 Cửa không mở: Mã QR ${qrCode} của ${memberName} đã hết hạn (AC-70)`);
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'PASS_EXPIRED',
          message: 'Gói tập Gym đã hết hạn sử dụng. Cửa không mở (AC-70). Vui lòng gia hạn để tiếp tục.',
        });
      }
    }

    // 4. Kiểm tra khóa chống quét trùng 5 phút cùng một chiều (BR-30, AC-31, AC-32)
    const debounceKey = `gym:debounce:${direction}:${credential.userId.toString()}`;
    const isDebounced = await this.redisService.get(debounceKey);

    if (isDebounced) {
      this.logger.warn(
        `⏳ Từ chối quét trùng: User ${credential.userId} vừa quét chiều ${direction} trong vòng 5 phút (BR-30)`,
      );
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'RECENTLY_SCANNED',
        message: `Mã QR vừa được quét chiều ${direction} trong vòng 5 phút (BR-30). Vui lòng đợi hoặc liên hệ nhân viên.`,
      });
    }

    // 5. Kiểm tra sức chứa tối đa 100 người nếu là chiều VÀO (BR-29, AC-31, AC-32)
    const currentInside = await this.getInsideCount();
    let newCount = currentInside;

    if (direction === 'IN') {
      if (currentInside >= MAX_GYM_CAPACITY) {
        this.logger.warn(`🚫 Phòng gym đã đầy (100/100) -> Từ chối vào cửa với lỗi GYM_CAPACITY_FULL (AC-31)`);
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'GYM_CAPACITY_FULL',
          message: 'Phòng gym đã đạt sức chứa tối đa 100 người (BR-29). Cửa không mở (AC-31, AC-32). Vui lòng đợi khách ra.',
        });
      }

      newCount = currentInside + 1;
      await this.setInsideCount(newCount);
      // Đặt khóa debounce chiều IN trong 300 giây (5 phút)
      await this.redisService.set(debounceKey, '1', DEBOUNCE_SECONDS);
    } else {
      // Chiều RA (OUT): Giảm bộ đếm (không để âm)
      newCount = Math.max(0, currentInside - 1);
      await this.setInsideCount(newCount);
      // Đặt khóa debounce chiều OUT trong 300 giây (5 phút)
      await this.redisService.set(debounceKey, '1', DEBOUNCE_SECONDS);
    }

    // 6. Ghi log lịch sử qua cổng xoay vào MongoDB
    await this.accessLogModel.create({
      userId: credential.userId,
      qrCode,
      memberName,
      direction,
      insideCountAfter: newCount,
      gateId: dto.gateId || 'GYM_TURNSTILE_01',
      isManualOverride: false,
      timestamp: now,
    });

    // 7. Phát sự kiện WebSocket cho phần cứng cửa xoay và Web Admin Dashboard
    const gateId = dto.gateId || 'GYM_TURNSTILE_01';
    try {
      this.eventsGateway.server?.emit('turnstile_open', {
        gateId,
        direction,
        memberName,
        insideCount: newCount,
        maxCapacity: MAX_GYM_CAPACITY,
        timestamp: now.toISOString(),
      });

      this.eventsGateway.server?.emit('gym_capacity_updated', {
        insideCount: newCount,
        maxCapacity: MAX_GYM_CAPACITY,
        occupancyRate: Math.round((newCount / MAX_GYM_CAPACITY) * 100),
      });
    } catch (_) {
      // Bỏ qua nếu socket chưa kết nối
    }

    this.logger.log(
      `🚪 Mở cửa xoay [${direction}]: ${memberName} (${qrCode}) | Số người trong phòng: ${newCount}/${MAX_GYM_CAPACITY}`,
    );

    return {
      accessGranted: true,
      turnstileAction: 'OPEN',
      direction,
      memberName,
      insideCount: newCount,
      maxCapacity: MAX_GYM_CAPACITY,
      message:
        direction === 'IN'
          ? `Chào mừng ${memberName}! Mời quý khách vào phòng tập.`
          : `Tạm biệt ${memberName}! Hẹn gặp lại quý khách.`,
      timestamp: now,
    };
  }

  /**
   * Điều chỉnh số người thủ công (Manual Override) khi có sự cố lệch số đếm hoặc đầu đọc lỗi
   */
  async overrideCapacity(
    dto: OverrideGymCapacityDto,
    staffId?: string,
  ): Promise<{
    success: boolean;
    previousCount: number;
    newCount: number;
    reason: string;
  }> {
    const previousCount = await this.getInsideCount();
    const safeCount = Math.max(0, Math.min(MAX_GYM_CAPACITY, dto.newCount));

    await this.setInsideCount(safeCount);

    // Ghi log điều chỉnh thủ công
    await this.accessLogModel.create({
      userId: staffId ? new Types.ObjectId(staffId) : new Types.ObjectId(),
      qrCode: 'MANUAL_OVERRIDE',
      memberName: 'Quản Trị Viên / Nhân Viên',
      direction: safeCount >= previousCount ? 'IN' : 'OUT',
      insideCountAfter: safeCount,
      isManualOverride: true,
      overrideReason: dto.reason,
      timestamp: new Date(),
    });

    // Phát WebSocket cập nhật sức chứa
    try {
      this.eventsGateway.server?.emit('gym_capacity_updated', {
        insideCount: safeCount,
        maxCapacity: MAX_GYM_CAPACITY,
        occupancyRate: Math.round((safeCount / MAX_GYM_CAPACITY) * 100),
        override: true,
      });
    } catch (_) {}

    this.logger.log(
      `⚙️ Ghi đè số đếm Gym thủ công: ${previousCount} -> ${safeCount} người. Lý do: ${dto.reason}`,
    );

    return {
      success: true,
      previousCount,
      newCount: safeCount,
      reason: dto.reason,
    };
  }

  /**
   * Tự động reset bộ đếm về 0 vào giờ đóng cửa (23:00) theo BR-29
   */
  async resetDailyCapacity(): Promise<{ message: string; insideCount: number }> {
    await this.setInsideCount(0);
    this.logger.log('🌙 Đã tự động reset bộ đếm Gym về 0 vào giờ đóng cửa 23:00 (BR-29)');

    try {
      this.eventsGateway.server?.emit('gym_capacity_updated', {
        insideCount: 0,
        maxCapacity: MAX_GYM_CAPACITY,
        occupancyRate: 0,
      });
    } catch (_) {}

    return {
      message: 'Đã reset bộ đếm phòng Gym về 0',
      insideCount: 0,
    };
  }

  /**
   * Xem lịch sử quét cửa xoay (cho Web Admin)
   */
  async getAccessLogs(limit = 50): Promise<GymAccessLogDocument[]> {
    return this.accessLogModel.find().sort({ timestamp: -1 }).limit(limit).exec();
  }
}
