import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffManagementService } from './staff-management.service.js';
import { StaffProfile } from '../schemas/staff-profile.schema.js';
import { StaffShift } from '../schemas/staff-shift.schema.js';
import { AttendanceRecord } from '../schemas/attendance.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  StaffEmploymentStatus,
  StaffShiftType,
} from '@sports/shared';

describe('StaffManagementService', () => {
  let service: StaffManagementService;
  let mockStaffModel: any;
  let mockShiftModel: any;
  let mockAttendanceModel: any;
  let mockAuditLogService: any;

  const inMemoryStaff: any[] = [];
  const inMemoryShifts: any[] = [];
  const inMemoryAttendance: any[] = [];

  const userId = new Types.ObjectId();

  beforeEach(async () => {
    inMemoryStaff.length = 0;
    inMemoryShifts.length = 0;
    inMemoryAttendance.length = 0;

    mockStaffModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryStaff.findIndex((s) => s._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryStaff[idx] = { ...this };
        else inMemoryStaff.push({ ...this });
        return this;
      }),
    }));

    mockStaffModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryStaff.find((s) => {
        if (query.userId && s.userId.toString() === query.userId.toString()) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockStaffModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryStaff.find((s) => s._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryStaff.findIndex((s) => s._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryStaff[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockStaffModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryStaff),
    }));

    mockStaffModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryStaff.length),
    }));

    mockShiftModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        inMemoryShifts.push({ ...this });
        return this;
      }),
    }));

    mockShiftModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryShifts),
    }));

    mockShiftModel.findOne = jest.fn().mockImplementation(() => Promise.resolve(null));
    mockShiftModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryShifts.find((s) => s._id.toString() === id.toString());
      return Promise.resolve(found || null);
    });

    mockAttendanceModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryAttendance.findIndex((a) => a._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryAttendance[idx] = { ...this };
        else inMemoryAttendance.push({ ...this });
        return this;
      }),
    }));

    mockAttendanceModel.findOne = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockImplementation(() => {
        const active = inMemoryAttendance.find((a) => !a.checkOutAt);
        return Promise.resolve(
          active
            ? {
                ...active,
                save: jest.fn().mockImplementation(async function (this: any) {
                  const idx = inMemoryAttendance.findIndex((a) => a._id.toString() === this._id.toString());
                  if (idx >= 0) inMemoryAttendance[idx] = { ...this };
                  return this;
                }),
              }
            : null,
        );
      }),
    }));

    mockAttendanceModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryAttendance),
    }));

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffManagementService,
        { provide: getModelToken(StaffProfile.name), useValue: mockStaffModel },
        { provide: getModelToken(StaffShift.name), useValue: mockShiftModel },
        { provide: getModelToken(AttendanceRecord.name), useValue: mockAttendanceModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<StaffManagementService>(StaffManagementService);
  });

  describe('Staff Profile & Shift', () => {
    it('Tạo hồ sơ PT mới thành công', async () => {
      const profile = await service.createStaffProfile({
        userId: userId.toString(),
        fullName: 'HLV Nguyen The Thao',
        phone: '0901234567',
        specialties: ['Gym', 'Boxing'],
        bio: 'Chuyên gia thể hình 10 năm kinh nghiệm',
        hourlyRate: 300000,
        certifications: ['NASM-CPT', 'CrossFit-L1'],
        employmentStatus: StaffEmploymentStatus.ACTIVE,
      });

      expect(profile.fullName).toBe('HLV Nguyen The Thao');
      expect(profile.hourlyRate).toBe(300000);
      expect(inMemoryStaff).toHaveLength(1);
    });

    it('Ném lỗi ConflictException nếu hồ sơ nhân viên cho userId này đã tồn tại', async () => {
      await service.createStaffProfile({
        userId: userId.toString(),
        fullName: 'HLV Nguyen The Thao',
        phone: '0901234567',
        specialties: ['Gym'],
        hourlyRate: 300000,
        certifications: [],
        employmentStatus: StaffEmploymentStatus.ACTIVE,
      });

      await expect(
        service.createStaffProfile({
          userId: userId.toString(),
          fullName: 'Trùng user',
          phone: '0901234568',
          specialties: ['Yoga'],
          hourlyRate: 250000,
          certifications: [],
          employmentStatus: StaffEmploymentStatus.ACTIVE,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Cập nhật hồ sơ PT thành công', async () => {
      const created = await service.createStaffProfile({
        userId: userId.toString(),
        fullName: 'HLV A',
        phone: '0901234567',
        specialties: ['Gym'],
        hourlyRate: 300000,
        certifications: [],
        employmentStatus: StaffEmploymentStatus.ACTIVE,
      });

      const updated = await service.updateStaffProfile(created._id.toString(), {
        hourlyRate: 350000,
        specialties: ['Gym', 'Pilates'],
      });

      expect(updated.hourlyRate).toBe(350000);
      expect(updated.specialties).toContain('Pilates');
    });

    it('Phân ca làm việc cho nhân viên thành công', async () => {
      const shift = await service.createStaffShift({
        staffId: new Types.ObjectId().toString(),
        staffName: 'HLV A',
        shiftDate: new Date('2026-11-01'),
        shiftType: StaffShiftType.MORNING,
        startTime: '06:00',
        endTime: '14:00',
        note: 'Ca sáng phòng gym',
      });

      expect(shift.shiftType).toBe(StaffShiftType.MORNING);
      expect(inMemoryShifts).toHaveLength(1);
    });
  });

  describe('Attendance check-in & check-out', () => {
    beforeEach(async () => {
      await service.createStaffProfile({
        userId: userId.toString(),
        fullName: 'HLV Nguyen The Thao',
        phone: '0901234567',
        specialties: ['Gym'],
        hourlyRate: 300000,
        certifications: [],
        employmentStatus: StaffEmploymentStatus.ACTIVE,
      });
    });

    it('Chấm công check-in thành công và ghi nhận nhật ký', async () => {
      const attendance = await service.recordCheckIn(userId.toString(), {
        deviceIp: '192.168.1.50',
        location: 'Cửa kiểm soát tầng 2',
      });

      expect(attendance.checkInAt).toBeDefined();
      expect(attendance.deviceIp).toBe('192.168.1.50');
      expect(inMemoryAttendance).toHaveLength(1);
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('Chấm công check-out tính đúng số phút làm việc', async () => {
      // Check-in trước
      await service.recordCheckIn(userId.toString(), {});

      // Ép thời gian check-in về 2 giờ trước
      inMemoryAttendance[0].checkInAt = new Date(Date.now() - 2 * 3600 * 1000);

      const checkOut = await service.recordCheckOut(userId.toString(), {
        note: 'Hoàn tất ca làm',
      });

      expect(checkOut.checkOutAt).toBeDefined();
      expect(checkOut.totalWorkedMinutes).toBeGreaterThanOrEqual(119);
      expect(checkOut.totalWorkedMinutes).toBeLessThanOrEqual(121);
    });

    it('Ném lỗi BadRequestException nếu check-out khi chưa check-in', async () => {
      await expect(
        service.recordCheckOut(userId.toString(), {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
