import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClassManagementService } from './class-management.service.js';
import { ClassTemplate } from '../schemas/class-template.schema.js';
import { ClassSession } from '../schemas/class-session.schema.js';
import { ClassRegistration } from '../schemas/class-registration.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { ComboPackageService } from '../../promotion/services/combo-package.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  ClassType,
  ClassSessionStatus,
  PaymentMethod,
} from '@sports/shared';

describe('ClassManagementService Concurrency Defense (20 Concurrent Customers for 2 Last Class Slots Race)', () => {
  let service: ClassManagementService;

  const inMemorySessions: any[] = [];
  const inMemoryRegistrations: any[] = [];
  const sessionId = new Types.ObjectId();

  beforeEach(async () => {
    inMemorySessions.length = 0;
    inMemoryRegistrations.length = 0;

    // Khởi tạo buổi học có sức chứa 20, hiện tại đã có 18 người (chỉ còn đúng 2 chỗ)
    inMemorySessions.push({
      _id: sessionId,
      templateId: new Types.ObjectId(),
      name: 'Yoga Sunset VIP',
      classType: ClassType.YOGA,
      trainerId: new Types.ObjectId(),
      trainerName: 'HLV Yoga',
      date: new Date(Date.now() + 86400000),
      startTime: '17:30',
      endTime: '18:30',
      capacity: 20,
      bookedCount: 18,
      pricePerSession: 150000,
      status: ClassSessionStatus.SCHEDULED,
    });

    let lock = Promise.resolve();

    const mockSessionModel: any = {
      findById: jest.fn().mockImplementation((id) => {
        const found = inMemorySessions.find((s) => s._id.toString() === id.toString());
        return Promise.resolve(found ? { ...found } : null);
      }),
      findOneAndUpdate: jest.fn().mockImplementation((query, update, options) => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            // Thêm jitter mô phỏng độ trễ luồng
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

            const target = inMemorySessions.find((s) => {
              if (query._id && s._id.toString() !== query._id.toString()) return false;
              if (query.status && s.status !== query.status) return false;
              if (s.bookedCount >= s.capacity) return false;
              return true;
            });

            if (!target) return resolve(null);

            if (update.$inc?.bookedCount) {
              target.bookedCount += update.$inc.bookedCount;
            }

            resolve(options?.new ? { ...target } : { ...target });
          });
        });
      }),
      updateOne: jest.fn().mockImplementation((query, update) => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            const target = inMemorySessions.find((s) => s._id.toString() === query._id.toString());
            if (target && update.$inc?.bookedCount) {
              target.bookedCount += update.$inc.bookedCount;
            }
            resolve({ modifiedCount: target ? 1 : 0 });
          });
        });
      }),
    };

    const mockRegistrationModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            inMemoryRegistrations.push({ ...this });
            resolve(this);
          });
        });
      }),
    }));

    mockRegistrationModel.findOne = jest.fn().mockImplementation(() => Promise.resolve(null));

    const mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        return Promise.resolve({
          _id: new Types.ObjectId(),
          phone: query.phone,
          fullName: `Khách Hàng ${query.phone}`,
        });
      }),
    };

    const mockTemplateModel = {};
    const mockComboService = {};
    const mockCashierShiftService = {
      getActiveShift: jest.fn().mockResolvedValue(null),
    };
    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassManagementService,
        { provide: getModelToken(ClassTemplate.name), useValue: mockTemplateModel },
        { provide: getModelToken(ClassSession.name), useValue: mockSessionModel },
        { provide: getModelToken(ClassRegistration.name), useValue: mockRegistrationModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: ComboPackageService, useValue: mockComboService },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ClassManagementService>(ClassManagementService);
  });

  it('20 học viên đồng thời đăng ký tranh 2 suất cuối cùng -> Đúng 2 người thành công, 18 người bị từ chối CLASS_FULL, bookedCount = 20', async () => {
    const totalRequests = 20;

    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map((_, index) => {
        const phone = `09870000${String(index + 1).padStart(2, '0')}`;
        return service.registerClassSession('cashier-pos', {
          sessionId: sessionId.toString(),
          customerPhone: phone,
          paymentMethod: PaymentMethod.VIETQR,
          idempotencyKey: `idemp-race-class-${index + 1}`,
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến: Đúng 2 người đăng ký thành công
    expect(succeeded).toHaveLength(2);
    expect(failed).toHaveLength(18);

    // Xác minh 18 người thất bại đều nhận mã lỗi CLASS_FULL
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('CLASS_FULL');
      }
    }

    // Bất biến: bookedCount đạt tối đa đúng bằng capacity (20), không bao giờ vượt ngưỡng (oversell)
    expect(inMemorySessions[0].bookedCount).toBe(20);

    // Bất biến: Đúng 2 bản ghi đăng ký được ghi nhận
    expect(inMemoryRegistrations).toHaveLength(2);
  });
});
