import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PtBookingSession, PtBookingSessionDocument } from '../schemas/pt-booking-session.schema.js';
import { ClassSession, ClassSessionDocument } from '../schemas/class-session.schema.js';
import { StaffProfile, StaffProfileDocument } from '../schemas/staff-profile.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { ComboPackageService } from '../../promotion/services/combo-package.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  BookPtSessionDto,
  PtSessionListQueryDto,
  CompletePtSessionDto,
  MonthlyTrainerReportQueryDto,
  MonthlyTrainerReportResponse,
} from '@sports/contracts';
import {
  PtSessionStatus,
  ClassSessionStatus,
  PaymentMethod,
  ComboItemType,
} from '@sports/shared';

@Injectable()
export class PtBookingService {
  private readonly logger = new Logger(PtBookingService.name);

  constructor(
    @InjectModel(PtBookingSession.name)
    private readonly ptSessionModel: Model<PtBookingSessionDocument>,
    @InjectModel(ClassSession.name)
    private readonly classSessionModel: Model<ClassSessionDocument>,
    @InjectModel(StaffProfile.name)
    private readonly staffModel: Model<StaffProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional() private readonly comboPackageService?: ComboPackageService,
    @Optional() private readonly cashierShiftService?: CashierShiftService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  private generateSessionCode(): string {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PT-${todayStr}-${randomHex}`;
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutesToTime(totalM: number): string {
    const h = Math.floor(totalM / 60) % 24;
    const m = totalM % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ==================== ĐẶT LỊCH PT 1-1 ====================

  /**
   * F11.8 Đặt buổi PT 1-1:
   * - Bất biến Rule 3: Cấm thanh toán ví nội bộ cho buổi PT (WALLET_PAYMENT_FORBIDDEN_FOR_PT)
   * - Bất biến: PT không bị xếp trùng giờ với buổi PT 1-1 khác hoặc lớp học (TRAINER_TIME_CONFLICT)
   */
  async bookPtSession(actorId: string, dto: BookPtSessionDto): Promise<PtBookingSessionDocument> {
    // 1. Kiểm tra Idempotency Replay
    const existing = await this.ptSessionModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent PT session booking replay: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Bất biến SPEC Rule 3: Cấm thanh toán ví nội bộ cho buổi tập PT
    if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      throw new BadRequestException({
        code: 'WALLET_PAYMENT_FORBIDDEN_FOR_PT',
        message: 'Dịch vụ thuê Huấn luyện viên (PT) không được thanh toán bằng ví nội bộ. Vui lòng thanh toán bằng Tiền mặt, VietQR hoặc trừ buổi từ Gói Combo',
      });
    }

    // 3. Tìm huấn luyện viên
    const trainer = await this.staffModel.findById(dto.trainerId);
    if (!trainer) {
      throw new NotFoundException({
        code: 'TRAINER_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ huấn luyện viên',
      });
    }

    // 4. Tìm khách hàng
    const customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Không tìm thấy tài khoản với số điện thoại ${dto.customerPhone}`,
      });
    }

    // 5. Tính toán khung giờ bắt đầu - kết thúc
    const bookingDate = new Date(dto.date);
    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = startMinutes + dto.durationMinutes;
    const endTime = this.minutesToTime(endMinutes);

    // 6. BẤT BIẾN: Kiểm tra xung đột lịch của PT (TRAINER_TIME_CONFLICT)
    // 6a. Kiểm tra xung đột với các buổi PT 1-1 khác của trainer này
    const existingPtSessions = await this.ptSessionModel
      .find({
        trainerId: trainer._id,
        date: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()),
        status: { $in: [PtSessionStatus.BOOKED, PtSessionStatus.IN_PROGRESS] },
      })
      .exec();

    for (const s of existingPtSessions) {
      const sStart = this.timeToMinutes(s.startTime);
      const sEnd = this.timeToMinutes(s.endTime);
      // Hai khoảng thời gian giao nhau khi: startA < endB && endA > startB
      if (startMinutes < sEnd && endMinutes > sStart) {
        throw new BadRequestException({
          code: 'TRAINER_TIME_CONFLICT',
          message: `Huấn luyện viên "${trainer.fullName}" đã có lịch dạy PT 1-1 khác vào khung giờ ${s.startTime} - ${s.endTime}`,
        });
      }
    }

    // 6b. Kiểm tra xung đột với các buổi dạy Lớp học nhóm của trainer này
    const existingClassSessions = await this.classSessionModel
      .find({
        trainerId: trainer._id,
        date: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()),
        status: { $in: [ClassSessionStatus.SCHEDULED, ClassSessionStatus.IN_PROGRESS] },
      })
      .exec();

    for (const cs of existingClassSessions) {
      const csStart = this.timeToMinutes(cs.startTime);
      const csEnd = this.timeToMinutes(cs.endTime);
      if (startMinutes < csEnd && endMinutes > csStart) {
        throw new BadRequestException({
          code: 'TRAINER_TIME_CONFLICT',
          message: `Huấn luyện viên "${trainer.fullName}" đang phụ trách lớp học "${cs.name}" vào khung giờ ${cs.startTime} - ${cs.endTime}`,
        });
      }
    }

    // 7. Tính chi phí: Giá theo giờ của PT * số giờ, hoặc trừ từ gói combo
    const hours = dto.durationMinutes / 60;
    const pricePaid = dto.userPackageId ? 0 : Math.round(trainer.hourlyRate * hours);

    if (dto.userPackageId && this.comboPackageService) {
      await this.comboPackageService.deductPackageItem({
        userPackageId: dto.userPackageId,
        itemType: ComboItemType.PT_SESSIONS,
        quantity: 1,
        refType: 'PT_BOOKING_SESSION',
        refId: trainer._id.toString(),
      });
    } else if (dto.paymentMethod === PaymentMethod.CASH && this.cashierShiftService) {
      const activeShift = await this.cashierShiftService.getActiveShift(actorId);
      if (activeShift) {
        await this.cashierShiftService.recordOrderSales(
          activeShift._id.toString(),
          pricePaid,
          PaymentMethod.CASH,
        );
      }
    }

    const sessionCode = this.generateSessionCode();
    const session = new this.ptSessionModel({
      sessionCode,
      trainerId: trainer._id,
      trainerName: trainer.fullName,
      customerId: customer._id,
      customerName: dto.customerName || customer.fullName,
      customerPhone: customer.phone,
      date: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()),
      startTime: dto.startTime,
      endTime,
      durationMinutes: dto.durationMinutes,
      pricePaid,
      paymentMethod: dto.paymentMethod,
      userPackageId: dto.userPackageId ? new Types.ObjectId(dto.userPackageId) : undefined,
      notes: dto.notes,
      status: PtSessionStatus.BOOKED,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await session.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'BOOK_PT_SESSION',
        targetType: 'pt_session',
        targetId: saved._id.toString(),
        after: {
          sessionCode: saved.sessionCode,
          trainerName: trainer.fullName,
          customerPhone: customer.phone,
          date: saved.date,
          startTime: dto.startTime,
          pricePaid,
        },
      });
    }

    this.logger.log(`Customer ${customer.phone} booked PT session ${sessionCode} with ${trainer.fullName} on ${dto.date} at ${dto.startTime}`);
    return saved;
  }

  async findAllPtSessions(query: PtSessionListQueryDto): Promise<{ items: PtBookingSessionDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.trainerId) filter.trainerId = new Types.ObjectId(query.trainerId);
    if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
    if (query.status) filter.status = query.status;
    if (query.fromDate || query.toDate) {
      const dateRange: Record<string, Date> = {};
      if (query.fromDate) dateRange.$gte = new Date(query.fromDate);
      if (query.toDate) dateRange.$lte = new Date(query.toDate);
      filter.date = dateRange;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.ptSessionModel.find(filter).sort({ date: 1, startTime: 1 }).skip(skip).limit(limit).exec(),
      this.ptSessionModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  // ==================== LỊCH DẠY CÁ NHÂN & BẢO MẬT DỮ LIỆU PT ====================

  /**
   * F11.9 PT xem lịch dạy cá nhân (Lớp nhóm + Buổi PT 1-1)
   */
  async findTrainerSchedule(
    trainerUserId: string,
    targetDate?: Date,
  ): Promise<{ ptSessions: PtBookingSessionDocument[]; classSessions: ClassSessionDocument[] }> {
    const staff = await this.staffModel.findOne({ userId: new Types.ObjectId(trainerUserId) });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy hồ sơ huấn luyện viên cho tài khoản này');
    }

    const filter: Record<string, unknown> = { trainerId: staff._id };
    if (targetDate) {
      const d = new Date(targetDate);
      filter.date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    const [ptSessions, classSessions] = await Promise.all([
      this.ptSessionModel.find(filter).sort({ date: 1, startTime: 1 }).exec(),
      this.classSessionModel.find(filter).sort({ date: 1, startTime: 1 }).exec(),
    ]);

    return { ptSessions, classSessions };
  }

  /**
   * F11.9 Bất biến Bảo mật PT Data Privacy:
   * PT chỉ được xem lịch sử tập và dữ liệu học viên của chính mình
   */
  async getTrainerStudentHistory(trainerUserId: string, customerId: string): Promise<PtBookingSessionDocument[]> {
    const staff = await this.staffModel.findOne({ userId: new Types.ObjectId(trainerUserId) });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy hồ sơ huấn luyện viên');
    }

    // Huấn luyện viên chỉ được truy vấn các buổi tập do chính mình huấn luyện học viên này
    return this.ptSessionModel
      .find({
        trainerId: staff._id,
        customerId: new Types.ObjectId(customerId),
      })
      .sort({ date: -1, startTime: -1 })
      .exec();
  }

  /**
   * F11.9 Điểm danh hoàn thành buổi PT & Ghi chú thể lực giáo án
   */
  async completePtSession(
    trainerUserId: string,
    sessionId: string,
    dto: CompletePtSessionDto,
  ): Promise<PtBookingSessionDocument> {
    const staff = await this.staffModel.findOne({ userId: new Types.ObjectId(trainerUserId) });
    const session = await this.ptSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy buổi tập PT');
    }

    // Kiểm tra quyền: Chỉ chính PT phụ trách hoặc quản lý mới được hoàn tất buổi
    if (staff && session.trainerId.toString() !== staff._id.toString()) {
      throw new ForbiddenException('Bạn không có quyền cập nhật buổi tập của huấn luyện viên khác');
    }

    session.status = PtSessionStatus.COMPLETED;
    session.completedAt = new Date();
    if (dto.fitnessNotes) session.fitnessNotes = dto.fitnessNotes;
    if (dto.bonusAmount !== undefined) session.bonusAmount = dto.bonusAmount;

    return session.save();
  }

  // ==================== BÁO CÁO THÁNG CHO KẾ TOÁN (F11.10) ====================

  async getMonthlyTrainerReport(query: MonthlyTrainerReportQueryDto): Promise<MonthlyTrainerReportResponse> {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0, 23, 59, 59);

    const trainersFilter: Record<string, unknown> = {};
    if (query.trainerId) {
      trainersFilter._id = new Types.ObjectId(query.trainerId);
    }

    const trainers = await this.staffModel.find(trainersFilter).exec();

    const reportTrainers = [];
    let overallClassesTaught = 0;
    let overallPtSessionsCompleted = 0;
    let overallBonusAmount = 0;

    for (const t of trainers) {
      const [classes, ptSessions] = await Promise.all([
        this.classSessionModel.find({
          trainerId: t._id,
          date: { $gte: startDate, $lte: endDate },
          status: ClassSessionStatus.COMPLETED,
        }).exec(),
        this.ptSessionModel.find({
          trainerId: t._id,
          date: { $gte: startDate, $lte: endDate },
          status: PtSessionStatus.COMPLETED,
        }).exec(),
      ]);

      let totalPtMinutes = 0;
      let totalBonus = 0;
      let totalRevenue = 0;

      for (const p of ptSessions) {
        totalPtMinutes += p.durationMinutes || 60;
        totalBonus += p.bonusAmount || 0;
        totalRevenue += p.pricePaid || 0;
      }

      for (const c of classes) {
        totalRevenue += (c.pricePerSession || 0) * (c.bookedCount || 0);
      }

      overallClassesTaught += classes.length;
      overallPtSessionsCompleted += ptSessions.length;
      overallBonusAmount += totalBonus;

      reportTrainers.push({
        trainerId: t._id.toString(),
        trainerName: t.fullName,
        phone: t.phone,
        totalClassesTaught: classes.length,
        totalPtSessionsCompleted: ptSessions.length,
        totalPtHours: Math.round((totalPtMinutes / 60) * 10) / 10,
        totalBonusAmount: totalBonus,
        totalRevenueGenerated: totalRevenue,
      });
    }

    return {
      month: query.month,
      year: query.year,
      trainers: reportTrainers,
      overallClassesTaught,
      overallPtSessionsCompleted,
      overallBonusAmount,
    };
  }
}
