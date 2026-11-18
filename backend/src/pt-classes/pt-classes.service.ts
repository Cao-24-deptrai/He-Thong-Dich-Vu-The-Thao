import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StaffProfile, StaffProfileDocument } from './schemas/staff-profile.schema';
import { StaffShift, StaffShiftDocument } from './schemas/staff-shift.schema';
import { AttendanceRecord, AttendanceRecordDocument } from './schemas/attendance.schema';
import { ClassTemplate, ClassTemplateDocument } from './schemas/class-template.schema';
import { ClassSession, ClassSessionDocument } from './schemas/class-session.schema';
import { ClassRegistration, ClassRegistrationDocument } from './schemas/class-registration.schema';
import { PtBookingSession, PtBookingSessionDocument } from './schemas/pt-booking-session.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import {
  CreateStaffProfileDto,
  CreateStaffShiftDto,
  StaffAttendanceCheckinDto,
  CreateClassTemplateDto,
  RegisterClassDto,
  BookPtSessionDto,
} from './dto/pt-classes.dto';
import {
  ClassSessionStatus,
  ClassRegistrationStatus,
  PtSessionStatus,
  StaffEmploymentStatus,
} from '../common/enums';

@Injectable()
export class PtClassesService {
  private readonly logger = new Logger(PtClassesService.name);

  constructor(
    @InjectModel(StaffProfile.name)
    private readonly staffModel: Model<StaffProfileDocument>,
    @InjectModel(StaffShift.name)
    private readonly shiftModel: Model<StaffShiftDocument>,
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(ClassTemplate.name)
    private readonly templateModel: Model<ClassTemplateDocument>,
    @InjectModel(ClassSession.name)
    private readonly sessionModel: Model<ClassSessionDocument>,
    @InjectModel(ClassRegistration.name)
    private readonly registrationModel: Model<ClassRegistrationDocument>,
    @InjectModel(PtBookingSession.name)
    private readonly ptSessionModel: Model<PtBookingSessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
  ) {}

  // ==================== 1. STAFF & TRAINER PROFILES ====================

  async createStaffProfile(dto: CreateStaffProfileDto): Promise<StaffProfile> {
    const existing = await this.staffModel.findOne({ userId: new Types.ObjectId(dto.userId) });
    if (existing) {
      throw new ConflictException('Hồ sơ nhân sự cho tài khoản này đã tồn tại');
    }
    const profile = new this.staffModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
    return profile.save();
  }

  async getTrainers(query?: { specialty?: string; search?: string }): Promise<StaffProfile[]> {
    const filter: any = { employmentStatus: StaffEmploymentStatus.ACTIVE };
    if (query?.specialty) {
      filter.specialties = query.specialty;
    }
    if (query?.search) {
      filter.fullName = { $regex: query.search, $options: 'i' };
    }
    return this.staffModel.find(filter).lean();
  }

  async getTrainerById(id: string): Promise<StaffProfile> {
    const trainer = await this.staffModel.findById(id).lean();
    if (!trainer) {
      throw new NotFoundException('Không tìm thấy huấn luyện viên');
    }
    return trainer;
  }

  async createShift(dto: CreateStaffShiftDto): Promise<StaffShift> {
    const shift = new this.shiftModel({
      ...dto,
      staffId: new Types.ObjectId(dto.staffId),
      shiftDate: new Date(dto.shiftDate),
    });
    return shift.save();
  }

