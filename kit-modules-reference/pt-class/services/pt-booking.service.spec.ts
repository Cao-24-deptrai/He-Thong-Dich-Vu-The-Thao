import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PtBookingService } from './pt-booking.service.js';
import { PtBookingSession } from '../schemas/pt-booking-session.schema.js';
import { ClassSession } from '../schemas/class-session.schema.js';
import { StaffProfile } from '../schemas/staff-profile.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { ComboPackageService } from '../../promotion/services/combo-package.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  PtSessionStatus,
  ClassSessionStatus,
  PaymentMethod,
  StaffEmploymentStatus,
} from '@sports/shared';

describe('PtBookingService', () => {
  let service: PtBookingService;
  let mockPtSessionModel: any;
  let mockClassSessionModel: any;
  let mockStaffModel: any;
  let mockUserModel: any;
  let mockComboService: any;
  let mockCashierShiftService: any;
  let mockAuditLogService: any;

  const inMemoryPtSessions: any[] = [];
  const inMemoryClassSessions: any[] = [];
  const inMemoryStaff: any[] = [];

  const trainerUserId = new Types.ObjectId();
  const trainerProfileId = new Types.ObjectId();
  const otherTrainerUserId = new Types.ObjectId();
  const otherTrainerProfileId = new Types.ObjectId();
  const customerId = new Types.ObjectId();
  const customerPhone = '0911223344';

  beforeEach(async () => {
    inMemoryPtSessions.length = 0;
    inMemoryClassSessions.length = 0;
    inMemoryStaff.length = 0;

    // Seed PT Profile
    inMemoryStaff.push({
      _id: trainerProfileId,
      userId: trainerUserId,
      fullName: 'HLV Vu The Thao',
      phone: '0909998877',
      hourlyRate: 400000,
      employmentStatus: StaffEmploymentStatus.ACTIVE,
    });

    inMemoryStaff.push({
      _id: otherTrainerProfileId,
      userId: otherTrainerUserId,
      fullName: 'HLV Khac',
      phone: '0901112233',
      hourlyRate: 350000,
      employmentStatus: StaffEmploymentStatus.ACTIVE,
    });

    mockPtSessionModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryPtSessions.findIndex((s) => s._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryPtSessions[idx] = { ...this };
        else inMemoryPtSessions.push({ ...this });
        return this;
      }),
    }));

    mockPtSessionModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryPtSessions.find((s) => {
        if (query.idempotencyKey && s.idempotencyKey === query.idempotencyKey) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockPtSessionModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryPtSessions.find((s) => s._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryPtSessions.findIndex((s) => s._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryPtSessions[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockPtSessionModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        let results = [...inMemoryPtSessions];
        if (query?.trainerId) {
          results = results.filter((s) => s.trainerId.toString() === query.trainerId.toString());
        }
        if (query?.customerId) {
          results = results.filter((s) => s.customerId.toString() === query.customerId.toString());
        }
        if (query?.status?.$in) {
          results = results.filter((s) => query.status.$in.includes(s.status));
        } else if (query?.status) {
          results = results.filter((s) => s.status === query.status);
        }
        return Promise.resolve(results);
      }),
    }));

    mockPtSessionModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryPtSessions.length),
    }));

    mockClassSessionModel = {
      find: jest.fn().mockImplementation((query) => ({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockImplementation(() => {
          let results = [...inMemoryClassSessions];
          if (query?.trainerId) {
            results = results.filter((s) => s.trainerId.toString() === query.trainerId.toString());
          }
          if (query?.status?.$in) {
            results = results.filter((s) => query.status.$in.includes(s.status));
          } else if (query?.status) {
            results = results.filter((s) => s.status === query.status);
          }
          return Promise.resolve(results);
        }),
      })),
    };

    mockStaffModel = {
      findById: jest.fn().mockImplementation((id) => {
        const found = inMemoryStaff.find((s) => s._id.toString() === id.toString());
        return Promise.resolve(found || null);
      }),
      findOne: jest.fn().mockImplementation((query) => {
        if (query.userId) {
          const found = inMemoryStaff.find((s) => s.userId.toString() === query.userId.toString());
          return Promise.resolve(found || null);
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(inMemoryStaff),
      })),
    };

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        if (query.phone === customerPhone) {
          return Promise.resolve({
            _id: customerId,
            phone: customerPhone,
            fullName: 'Nguyen Thi Hoc Vien PT',
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockComboService = {
      deductPackageItem: jest.fn().mockResolvedValue({ success: true }),
    };

    mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      recordOrderSales: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PtBookingService,
        { provide: getModelToken(PtBookingSession.name), useValue: mockPtSessionModel },
        { provide: getModelToken(ClassSession.name), useValue: mockClassSessionModel },
        { provide: getModelToken(StaffProfile.name), useValue: mockStaffModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: ComboPackageService, useValue: mockComboService },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<PtBookingService>(PtBookingService);
  });

  describe('bookPtSession & Invariants', () => {
    it('Bất biến SPEC Rule 3: Từ chối thanh toán ví nội bộ cho buổi tập PT (WALLET_PAYMENT_FORBIDDEN_FOR_PT)', async () => {
      await expect(
        service.bookPtSession('cust-user', {
          trainerId: trainerProfileId.toString(),
          customerPhone,
          date: new Date('2026-11-05'),
          startTime: '08:00',
          durationMinutes: 60,
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          idempotencyKey: 'idemp-pt-wallet-fail',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Đặt lịch PT 1-1 thành công và tính giá theo giờ của PT', async () => {
      const session = await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date('2026-11-05'),
        startTime: '08:00',
        durationMinutes: 90, // 1.5 giờ -> 400k * 1.5 = 600,000 VND
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-pt-cash-success',
      });

      expect(session.sessionCode).toContain('PT-');
      expect(session.pricePaid).toBe(600000);
      expect(session.endTime).toBe('09:30');
      expect(session.status).toBe(PtSessionStatus.BOOKED);
      expect(inMemoryPtSessions).toHaveLength(1);
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        expect.any(String),
        600000,
        PaymentMethod.CASH,
      );
    });

    it('Bất biến Rule 1: Từ chối đặt lịch nếu PT bị trùng giờ với một buổi PT 1-1 khác (TRAINER_TIME_CONFLICT)', async () => {
      // Đặt buổi 1: 08:00 -> 09:00
      await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date('2026-11-05'),
        startTime: '08:00',
        durationMinutes: 60,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-pt-session-1',
      });

      // Đặt buổi 2 cố tình trùng giờ (08:30 -> 09:30)
      await expect(
        service.bookPtSession('cashier-user', {
          trainerId: trainerProfileId.toString(),
          customerPhone,
          date: new Date('2026-11-05'),
          startTime: '08:30',
          durationMinutes: 60,
          paymentMethod: PaymentMethod.VIETQR,
          idempotencyKey: 'idemp-pt-session-2-conflict',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Bất biến Rule 1: Từ chối đặt lịch nếu PT đang bận dạy một lớp học nhóm (TRAINER_TIME_CONFLICT)', async () => {
      // Giả lập PT đang có lớp học nhóm từ 10:00 -> 11:00
      inMemoryClassSessions.push({
        _id: new Types.ObjectId(),
        trainerId: trainerProfileId,
        name: 'Lớp Yoga Trưa',
        date: new Date('2026-11-05'),
        startTime: '10:00',
        endTime: '11:00',
        status: ClassSessionStatus.SCHEDULED,
      });

      // Đặt buổi PT từ 10:30 -> 11:30
      await expect(
        service.bookPtSession('cashier-user', {
          trainerId: trainerProfileId.toString(),
          customerPhone,
          date: new Date('2026-11-05'),
          startTime: '10:30',
          durationMinutes: 60,
          paymentMethod: PaymentMethod.VIETQR,
          idempotencyKey: 'idemp-pt-class-conflict',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Xử lý Idempotency Replay không tạo thêm buổi tập khi gửi trùng idempotencyKey', async () => {
      const first = await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date('2026-11-06'),
        startTime: '14:00',
        durationMinutes: 60,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-replay-key',
      });

      const second = await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date('2026-11-06'),
        startTime: '14:00',
        durationMinutes: 60,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-replay-key',
      });

      expect(first._id.toString()).toBe(second._id.toString());
      expect(inMemoryPtSessions).toHaveLength(1);
    });
  });

  describe('Trainer Privacy & Completion', () => {
    let bookedSession: any;

    beforeEach(async () => {
      bookedSession = await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date('2026-11-05'),
        startTime: '15:00',
        durationMinutes: 60,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-pt-complete-test',
      });
    });

    it('PT hoàn thành buổi dạy, ghi chú giáo án thể lực và cập nhật tiền thưởng', async () => {
      const completed = await service.completePtSession(
        trainerUserId.toString(),
        bookedSession._id.toString(),
        {
          fitnessNotes: 'Học viên squat 50kg, thể lực tốt',
          bonusAmount: 50000,
        },
      );

      expect(completed.status).toBe(PtSessionStatus.COMPLETED);
      expect(completed.fitnessNotes).toContain('squat 50kg');
      expect(completed.bonusAmount).toBe(50000);
      expect(completed.completedAt).toBeDefined();
    });

    it('Bất biến PT Data Privacy: Từ chối cho HLV khác can thiệp hoặc hoàn tất buổi tập không thuộc mình phụ trách', async () => {
      await expect(
        service.completePtSession(
          otherTrainerUserId.toString(),
          bookedSession._id.toString(),
          { fitnessNotes: 'Can thiệp trái phép' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Tra cứu lịch dạy cá nhân của PT chính xác', async () => {
      const schedule = await service.findTrainerSchedule(trainerUserId.toString());
      expect(schedule.ptSessions).toHaveLength(1);
      expect(schedule.classSessions).toHaveLength(0);
    });
  });

  describe('Monthly Trainer Report', () => {
    it('Tổng hợp báo cáo số ca dạy, giờ PT và thưởng theo tháng cho kế toán', async () => {
      // Đặt và hoàn thành 1 buổi PT cho HLV Vu The Thao vào tháng 11/2026
      const s = await service.bookPtSession('cashier-user', {
        trainerId: trainerProfileId.toString(),
        customerPhone,
        date: new Date(2026, 10, 5), // Tháng 11 (0-indexed 10)
        startTime: '16:00',
        durationMinutes: 60,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-report-pt',
      });

      await service.completePtSession(trainerUserId.toString(), s._id.toString(), {
        bonusAmount: 100000,
      });

      const report = await service.getMonthlyTrainerReport({
        month: 11,
        year: 2026,
      });

      expect(report.month).toBe(11);
      expect(report.overallPtSessionsCompleted).toBe(1);
      expect(report.overallBonusAmount).toBe(100000);
      expect(report.trainers[0]!.trainerName).toBe('HLV Vu The Thao');
      expect(report.trainers[0]!.totalBonusAmount).toBe(100000);
    });
  });
});
