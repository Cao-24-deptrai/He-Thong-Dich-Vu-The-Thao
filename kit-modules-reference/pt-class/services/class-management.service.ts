import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClassTemplate, ClassTemplateDocument } from '../schemas/class-template.schema.js';
import { ClassSession, ClassSessionDocument } from '../schemas/class-session.schema.js';
import { ClassRegistration, ClassRegistrationDocument } from '../schemas/class-registration.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { ComboPackageService } from '../../promotion/services/combo-package.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateClassTemplateDto,
  UpdateClassTemplateDto,
  ClassTemplateListQueryDto,
  GenerateClassSessionsDto,
  ClassSessionListQueryDto,
  RegisterClassSessionDto,
  CancelClassRegistrationDto,
  CheckInClassAttendeeDto,
} from '@sports/contracts';
import {
  ClassSessionStatus,
  ClassRegistrationStatus,
  PaymentMethod,
  ComboItemType,
} from '@sports/shared';

@Injectable()
export class ClassManagementService {
  private readonly logger = new Logger(ClassManagementService.name);

  constructor(
    @InjectModel(ClassTemplate.name)
    private readonly templateModel: Model<ClassTemplateDocument>,
    @InjectModel(ClassSession.name)
    private readonly sessionModel: Model<ClassSessionDocument>,
    @InjectModel(ClassRegistration.name)
    private readonly registrationModel: Model<ClassRegistrationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional() private readonly comboPackageService?: ComboPackageService,
    @Optional() private readonly cashierShiftService?: CashierShiftService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  // ==================== CLASS TEMPLATE ====================

  async createTemplate(dto: CreateClassTemplateDto): Promise<ClassTemplateDocument> {
    const template = new this.templateModel({
      ...dto,
      trainerId: new Types.ObjectId(dto.trainerId),
      roomOrCourtId: dto.roomOrCourtId ? new Types.ObjectId(dto.roomOrCourtId) : undefined,
      isActive: dto.isActive ?? true,
    });

    return template.save();
  }

  async updateTemplate(id: string, dto: UpdateClassTemplateDto): Promise<ClassTemplateDocument> {
    const template = await this.findTemplateById(id);

    if (dto.name) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.classType) template.classType = dto.classType;
    if (dto.trainerId) template.trainerId = new Types.ObjectId(dto.trainerId);
    if (dto.trainerName) template.trainerName = dto.trainerName;
    if (dto.capacity !== undefined) template.capacity = dto.capacity;
    if (dto.pricePerSession !== undefined) template.pricePerSession = dto.pricePerSession;
    if (dto.durationMinutes !== undefined) template.durationMinutes = dto.durationMinutes;
    if (dto.daysOfWeek) template.daysOfWeek = dto.daysOfWeek;
    if (dto.startTime) template.startTime = dto.startTime;
    if (dto.roomOrCourtId) template.roomOrCourtId = new Types.ObjectId(dto.roomOrCourtId);
    if (dto.roomName !== undefined) template.roomName = dto.roomName;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    return template.save();
  }

  async findTemplateById(id: string): Promise<ClassTemplateDocument> {
    const template = await this.templateModel.findById(id);
    if (!template) {
      throw new NotFoundException({
        code: 'CLASS_TEMPLATE_NOT_FOUND',
        message: 'Không tìm thấy mẫu lớp học',
      });
    }
    return template;
  }

  async findAllTemplates(query: ClassTemplateListQueryDto): Promise<ClassTemplateDocument[]> {
    const filter: Record<string, unknown> = {};

    if (query.classType) filter.classType = query.classType;
    if (query.trainerId) filter.trainerId = new Types.ObjectId(query.trainerId);
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }

    return this.templateModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  // ==================== CLASS SESSIONS ====================