  async getStaffShifts(staffId: string, startDate?: string, endDate?: string): Promise<StaffShift[]> {
    const filter: any = { staffId: new Types.ObjectId(staffId) };
    if (startDate && endDate) {
      filter.shiftDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    return this.shiftModel.find(filter).sort({ shiftDate: 1, startTime: 1 }).lean();
  }

  async checkinAttendance(dto: StaffAttendanceCheckinDto): Promise<AttendanceRecord> {
    const record = new this.attendanceModel({
      staffId: new Types.ObjectId(dto.staffId),
      shiftId: dto.shiftId ? new Types.ObjectId(dto.shiftId) : undefined,
      checkInAt: new Date(),
      location: dto.location,
    });
    return record.save();
  }

  async checkoutAttendance(attendanceId: string): Promise<AttendanceRecord> {
    const record = await this.attendanceModel.findById(attendanceId);
    if (!record) {
      throw new NotFoundException('Không tìm thấy lượt chấm công');
    }
    const now = new Date();
    record.checkOutAt = now;
    const diffMs = now.getTime() - new Date(record.checkInAt).getTime();
    record.totalWorkedMinutes = Math.max(0, Math.round(diffMs / 60000));
    return record.save();
  }

  // ==================== 2. CLASS MANAGEMENT ====================

  async createClassTemplate(dto: CreateClassTemplateDto): Promise<ClassTemplate> {
    const trainer = await this.staffModel.findById(dto.trainerId);
    if (!trainer) {
      throw new NotFoundException('Huấn luyện viên không tồn tại');
    }
    const template = new this.templateModel({
      ...dto,
      trainerId: new Types.ObjectId(dto.trainerId),
      trainerName: trainer.fullName,
    });
    return template.save();
  }

  async generateSessionsForTemplate(
    templateId: string,
    startDateStr: string,
    daysAhead: number = 14,
  ): Promise<ClassSession[]> {
    const template = await this.templateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Không tìm thấy mẫu lớp học');
    }

    const startDate = new Date(startDateStr);
    const createdSessions: ClassSession[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + i);
      const dayOfWeek = targetDate.getDay();

      if (template.daysOfWeek.includes(dayOfWeek)) {
        // Kiểm tra xem session ngày này đã sinh chưa
        const dateMidnight = new Date(targetDate.toISOString().slice(0, 10));
        const existing = await this.sessionModel.findOne({
          templateId: template._id,
          date: dateMidnight,
        });

        if (!existing) {
          const session = new this.sessionModel({
            templateId: template._id,
            name: `${template.name} (${targetDate.toLocaleDateString('vi-VN')})`,
            classType: template.classType,
            trainerId: template.trainerId,
            trainerName: template.trainerName,
            date: dateMidnight,
            startTime: template.defaultStartTime,
            endTime: template.defaultEndTime,
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
    }

    return createdSessions;
  }

  async getClassSessions(query?: { date?: string; classType?: string }): Promise<ClassSession[]> {
    const filter: any = { status: ClassSessionStatus.SCHEDULED };
    if (query?.date) {
      filter.date = new Date(query.date);
    }
    if (query?.classType) {
      filter.classType = query.classType;
    }
    return this.sessionModel.find(filter).sort({ date: 1, startTime: 1 }).lean();
  }

  async getClassSessionById(id: string): Promise<ClassSession> {
    const session = await this.sessionModel.findById(id).lean();
    if (!session) {
      throw new NotFoundException('Không tìm thấy buổi học');
    }
    return session;
  }

  async registerClass(sessionId: string, userId: string, dto: RegisterClassDto): Promise<ClassRegistration> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // 1. Kiểm tra đăng ký trùng
    const existing = await this.registrationModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      customerId: new Types.ObjectId(userId),
      status: { $ne: ClassRegistrationStatus.CANCELLED },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đăng ký tham gia lớp học này');
    }

    // 2. Tăng nguyên tử bookedCount với điều kiện bookedCount < capacity (Bảo đảm bất biến sức chứa F11.6)
    const updatedSession = await this.sessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        status: ClassSessionStatus.SCHEDULED,
        $expr: { $lt: ['$bookedCount', '$capacity'] },
      },
      { $inc: { bookedCount: 1 } },
      { new: true },
    );

    if (!updatedSession) {
      throw new ConflictException('CLASS_FULL_CAPACITY: Buổi học đã đủ số lượng học viên');
    }

