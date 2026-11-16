import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GamingSessionService } from './gaming-session.service.js';
import { GamingSession } from '../schemas/gaming-session.schema.js';
import { GamingMachine } from '../schemas/gaming-machine.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { GamingMachineService } from './gaming-machine.service.js';
import { GamingPricingService } from './gaming-pricing.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  GamingMachineStatus,
  GamingSessionStatus,
  GamingMachineZone,
} from '@sports/shared';

describe('GamingSessionService Concurrency Defense (20 Concurrent Logins on Same Account Race)', () => {
  let service: GamingSessionService;

  const inMemorySessions: any[] = [];
  const inMemoryMachines: any[] = [];
  const customerId = new Types.ObjectId();
  const customerPhone = '0988888888';

  beforeEach(async () => {
    inMemorySessions.length = 0;
    inMemoryMachines.length = 0;

    // Khởi tạo 20 máy tính trạm đang rảnh (PC-01 -> PC-20)
    for (let i = 1; i <= 20; i++) {
      const code = `PC-${String(i).padStart(2, '0')}`;
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: code,
        zone: GamingMachineZone.STANDARD,
        status: GamingMachineStatus.IDLE,
        hourlyPrice: 15000,
        isActive: true,
      });
    }

    // Mô phỏng Document-level serialization của MongoDB engine với Unique Partial Index trên active session
    let lock = Promise.resolve();

    const mockSessionModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      status: data.status || GamingSessionStatus.ACTIVE,
      save: jest.fn().mockImplementation(async function (this: any) {
        return new Promise((resolve, reject) => {
          lock = lock.then(async () => {
            const hasActive = inMemorySessions.some(
              (s) =>
                s.customerId.toString() === this.customerId.toString() &&
                [
                  GamingSessionStatus.STARTING,
                  GamingSessionStatus.ACTIVE,
                  GamingSessionStatus.OFFLINE_GRACE,
                  GamingSessionStatus.LOCKED,
                ].includes(s.status),
            );

            if (hasActive) {
              const dupError: any = new Error('E11000 duplicate key error collection: gaming_sessions index: customerId_1');
              dupError.code = 11000;
              return reject(dupError);
            }

            inMemorySessions.push({ ...this });
            resolve(this);
          });
        });
      }),
    }));

    mockSessionModel.findOne = jest.fn().mockImplementation((query) => {
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          // Thêm jitter ngẫu nhiên mô phỏng độ trễ mạng thực tế giữa các luồng
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

          const found = inMemorySessions.find((s) => {
            if (query.customerId && s.customerId.toString() === query.customerId.toString()) {
              if (query.status?.$in && query.status.$in.includes(s.status)) return true;
            }
            return false;
          });

          resolve(found ? { ...found } : null);
        });
      });
    });

    const mockMachineModel: any = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update, options) => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            const idx = inMemoryMachines.findIndex((m) => {
              if (query.machineCode && m.machineCode !== query.machineCode) return false;
              if (query.status && m.status !== query.status) return false;
              if (query.isActive !== undefined && m.isActive !== query.isActive) return false;
              return true;
            });

            if (idx < 0) return resolve(null);

            const target = inMemoryMachines[idx];
            if (update.$set) {
              Object.assign(target, update.$set);
            }
            inMemoryMachines[idx] = target;

            resolve(options?.new ? { ...target } : { ...target });
          });
        });
      }),
      updateOne: jest.fn().mockImplementation((query, update) => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            const target = inMemoryMachines.find((m) => {
              if (query._id && m._id.toString() === query._id.toString()) return true;
              return false;
            });
            if (target && update.$set) {
              Object.assign(target, update.$set);
            }
            resolve({ modifiedCount: target ? 1 : 0 });
          });
        });
      }),
    };

    const mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        if (query.phone === customerPhone) {
          return Promise.resolve({
            _id: customerId,
            phone: customerPhone,
            fullName: 'Vận Động Viên Gaming',
          });
        }
        return Promise.resolve(null);
      }),
    };

    const mockMachineService = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      recordHeartbeat: jest.fn().mockResolvedValue(undefined),
    };

    const mockPricingService = {
      calculateSessionCost: jest.fn().mockResolvedValue({ totalMinutes: 15, totalCost: 3750 }),
      calculateHoldAmountForMinutes: jest.fn().mockResolvedValue(3750),
    };

    const mockWalletService = {
      hold: jest.fn().mockResolvedValue({ success: true }),
      settle: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockSettingsService = {
      get: jest.fn().mockImplementation((_k, def) => def),
    };

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamingSessionService,
        { provide: getModelToken(GamingSession.name), useValue: mockSessionModel },
        { provide: getModelToken(GamingMachine.name), useValue: mockMachineModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: GamingMachineService, useValue: mockMachineService },
        { provide: GamingPricingService, useValue: mockPricingService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<GamingSessionService>(GamingSessionService);
  });

  it('20 yêu cầu mở phiên đồng thời từ cùng 1 tài khoản trên 20 máy khác nhau -> Đúng 1 phiên thành công, 19 phiên bị từ chối ACCOUNT_ALREADY_IN_SESSION', async () => {
    const totalRequests = 20;

    // Kích hoạt đồng thời 20 lượt đăng nhập mở phiên trên 20 máy khác nhau (PC-01 đến PC-20)
    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map((_, index) => {
        const machineCode = `PC-${String(index + 1).padStart(2, '0')}`;
        return service.startSession('cashier-pos', {
          machineCode,
          customerPhone,
          authMethod: 'PASSWORD',
          idempotencyKey: `idemp-race-${index + 1}-${Date.now()}`,
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến SPEC Rule 1: Chính xác duy nhất 1 phiên thành công và 19 phiên thất bại
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(19);

    // Xác minh toàn bộ 19 phiên thất bại đều có mã lỗi ACCOUNT_ALREADY_IN_SESSION
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('ACCOUNT_ALREADY_IN_SESSION');
      }
    }

    // Cơ sở dữ liệu chỉ có duy nhất 1 phiên được tạo
    expect(inMemorySessions).toHaveLength(1);

    // Chỉ có đúng 1 máy tính trạm chuyển sang trạng thái IN_USE, 19 máy còn lại giữ nguyên IDLE
    const inUseMachines = inMemoryMachines.filter((m) => m.status === GamingMachineStatus.IN_USE);
    const idleMachines = inMemoryMachines.filter((m) => m.status === GamingMachineStatus.IDLE);
    expect(inUseMachines).toHaveLength(1);
    expect(idleMachines).toHaveLength(19);
  });
});