  /**
   * Tự động sinh các buổi học theo chu kỳ tuần từ ClassTemplate
   */
  async generateClassSessions(dto: GenerateClassSessionsDto): Promise<ClassSessionDocument[]> {
    const template = await this.findTemplateById(dto.templateId);
    if (!template.isActive) {
      throw new BadRequestException({
        code: 'TEMPLATE_INACTIVE',
        message: 'Mẫu lớp học đang bị tạm dừng hoặc ngừng hoạt động',
      });
    }

    const start = new Date(dto.fromDate);
    const end = new Date(dto.toDate);
    if (start > end) {
      throw new BadRequestException('fromDate không được lớn hơn toDate');
    }

    const createdSessions: ClassSessionDocument[] = [];
    const current = new Date(start);

    // Tính toán endTime dựa trên startTime + durationMinutes
    const [startH, startM] = template.startTime.split(':').map(Number);
    const totalMinutes = (startH || 0) * 60 + (startM || 0) + template.durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0: CN, 1: T2...
      if (template.daysOfWeek.includes(dayOfWeek)) {
        const sessionDate = new Date(current.getFullYear(), current.getMonth(), current.getDate());

        // Kiểm tra xem đã sinh buổi này chưa (tránh trùng)
        const existing = await this.sessionModel.findOne({
          templateId: template._id,
          date: sessionDate,
          startTime: template.startTime,
        });

        if (!existing) {
          const session = new this.sessionModel({
            templateId: template._id,
            name: template.name,
            classType: template.classType,
            trainerId: template.trainerId,
            trainerName: template.trainerName,
            date: sessionDate,
            startTime: template.startTime,
            endTime,
            roomOrCourtId: template.roomOrCourtId,
            roomName: template.roomName,
            capacity: template.capacity,
            bookedCount: 0,
            pricePerSession: template.pricePerSession,
            status: ClassSessionStatus.SCHEDULED,
          });

          const saved = await session.save();
          createdSessions.push(saved);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    this.logger.log(`Generated ${createdSessions.length} class sessions for template ${template.name}`);
    return createdSessions;
  }

  async findAllSessions(query: ClassSessionListQueryDto): Promise<{ items: ClassSessionDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.templateId) filter.templateId = new Types.ObjectId(query.templateId);
    if (query.classType) filter.classType = query.classType;
    if (query.trainerId) filter.trainerId = new Types.ObjectId(query.trainerId);
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
      this.sessionModel.find(filter).sort({ date: 1, startTime: 1 }).skip(skip).limit(limit).exec(),
      this.sessionModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findSessionById(id: string): Promise<ClassSessionDocument> {
    const session = await this.sessionModel.findById(id);
    if (!session) {
      throw new NotFoundException({
        code: 'CLASS_SESSION_NOT_FOUND',
        message: 'Không tìm thấy buổi học',
      });
    }
    return session;
  }

  // ==================== ĐĂNG KÝ THAM GIA LỚP (REGISTRATION) ====================

  /**
   * F11.6 Đăng ký tham gia lớp:
   * - Bất biến Rule 3: Cấm thanh toán ví nội bộ cho lớp học (WALLET_PAYMENT_FORBIDDEN_FOR_CLASS)
   * - Bất biến: Sức chứa nguyên tử bookedCount < capacity
   */
  async registerClassSession(actorId: string, dto: RegisterClassSessionDto): Promise<ClassRegistrationDocument> {
    // 1. Kiểm tra Idempotency Replay
    const existing = await this.registrationModel.findOne({ idempotencyKey: dto.idempotencyKey });
    if (existing) {
      this.logger.log(`Idempotent class registration replay: ${dto.idempotencyKey}`);
      return existing;
    }

    // 2. Bất biến SPEC Rule 3: Cấm thanh toán ví nội bộ cho học phí lớp học
    if (dto.paymentMethod === PaymentMethod.INTERNAL_WALLET) {
      throw new BadRequestException({
        code: 'WALLET_PAYMENT_FORBIDDEN_FOR_CLASS',
        message: 'Lớp học không thuộc danh mục chi tiêu ví nội bộ. Vui lòng thanh toán bằng Tiền mặt, VietQR hoặc trừ buổi từ Gói Combo',
      });
    }

    // 3. Tìm khách hàng
    const customer = await this.userModel.findOne({ phone: dto.customerPhone.trim() });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Không tìm thấy tài khoản với số điện thoại ${dto.customerPhone}`,
      });
    }

    // 4. Tìm buổi học
    const session = await this.findSessionById(dto.sessionId);
    if (session.status !== ClassSessionStatus.SCHEDULED) {
      throw new BadRequestException({
        code: 'SESSION_NOT_AVAILABLE',
        message: `Buổi học đang ở trạng thái ${session.status}, không thể đăng ký`,
      });
    }

    // 5. Kiểm tra khách đã đăng ký buổi này chưa
    const alreadyRegistered = await this.registrationModel.findOne({
      sessionId: session._id,
      customerId: customer._id,
      status: { $in: [ClassRegistrationStatus.REGISTERED, ClassRegistrationStatus.CHECKED_IN] },
    });
    if (alreadyRegistered) {
      throw new ConflictException({
        code: 'ALREADY_REGISTERED_FOR_CLASS',
        message: 'Bạn đã đăng ký tham gia buổi học này rồi',
      });
    }

    // 6. Xử lý thanh toán: Khấu trừ Gói Combo hoặc Tiền mặt tại quầy
    if (dto.userPackageId && this.comboPackageService) {
      await this.comboPackageService.deductPackageItem({
        userPackageId: dto.userPackageId,
        itemType: ComboItemType.GYM_DAYS, // hoặc thành phần tương đương
        quantity: 1,
        refType: 'CLASS_REGISTRATION',
        refId: session._id.toString(),
      });
    } else if (dto.paymentMethod === PaymentMethod.CASH && this.cashierShiftService) {
      const activeShift = await this.cashierShiftService.getActiveShift(actorId);
      if (activeShift) {
        await this.cashierShiftService.recordOrderSales(
          activeShift._id.toString(),
          session.pricePerSession,
          PaymentMethod.CASH,
        );
      }
    }

    // 7. Tăng nguyên tử bookedCount có điều kiện bookedCount < capacity (CHỐNG DOUBLE-BOOKING / OVERSELL)
    const updatedSession = await this.sessionModel.findOneAndUpdate(
      {
        _id: session._id,
        status: ClassSessionStatus.SCHEDULED,
        $expr: { $lt: ['$bookedCount', '$capacity'] },
      },
      { $inc: { bookedCount: 1 } },
      { new: true },
    );

    if (!updatedSession) {
      throw new BadRequestException({
        code: 'CLASS_FULL',
        message: `Lớp học "${session.name}" đã đủ số lượng học viên (${session.capacity}/${session.capacity})`,
      });
    }

    // 8. Tạo bản ghi đăng ký
    const registration = new this.registrationModel({
      sessionId: session._id,
      customerId: customer._id,
      customerName: dto.customerName || customer.fullName,
      customerPhone: customer.phone,
      pricePaid: dto.userPackageId ? 0 : session.pricePerSession,
      paymentMethod: dto.paymentMethod,
      userPackageId: dto.userPackageId ? new Types.ObjectId(dto.userPackageId) : undefined,
      registeredAt: new Date(),
      status: ClassRegistrationStatus.REGISTERED,
      idempotencyKey: dto.idempotencyKey,
    });

    try {
      const saved = await registration.save();

      if (this.auditLogService) {
        await this.auditLogService.record({
          actorId,
          action: 'REGISTER_CLASS_SESSION',
          targetType: 'class_session',
          targetId: session._id.toString(),
          after: {
            registrationId: saved._id.toString(),
            customerId: customer._id.toString(),
            newBookedCount: updatedSession.bookedCount,
          },
        });
      }

      this.logger.log(`Customer ${customer.phone} registered for class session ${session._id} (${updatedSession.bookedCount}/${session.capacity})`);
      return saved;
    } catch (err: any) {
      // Revert bookedCount nếu ghi nhận đăng ký gặp lỗi duplicate key
      await this.sessionModel.updateOne({ _id: session._id }, { $inc: { bookedCount: -1 } });
      if (err.code === 11000) {
        throw new ConflictException({
          code: 'ALREADY_REGISTERED_FOR_CLASS',
          message: 'Bạn đã đăng ký tham gia buổi học này rồi',
        });
      }
      throw err;
    }
  }

  /**
   * F11.6 Hủy đăng ký buổi học:
   * Cho phép hủy trước 12 giờ so với giờ bắt đầu buổi học
   */
  async cancelRegistration(customerId: string, dto: CancelClassRegistrationDto): Promise<ClassRegistrationDocument> {
    const registration = await this.registrationModel.findById(dto.registrationId);
    if (!registration) {
      throw new NotFoundException({
        code: 'REGISTRATION_NOT_FOUND',
        message: 'Không tìm thấy lượt đăng ký lớp học',
      });
    }

    if (registration.customerId.toString() !== customerId) {
      throw new BadRequestException('Bạn không có quyền hủy lượt đăng ký của người khác');
    }

    if (registration.status !== ClassRegistrationStatus.REGISTERED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_FOR_CANCEL',
        message: `Lượt đăng ký đang ở trạng thái ${registration.status}, không thể hủy`,
      });
    }

    const session = await this.findSessionById(registration.sessionId.toString());

    // Kiểm tra quy tắc 12 giờ trước giờ bắt đầu
    const [startH, startM] = session.startTime.split(':').map(Number);
    const sessionStartTime = new Date(session.date);
    sessionStartTime.setHours(startH || 0, startM || 0, 0, 0);

    const now = new Date();
    const cutoffMs = 12 * 3600 * 1000; // 12 giờ
    if (sessionStartTime.getTime() - now.getTime() < cutoffMs) {
      throw new BadRequestException({
        code: 'CANCELLATION_CUTOFF_EXCEEDED',
        message: 'Chỉ được phép hủy buổi học trước ít nhất 12 giờ so với thời điểm bắt đầu',
      });
    }

    // Cập nhật trạng thái hủy và giảm 1 suất trên session nguyên tử
    registration.status = ClassRegistrationStatus.CANCELLED;
    registration.cancelledAt = now;
    registration.cancellationReason = dto.reason;
    const saved = await registration.save();

    await this.sessionModel.updateOne(
      { _id: session._id, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } },
    );

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: customerId,
        action: 'CANCEL_CLASS_REGISTRATION',
        targetType: 'class_registration',
        targetId: registration._id.toString(),
        after: { cancelledAt: now, reason: dto.reason },
      });
    }

    this.logger.log(`Cancelled class registration ${registration._id} for session ${session._id}`);
    return saved;
  }

  /**
   * F11.7 Hủy buổi lớp từ phía trung tâm/HLV:
   * Chuyển trạng thái session sang CANCELLED và hủy toàn bộ lượt đăng ký
   */
  async cancelClassSession(actorId: string, sessionId: string, reason?: string): Promise<ClassSessionDocument> {
    const session = await this.findSessionById(sessionId);
    session.status = ClassSessionStatus.CANCELLED;
    const saved = await session.save();

    const now = new Date();
    await this.registrationModel.updateMany(
      { sessionId: session._id, status: ClassRegistrationStatus.REGISTERED },
      { $set: { status: ClassRegistrationStatus.CANCELLED, cancelledAt: now, cancellationReason: reason || 'Lớp bị hủy bởi trung tâm' } },
    );

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId,
        action: 'CANCEL_CLASS_SESSION',
        targetType: 'class_session',
        targetId: session._id.toString(),
        after: { cancelledAt: now, reason },
      });
    }

    this.logger.log(`Class session ${sessionId} cancelled by ${actorId}. Reason: ${reason}`);
    return saved;
  }

  /**
   * F11.6 Điểm danh học viên khi vào lớp
   */
  async checkInAttendee(dto: CheckInClassAttendeeDto): Promise<ClassRegistrationDocument> {
    const registration = await this.registrationModel.findById(dto.registrationId);
    if (!registration) {
      throw new NotFoundException({
        code: 'REGISTRATION_NOT_FOUND',
        message: 'Không tìm thấy lượt đăng ký lớp học',
      });
    }

    if (registration.status !== ClassRegistrationStatus.REGISTERED) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_FOR_CHECKIN',
        message: `Lượt đăng ký đang ở trạng thái ${registration.status}, không thể điểm danh`,
      });
    }

    registration.status = ClassRegistrationStatus.CHECKED_IN;
    registration.checkedInAt = new Date();
    return registration.save();
  }
}
