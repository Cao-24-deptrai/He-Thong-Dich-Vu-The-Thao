import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
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
  ClassRegistrationStatus,
  PaymentMethod,
} from '@sports/shared';

describe('ClassManagementService', () => {
  let service: ClassManagementService;
  let mockTemplateModel: any;
  let mockSessionModel: any;
  let mockRegistrationModel: any;
  let mockUserModel: any;
  let mockComboService: any;
  let mockCashierShiftService: any;
  let mockAuditLogService: any;

  const inMemoryTemplates: any[] = [];
  const inMemorySessions: any[] = [];
  const inMemoryRegistrations: any[] = [];

  const customerId = new Types.ObjectId();
  const customerPhone = '0987654321';
  const trainerId = new Types.ObjectId();

  beforeEach(async () => {
    inMemoryTemplates.length = 0;
    inMemorySessions.length = 0;
    inMemoryRegistrations.length = 0;

    mockTemplateModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryTemplates.findIndex((t) => t._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryTemplates[idx] = { ...this };
        else inMemoryTemplates.push({ ...this });
        return this;
      }),
    }));

    mockTemplateModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryTemplates.find((t) => t._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryTemplates.findIndex((t) => t._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryTemplates[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockTemplateModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryTemplates),
    }));

    mockSessionModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemorySessions.findIndex((s) => s._id.toString() === this._id.toString());
        if (idx >= 0) inMemorySessions[idx] = { ...this };
        else inMemorySessions.push({ ...this });
        return this;
      }),
    }));

    mockSessionModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemorySessions.find((s) => s._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemorySessions.findIndex((s) => s._id.toString() === this._id.toString());
                if (idx >= 0) inMemorySessions[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockSessionModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemorySessions.find((s) => {
        if (query.templateId && s.templateId.toString() !== query.templateId.toString()) return false;
        if (query.date && s.date.toISOString().slice(0, 10) !== query.date.toISOString().slice(0, 10)) return false;
        if (query.startTime && s.startTime !== query.startTime) return false;
        return true;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockSessionModel.findOneAndUpdate = jest.fn().mockImplementation((query, update) => {
      const target = inMemorySessions.find((s) => {
        if (query._id && s._id.toString() !== query._id.toString()) return false;
        if (query.status && s.status !== query.status) return false;
        if (s.bookedCount >= s.capacity) return false;
        return true;
      });

      if (!target) return Promise.resolve(null);

      if (update.$inc?.bookedCount) {
        target.bookedCount += update.$inc.bookedCount;
      }
      return Promise.resolve({ ...target });
    });

    mockSessionModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemorySessions.find((s) => s._id.toString() === query._id.toString());
      if (target && update.$inc?.bookedCount) {
        target.bookedCount += update.$inc.bookedCount;
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    mockSessionModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemorySessions),
    }));

    mockSessionModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemorySessions.length),
    }));

    mockRegistrationModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryRegistrations.findIndex((r) => r._id.toString() === this._id.toString());
        if (idx >= 0) inMemoryRegistrations[idx] = { ...this };
        else inMemoryRegistrations.push({ ...this });
        return this;
      }),
    }));

    mockRegistrationModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryRegistrations.find((r) => {
        if (query.idempotencyKey && r.idempotencyKey === query.idempotencyKey) return true;
        if (
          query.sessionId &&
          query.customerId &&
          r.sessionId.toString() === query.sessionId.toString() &&
          r.customerId.toString() === query.customerId.toString() &&
          query.status?.$in?.includes(r.status)
        ) {
          return true;
        }
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockRegistrationModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryRegistrations.find((r) => r._id.toString() === id.toString());
      return Promise.resolve(
        found
          ? {
              ...found,
              save: jest.fn().mockImplementation(async function (this: any) {
                const idx = inMemoryRegistrations.findIndex((r) => r._id.toString() === this._id.toString());
                if (idx >= 0) inMemoryRegistrations[idx] = { ...this };
                return this;
              }),
            }
          : null,
      );
    });

    mockRegistrationModel.updateMany = jest.fn().mockImplementation((query, update) => {
      for (const r of inMemoryRegistrations) {
        if (r.sessionId.toString() === query.sessionId.toString() && query.status === r.status) {
          if (update.$set) Object.assign(r, update.$set);
        }
      }
      return Promise.resolve({ modifiedCount: inMemoryRegistrations.length });
    });

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        if (query.phone === customerPhone) {
          return Promise.resolve({
            _id: customerId,
            phone: customerPhone,
            fullName: 'Nguyen Thi Hoc Vien',
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

  describe('ClassTemplate & Session Generation', () => {
    it('Tạo mẫu lớp học định kỳ và tự động sinh buổi học', async () => {
      const template = await service.createTemplate({
        name: 'Yoga Buổi Sáng Năng Lượng',
        classType: ClassType.YOGA,
        trainerId: trainerId.toString(),
        trainerName: 'HLV Yoga Mai',
        capacity: 15,
        pricePerSession: 150000,
        durationMinutes: 60,
        daysOfWeek: [1, 3, 5], // T2, T4, T6
        startTime: '07:00',
        roomName: 'Phòng Studio 1',
        isActive: true,
      });

      expect(template.name).toBe('Yoga Buổi Sáng Năng Lượng');
      expect(inMemoryTemplates).toHaveLength(1);

      // Sinh các buổi học trong 1 tuần (từ Thứ 2 đến Chủ nhật)
      const sessions = await service.generateClassSessions({
        templateId: template._id.toString(),
        fromDate: new Date('2026-11-02'), // Thứ 2
        toDate: new Date('2026-11-08'), // Chủ nhật
      });

      // Thứ 2, Thứ 4, Thứ 6 -> sinh đúng 3 buổi
      expect(sessions).toHaveLength(3);
      expect(sessions[0]!.name).toBe('Yoga Buổi Sáng Năng Lượng');
      expect(sessions[0]!.bookedCount).toBe(0);
      expect(sessions[0]!.capacity).toBe(15);
    });
  });

  describe('Class Registration & Invariants', () => {
    let session: any;

    beforeEach(async () => {
      const template = await service.createTemplate({
        name: 'Zumba Dance Cháy Phố',
        classType: ClassType.ZUMBA,
        trainerId: trainerId.toString(),
        trainerName: 'HLV Zumba',
        capacity: 20,
        pricePerSession: 120000,
        durationMinutes: 60,
        daysOfWeek: [2, 4],
        startTime: '18:00',
      });

      const sessions = await service.generateClassSessions({
        templateId: template._id.toString(),
        fromDate: new Date('2026-11-03'),
        toDate: new Date('2026-11-04'),
      });
      session = sessions[0];
    });

    it('Bất biến SPEC Rule 3: Từ chối thanh toán ví nội bộ cho học phí lớp học (WALLET_PAYMENT_FORBIDDEN_FOR_CLASS)', async () => {
      await expect(
        service.registerClassSession('cust-user', {
          sessionId: session._id.toString(),
          customerPhone,
          paymentMethod: PaymentMethod.INTERNAL_WALLET,
          idempotencyKey: 'idemp-class-wallet-fail',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Đăng ký lớp học thành công bằng Tiền mặt tại quầy và ghi nhận doanh thu ca thu ngân', async () => {
      const reg = await service.registerClassSession('cashier-user', {
        sessionId: session._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-class-cash-success',
      });

      expect(reg.status).toBe(ClassRegistrationStatus.REGISTERED);
      expect(reg.pricePaid).toBe(120000);
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        expect.any(String),
        120000,
        PaymentMethod.CASH,
      );

      // Booked count trên session tăng từ 0 lên 1
      expect(inMemorySessions[0].bookedCount).toBe(1);
    });

    it('Đăng ký lớp học thành công bằng cách khấu trừ từ Gói Combo', async () => {
      const pkgId = new Types.ObjectId().toString();

      const reg = await service.registerClassSession('cust-user', {
        sessionId: session._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.VIETQR,
        userPackageId: pkgId,
        idempotencyKey: 'idemp-class-combo-success',
      });

      expect(reg.pricePaid).toBe(0);
      expect(mockComboService.deductPackageItem).toHaveBeenCalled();
    });

    it('Từ chối khi cùng một khách hàng cố tình đăng ký 2 lần cho cùng một buổi học (ALREADY_REGISTERED_FOR_CLASS)', async () => {
      await service.registerClassSession('cashier-user', {
        sessionId: session._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-first-reg',
      });

      await expect(
        service.registerClassSession('cashier-user', {
          sessionId: session._id.toString(),
          customerPhone,
          paymentMethod: PaymentMethod.CASH,
          idempotencyKey: 'idemp-second-reg',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Từ chối đăng ký khi lớp học đã đủ sức chứa (CLASS_FULL)', async () => {
      // Giả lập lớp đã đầy (20/20)
      inMemorySessions[0].bookedCount = 20;

      await expect(
        service.registerClassSession('cashier-user', {
          sessionId: session._id.toString(),
          customerPhone,
          paymentMethod: PaymentMethod.CASH,
          idempotencyKey: 'idemp-full-reg',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cancellation & Check-in', () => {
    let session: any;
    let registration: any;

    beforeEach(async () => {
      const template = await service.createTemplate({
        name: 'Pilates Core',
        classType: ClassType.PILATES,
        trainerId: trainerId.toString(),
        trainerName: 'HLV Pilates',
        capacity: 10,
        pricePerSession: 200000,
        durationMinutes: 60,
        daysOfWeek: [1],
        startTime: '19:00',
      });

      // Tạo buổi học diễn ra sau 24 giờ kể từ bây giờ (đủ điều kiện hủy)
      const futureDate = new Date(Date.now() + 24 * 3600 * 1000);
      const sessions = await service.generateClassSessions({
        templateId: template._id.toString(),
        fromDate: futureDate,
        toDate: futureDate,
      });

      session = sessions[0] || (await new mockSessionModel({
        templateId: template._id,
        name: template.name,
        classType: template.classType,
        trainerId: template.trainerId,
        trainerName: template.trainerName,
        date: futureDate,
        startTime: '19:00',
        endTime: '20:00',
        capacity: 10,
        bookedCount: 0,
        pricePerSession: 200000,
        status: ClassSessionStatus.SCHEDULED,
      }).save());

      registration = await service.registerClassSession('cust-user', {
        sessionId: session._id.toString(),
        customerPhone,
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-cancel-test',
      });
    });

    it('Hủy đăng ký lớp học trước 12 giờ thành công và nhả 1 suất trên session', async () => {
      expect(inMemorySessions[0].bookedCount).toBe(1);

      const cancelled = await service.cancelRegistration(customerId.toString(), {
        registrationId: registration._id.toString(),
        reason: 'Bận việc đột xuất',
      });

      expect(cancelled.status).toBe(ClassRegistrationStatus.CANCELLED);
      expect(inMemorySessions[0].bookedCount).toBe(0);
    });

    it('Từ chối hủy đăng ký nếu thời gian đến giờ bắt đầu nhỏ hơn 12 giờ (CANCELLATION_CUTOFF_EXCEEDED)', async () => {
      // Ép thời gian buổi học diễn ra trong 2 giờ tới
      const currentH = new Date().getHours() + 2;
      const targetSession = inMemorySessions.find((s) => s._id.toString() === session._id.toString());
      if (targetSession) {
        targetSession.date = new Date();
        targetSession.startTime = `${String(currentH % 24).padStart(2, '0')}:00`;
      }

      await expect(
        service.cancelRegistration(customerId.toString(), {
          registrationId: registration._id.toString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Quản trị viên hủy toàn bộ buổi học thì chuyển session sang CANCELLED và hủy tất cả học viên', async () => {
      const cancelledSession = await service.cancelClassSession(
        'admin-user',
        session._id.toString(),
        'HLV bị ốm đột xuất',
      );

      expect(cancelledSession.status).toBe(ClassSessionStatus.CANCELLED);
      expect(inMemoryRegistrations[0].status).toBe(ClassRegistrationStatus.CANCELLED);
    });

    it('Điểm danh học viên khi vào lớp thành công', async () => {
      const checkedIn = await service.checkInAttendee({
        registrationId: registration._id.toString(),
      });

      expect(checkedIn.status).toBe(ClassRegistrationStatus.CHECKED_IN);
      expect(checkedIn.checkedInAt).toBeDefined();
    });
  });
});
