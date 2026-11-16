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
import { StaffProfile, StaffProfileDocument } from '../schemas/staff-profile.schema.js';
import { StaffShift, StaffShiftDocument } from '../schemas/staff-shift.schema.js';
import { AttendanceRecord, AttendanceRecordDocument } from '../schemas/attendance.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateStaffProfileDto,
  UpdateStaffProfileDto,
  TrainerListQueryDto,
  CreateStaffShiftDto,
  StaffShiftListQueryDto,
  RecordAttendanceDto,
} from '@sports/contracts';

@Injectable()
export class StaffManagementService {
  private readonly logger = new Logger(StaffManagementService.name);

  constructor(
    @InjectModel(StaffProfile.name)
    private readonly staffModel: Model<StaffProfileDocument>,
    @InjectModel(StaffShift.name)
    private readonly shiftModel: Model<StaffShiftDocument>,
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceModel: Model<AttendanceRecordDocument>,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async createStaffProfile(dto: CreateStaffProfileDto): Promise<StaffProfileDocument> {
    const existing = await this.staffModel.findOne({ userId: new Types.ObjectId(dto.userId) });
    if (existing) {
      throw new ConflictException({
        code: 'STAFF_PROFILE_EXISTS',
        message: 'Hồ sơ nhân sự cho tài khoản này đã tồn tại',
      });
    }

    const profile = new this.staffModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });

    return profile.save();
  }

  async updateStaffProfile(id: string, dto: UpdateStaffProfileDto): Promise<StaffProfileDocument> {
    const profile = await this.findById(id);

    if (dto.fullName) profile.fullName = dto.fullName;
    if (dto.phone) profile.phone = dto.phone;
    if (dto.specialties) profile.specialties = dto.specialties;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.hourlyRate !== undefined) profile.hourlyRate = dto.hourlyRate;
    if (dto.certifications) profile.certifications = dto.certifications;
    if (dto.employmentStatus) profile.employmentStatus = dto.employmentStatus;

    return profile.save();
  }

  async findById(id: string): Promise<StaffProfileDocument> {
    const profile = await this.staffModel.findById(id);
    if (!profile) {
      throw new NotFoundException({
        code: 'STAFF_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ nhân sự',
      });
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<StaffProfileDocument | null> {
    return this.staffModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async findAllTrainers(query: TrainerListQueryDto): Promise<{ items: StaffProfileDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.specialty) {
      filter.specialties = { $in: [query.specialty] };
    }
    if (query.employmentStatus) {
      filter.employmentStatus = query.employmentStatus;
    }
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search.trim(), $options: 'i' } },
        { phone: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.staffModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.staffModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  // ==================== PHÂN CA & LỊCH LÀM VIỆC ====================

  async createStaffShift(dto: CreateStaffShiftDto): Promise<StaffShiftDocument> {
    const shift = new this.shiftModel({
      ...dto,
      staffId: new Types.ObjectId(dto.staffId),
      shiftDate: new Date(dto.shiftDate),
    });

    return shift.save();
  }

  async findStaffShifts(query: StaffShiftListQueryDto): Promise<StaffShiftDocument[]> {
    const filter: Record<string, unknown> = {};

    if (query.staffId) {
      filter.staffId = new Types.ObjectId(query.staffId);
    }
    if (query.shiftType) {
      filter.shiftType = query.shiftType;
    }
    if (query.shiftDate) {
      filter.shiftDate = new Date(query.shiftDate);
    } else if (query.fromDate || query.toDate) {
      const dateRange: Record<string, Date> = {};
      if (query.fromDate) dateRange.$gte = new Date(query.fromDate);
      if (query.toDate) dateRange.$lte = new Date(query.toDate);
      filter.shiftDate = dateRange;
    }

    return this.shiftModel.find(filter).sort({ shiftDate: 1, startTime: 1 }).exec();
  }

  // ==================== CHẤM CÔNG VÀO / RA CA ====================

  async recordCheckIn(staffUserId: string, dto: RecordAttendanceDto): Promise<AttendanceRecordDocument> {
    const staff = await this.findByUserId(staffUserId);
    if (!staff) {
      throw new NotFoundException({
        code: 'STAFF_NOT_FOUND',
        message: 'Tài khoản chưa được liên kết với hồ sơ nhân viên',
      });
    }

    // Kiểm tra ca làm việc hôm nay nếu có
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const shift = dto.shiftId
      ? await this.shiftModel.findById(dto.shiftId)
      : await this.shiftModel.findOne({ staffId: staff._id, shiftDate: today });

    const attendance = new this.attendanceModel({
      staffId: staff._id,
      shiftId: shift?._id,
      checkInAt: now,
      deviceIp: dto.deviceIp,
      location: dto.location,
      note: dto.note,
    });

    const saved = await attendance.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: staffUserId,
        action: 'STAFF_CHECK_IN',
        targetType: 'attendance',
        targetId: saved._id.toString(),
        after: { checkInAt: now, staffName: staff.fullName },
      });
    }

    this.logger.log(`Staff ${staff.fullName} checked in at ${now.toISOString()}`);
    return saved;
  }

  async recordCheckOut(staffUserId: string, dto: RecordAttendanceDto): Promise<AttendanceRecordDocument> {
    const staff = await this.findByUserId(staffUserId);
    if (!staff) {
      throw new NotFoundException({
        code: 'STAFF_NOT_FOUND',
        message: 'Tài khoản chưa được liên kết với hồ sơ nhân viên',
      });
    }

    // Tìm bản ghi check-in gần nhất chưa check-out
    const latestAttendance = await this.attendanceModel
      .findOne({ staffId: staff._id, checkOutAt: { $exists: false } })
      .sort({ checkInAt: -1 });

    if (!latestAttendance) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_CHECKIN',
        message: 'Không tìm thấy lượt chấm công vào ca hợp lệ để chấm công ra',
      });
    }

    const now = new Date();
    latestAttendance.checkOutAt = now;
    const diffMs = now.getTime() - latestAttendance.checkInAt.getTime();
    latestAttendance.totalWorkedMinutes = Math.max(0, Math.round(diffMs / 60000));
    if (dto.note) latestAttendance.note = (latestAttendance.note ? `${latestAttendance.note}; ` : '') + dto.note;

    const saved = await latestAttendance.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        actorId: staffUserId,
        action: 'STAFF_CHECK_OUT',
        targetType: 'attendance',
        targetId: saved._id.toString(),
        after: { checkOutAt: now, totalWorkedMinutes: latestAttendance.totalWorkedMinutes },
      });
    }

    this.logger.log(`Staff ${staff.fullName} checked out. Worked: ${latestAttendance.totalWorkedMinutes} minutes`);
    return saved;
  }

  async getStaffAttendanceHistory(staffUserId: string, limit = 30): Promise<AttendanceRecordDocument[]> {
    const staff = await this.findByUserId(staffUserId);
    if (!staff) return [];

    return this.attendanceModel
      .find({ staffId: staff._id })
      .sort({ checkInAt: -1 })
      .limit(limit)
      .exec();
  }
}
