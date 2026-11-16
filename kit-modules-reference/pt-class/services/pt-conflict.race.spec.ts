import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
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
  PaymentMethod,
  StaffEmploymentStatus,
} from '@sports/shared';

describe('PtBookingService Concurrency Defense (10 Concurrent Customers Booking Same Trainer Slot Race)', () => {
  let service: PtBookingService;

  const inMemoryPtSessions: any[] = [];
  const trainerProfileId = new Types.ObjectId();
  const trainerUserId = new Types.ObjectId();

  beforeEach(async () => {
    inMemoryPtSessions.length = 0;

    let lock = Promise.resolve();

    const mockPtSessionModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        return new Promise((resolve, reject) => {
          lock = lock.then(async () => {
            // Kiểm tra xung đột trước khi commit (chống double booking ở mức CSDL)
            const hasConflict = inMemoryPtSessions.some((s) => {
              if (s.trainerId.toString() !== this.trainerId.toString()) return false;
              if (s.date.toISOString().slice(0, 10) !== this.date.toISOString().slice(0, 10)) return false;
              if (![PtSessionStatus.BOOKED, PtSessionStatus.IN_PROGRESS].includes(s.status)) return false;
              // Xung đột khung giờ
              return this.startTime < s.endTime && this.endTime > s.startTime;
            });

            if (hasConflict) {
              const conflictErr = new BadRequestException({
                code: 'TRAINER_TIME_CONFLICT',
                message: 'Huấn luyện viên đã có lịch dạy PT 1-1 khác vào khung giờ này',
              });
              return reject(conflictErr);
            }

            inMemoryPtSessions.push({ ...this });
            resolve(this);
          });
        });
      }),
    }));

    mockPtSessionModel.findOne = jest.fn().mockImplementation(() => Promise.resolve(null));

    mockPtSessionModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
            resolve([...inMemoryPtSessions]);
          });
        });
      }),
    }));

    const mockClassSessionModel = {
      find: jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockStaffModel = {
      findById: jest.fn().mockImplementation((id) => {
        if (id.toString() === trainerProfileId.toString()) {
          return Promise.resolve({
            _id: trainerProfileId,
            userId: trainerUserId,
            fullName: 'HLV Vu The Thao',
            hourlyRate: 400000,
            employmentStatus: StaffEmploymentStatus.ACTIVE,
          });
        }
        return Promise.resolve(null);
      }),
    };

    const mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        return Promise.resolve({
          _id: new Types.ObjectId(),
          phone: query.phone,
          fullName: `Học Viên ${query.phone}`,
        });
      }),
    };

    const mockComboService = {};
    const mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue(null),
    };
    const mockAuditLogService = {
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

  it('10 khách hàng đồng thời đặt lịch cho cùng 1 HLV vào khung giờ 09:00 - 10:00 -> Đúng 1 người thành công, 9 người bị từ chối TRAINER_TIME_CONFLICT', async () => {
    const totalRequests = 10;

    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map((_, index) => {
        const phone = `09110000${String(index + 1).padStart(2, '0')}`;
        return service.bookPtSession('cust-user', {
          trainerId: trainerProfileId.toString(),
          customerPhone: phone,
          date: new Date('2026-11-10'),
          startTime: '09:00',
          durationMinutes: 60,
          paymentMethod: PaymentMethod.VIETQR,
          idempotencyKey: `idemp-race-pt-${index + 1}`,
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến: Đúng 1 người đặt được lịch, 9 người bị từ chối do xung đột
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);

    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('TRAINER_TIME_CONFLICT');
      }
    }

    // Bất biến: Cơ sở dữ liệu chỉ có duy nhất 1 buổi PT được ghi nhận
    expect(inMemoryPtSessions).toHaveLength(1);
  });
});