    const reg = new this.registrationModel({
      sessionId: new Types.ObjectId(sessionId),
      customerId: new Types.ObjectId(userId),
      customerName: dto.customerName || user.fullName,
      customerPhone: user.phone,
      pricePaid: updatedSession.pricePerSession,
      paymentMethod: dto.paymentMethod,
      registeredAt: new Date(),
      status: ClassRegistrationStatus.REGISTERED,
    });

    return reg.save();
  }

  // ==================== 3. PT 1-1 BOOKING ====================

  async bookPtSession(userId: string, dto: BookPtSessionDto): Promise<PtBookingSession> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    const trainer = await this.staffModel.findById(dto.trainerId);
    if (!trainer) {
      throw new NotFoundException('Huấn luyện viên không tồn tại');
    }

    const sessionDate = new Date(dto.sessionDate);
    const lockKey = `lock:pt:${dto.trainerId}:${dto.sessionDate}:${dto.startTime}`;
    const acquired = await this.redisService.acquireLock(lockKey, userId, 3000);

    if (!acquired) {
      throw new ConflictException('TRAINER_TIME_SLOT_CONFLICT: Khung giờ của HLV đang được người khác giữ chỗ');
    }

    try {
      // 1. Kiểm tra xung đột với buổi PT 1-1 khác của HLV
      const conflictPt = await this.ptSessionModel.findOne({
        trainerId: new Types.ObjectId(dto.trainerId),
        sessionDate,
        startTime: dto.startTime,
        status: { $in: [PtSessionStatus.HELD, PtSessionStatus.CONFIRMED] },
      });
      if (conflictPt) {
        throw new ConflictException('TRAINER_TIME_SLOT_CONFLICT: Huấn luyện viên đã có lịch dạy 1-1 khung giờ này');
      }

      // 2. Kiểm tra xung đột với lịch dạy lớp nhóm của HLV
      const conflictClass = await this.sessionModel.findOne({
        trainerId: new Types.ObjectId(dto.trainerId),
        date: sessionDate,
        startTime: dto.startTime,
        status: ClassSessionStatus.SCHEDULED,
      });
      if (conflictClass) {
        throw new ConflictException('TRAINER_TIME_SLOT_CONFLICT: Huấn luyện viên bận đứng lớp nhóm vào khung giờ này');
      }

      // Tính giờ kết thúc
      const duration = dto.durationMinutes || 60;
      const [sh, sm] = dto.startTime.split(':').map(Number);
      const endTotalMinutes = sh * 60 + sm + duration;
      const eh = Math.floor(endTotalMinutes / 60);
      const em = endTotalMinutes % 60;
      const endTime = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

      const sessionCode = `PT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const ptSession = new this.ptSessionModel({
        sessionCode,
        trainerId: new Types.ObjectId(dto.trainerId),
        trainerName: trainer.fullName,
        customerId: new Types.ObjectId(userId),
        customerName: user.fullName,
        customerPhone: user.phone,
        sessionDate,
        startTime: dto.startTime,
        endTime,
        durationMinutes: duration,
        pricePaid: trainer.hourlyRate,
        paymentMethod: dto.paymentMethod,
        status: PtSessionStatus.CONFIRMED,
        notes: dto.notes,
      });

      return await ptSession.save();
    } finally {
      await this.redisService.releaseLock(lockKey, userId);
    }
  }

  async getTrainerPtSessions(trainerId: string): Promise<PtBookingSession[]> {
    return this.ptSessionModel
      .find({ trainerId: new Types.ObjectId(trainerId) })
      .sort({ sessionDate: 1, startTime: 1 })
      .lean();
  }

  async getUserPtSessions(userId: string): Promise<PtBookingSession[]> {
    return this.ptSessionModel
      .find({ customerId: new Types.ObjectId(userId) })
      .sort({ sessionDate: -1 })
      .lean();
  }
}
