import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  GamingRemoteAction,
  WalletCategory,
} from '@sports/shared';

describe('GamingSessionService', () => {
  let service: GamingSessionService;
  let mockSessionModel: any;
  let mockMachineModel: any;
  let mockUserModel: any;
  let mockMachineService: any;
  let mockPricingService: any;
  let mockWalletService: any;
  let mockSettingsService: any;
  let mockAuditLogService: any;

  const inMemorySessions: any[] = [];
  const inMemoryMachines: any[] = [];
  const inMemoryUsers: any[] = [];

  beforeEach(async () => {
    inMemorySessions.length = 0;
    inMemoryMachines.length = 0;
    inMemoryUsers.length = 0;

    mockSessionModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      status: data.status || GamingSessionStatus.STARTING,
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemorySessions.findIndex((s) => s._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemorySessions[idx] = { ...this };
        } else {
          inMemorySessions.push({ ...this });
        }
        return this;
      }),
    }));

    mockSessionModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemorySessions.find((s) => {
        if (query.idempotencyKey && s.idempotencyKey === query.idempotencyKey) return true;
        if (query.customerId && s.customerId.toString() === query.customerId.toString()) {
          if (query.status?.$in && query.status.$in.includes(s.status)) return true;
        }
        return false;
      });
      return Promise.resolve(found ? { ...found } : null);
    });

    mockSessionModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemorySessions.find(
        (s) => s._id.toString() === id.toString() || s.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemorySessions.findIndex((s) => s._id.toString() === this._id.toString());
          if (idx >= 0) inMemorySessions[idx] = { ...this };
          return this;
        }),
      });
    });

    mockSessionModel.find = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemorySessions),
    }));

    mockMachineModel = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update, options) => {
        const idx = inMemoryMachines.findIndex((m) => {
          if (query.machineCode && m.machineCode !== query.machineCode) return false;
          if (query.status && m.status !== query.status) return false;
          if (query.isActive !== undefined && m.isActive !== query.isActive) return false;
          return true;
        });

        if (idx < 0) return Promise.resolve(null);

        const target = inMemoryMachines[idx];
        if (update.$set) {
          Object.assign(target, update.$set);
        }
        inMemoryMachines[idx] = target;

        return Promise.resolve(
          options?.new ? { ...target } : { ...target },
        );
      }),
      updateOne: jest.fn().mockImplementation((query, update) => {
        const target = inMemoryMachines.find((m) => {
          if (query._id && m._id.toString() === query._id.toString()) return true;
          if (query.machineCode && m.machineCode === query.machineCode) return true;
          return false;
        });
        if (target && update.$set) {
          Object.assign(target, update.$set);
        }
        return Promise.resolve({ modifiedCount: target ? 1 : 0 });
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(inMemoryMachines.length),
      }),
    };

    mockUserModel = {
      findOne: jest.fn().mockImplementation((query) => {
        const found = inMemoryUsers.find((u) => u.phone === query.phone);
        return Promise.resolve(found ? { ...found } : null);
      }),
    };

    mockMachineService = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const found = inMemoryMachines.find(
          (m) => m._id.toString() === id.toString() || m.id === id.toString(),
        );
        if (!found) throw new NotFoundException('Không tìm thấy máy');
        return found;
      }),
      findByCode: jest.fn().mockImplementation(async (code: string) => {
        const found = inMemoryMachines.find(
          (m) => m.machineCode === code.trim().toUpperCase(),
        );
        return found || null;
      }),
      recordHeartbeat: jest.fn().mockResolvedValue(undefined),
    };

    mockPricingService = {
      calculateSessionCost: jest.fn().mockResolvedValue({
        totalMinutes: 15,
        totalCost: 3750,
      }),
      calculateHoldAmountForMinutes: jest.fn().mockResolvedValue(3750),
    };

    mockWalletService = {
      hold: jest.fn().mockResolvedValue({ success: true }),
      release: jest.fn().mockResolvedValue({ success: true }),
      settle: jest.fn().mockResolvedValue({ success: true }),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((_key: string, defaultValue: any) => defaultValue),
    };

    mockAuditLogService = {
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

  describe('startSession', () => {
    it('should return existing session on idempotency replay', async () => {
      const existingSession = {
        _id: new Types.ObjectId(),
        sessionCode: 'GMS-20261026-REPLAY',
        idempotencyKey: 'idemp-start-1',
        status: GamingSessionStatus.ACTIVE,
      };
      inMemorySessions.push(existingSession);

      const result = await service.startSession('cashier-1', {
        machineCode: 'PC-01',
        customerPhone: '0901234567',
        authMethod: 'PASSWORD',
        idempotencyKey: 'idemp-start-1',
      });

      expect(result.sessionCode).toBe('GMS-20261026-REPLAY');
      expect(mockWalletService.hold).not.toHaveBeenCalled();
    });

    it('should throw CUSTOMER_NOT_FOUND if phone is not registered', async () => {
      await expect(
        service.startSession('cashier-1', {
          machineCode: 'PC-01',
          customerPhone: '0999999999',
          authMethod: 'PASSWORD',
          idempotencyKey: 'idemp-start-2',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce SPEC Rule 1: reject if customer already has an active session', async () => {
      const customerId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: customerId,
        phone: '0901234567',
        fullName: 'Nguyễn Văn Đang Chơi',
      });

      inMemorySessions.push({
        _id: new Types.ObjectId(),
        customerId,
        machineCode: 'PC-VIP-01',
        status: GamingSessionStatus.ACTIVE,
      });

      await expect(
        service.startSession('cashier-1', {
          machineCode: 'PC-02',
          customerPhone: '0901234567',
          authMethod: 'PASSWORD',
          idempotencyKey: 'idemp-start-3',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw MACHINE_NOT_AVAILABLE if machine is not IDLE', async () => {
      const customerId = new Types.ObjectId();
      inMemoryUsers.push({
        _id: customerId,
        phone: '0901234567',
        fullName: 'Nguyễn Văn A',
      });

      // Machine is IN_USE
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: 'PC-BUSY',
        status: GamingMachineStatus.IN_USE,
        isActive: true,
      });

      await expect(
        service.startSession('cashier-1', {
          machineCode: 'PC-BUSY',
          customerPhone: '0901234567',
          authMethod: 'PASSWORD',
          idempotencyKey: 'idemp-start-4',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should start session successfully with 15-minute block hold', async () => {
      const customerId = new Types.ObjectId();
      const machineId = new Types.ObjectId();

      inMemoryUsers.push({
        _id: customerId,
        phone: '0912345678',
        fullName: 'Khách Chơi Game',
      });

      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-01',
        zone: GamingMachineZone.STANDARD,
        status: GamingMachineStatus.IDLE,
        hourlyPrice: 15000,
        isActive: true,
      });

      const session = await service.startSession('cashier-1', {
        machineCode: 'pc-01',
        customerPhone: '0912345678',
        authMethod: 'PASSWORD',
        idempotencyKey: 'idemp-start-ok',
      });

      expect(session.status).toBe(GamingSessionStatus.ACTIVE);
      expect(session.machineCode).toBe('PC-01');
      expect(session.totalHoldAmount).toBe(3750);
      expect(mockWalletService.hold).toHaveBeenCalledWith(
        customerId.toString(),
        expect.objectContaining({
          amount: 3750,
          refType: 'GAMING_SESSION',
        }),
        'cashier-1',
      );

      // Verify machine is locked to IN_USE
      const machine = inMemoryMachines.find((m) => m.machineCode === 'PC-01');
      expect(machine.status).toBe(GamingMachineStatus.IN_USE);
    });

    it('should revert machine to IDLE if wallet hold fails', async () => {
      const customerId = new Types.ObjectId();
      const machineId = new Types.ObjectId();

      inMemoryUsers.push({
        _id: customerId,
        phone: '0912345678',
        fullName: 'Khách Hết Tiền',
      });

      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-02',
        zone: GamingMachineZone.STANDARD,
        status: GamingMachineStatus.IDLE,
        isActive: true,
      });

      mockWalletService.hold.mockRejectedValueOnce(
        new BadRequestException('Số dư ví không đủ để thực hiện tạm giữ'),
      );

      await expect(
        service.startSession('cashier-1', {
          machineCode: 'pc-02',
          customerPhone: '0912345678',
          authMethod: 'PASSWORD',
          idempotencyKey: 'idemp-start-fail',
        }),
      ).rejects.toThrow('Số dư ví không đủ để thực hiện tạm giữ');

      const machine = inMemoryMachines.find((m) => m.machineCode === 'PC-02');
      expect(machine.status).toBe(GamingMachineStatus.IDLE);
    });
  });

  describe('heartbeat & endSession', () => {
    it('should extend hold block when remaining time is low (<= 5 mins)', async () => {
      const sessionId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const machineId = new Types.ObjectId();

      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-03',
        zone: GamingMachineZone.STANDARD,
        hourlyPrice: 15000,
      });

      inMemorySessions.push({
        _id: sessionId,
        customerId,
        machineId,
        machineCode: 'PC-03',
        startedAt: new Date(Date.now() - 12 * 60000), // 12 mins passed of 15 min block
        totalHoldAmount: 3750,
        status: GamingSessionStatus.ACTIVE,
        save: jest.fn().mockImplementation(async function (this: any) {
          return this;
        }),
      });

      // Cost for 12 mins is 3000 VND, remaining hold is 750 VND (3 mins <= 5 mins)
      mockPricingService.calculateSessionCost.mockResolvedValueOnce({
        totalMinutes: 12,
        totalCost: 3000,
      });
      mockPricingService.calculateHoldAmountForMinutes.mockResolvedValueOnce(3750);

      const updated = await service.processHeartbeat({
        sessionId: sessionId.toString(),
        machineCode: 'PC-03',
      });

      // Held amount increased by another batch: 3750 + 3750 = 7500 VND
      expect(updated.totalHoldAmount).toBe(7500);
      expect(mockWalletService.hold).toHaveBeenCalled();
    });

    it('should end session, settle wallet and refund excess hold amount (SPEC Rule 3)', async () => {
      const sessionId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const machineId = new Types.ObjectId();

      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-04',
        zone: GamingMachineZone.STANDARD,
        status: GamingMachineStatus.IN_USE,
        currentSessionId: sessionId,
        hourlyPrice: 15000,
      });

      const initialSession = {
        _id: sessionId,
        sessionCode: 'GMS-20261026-END1',
        customerId,
        machineId,
        machineCode: 'PC-04',
        startedAt: new Date(Date.now() - 30 * 60000), // 30 minutes
        totalHoldAmount: 10000, // Held 10,000 VND
        idempotencyKey: 'idemp-end-1',
        status: GamingSessionStatus.ACTIVE,
      };
      inMemorySessions.push(initialSession);

      // Actual cost for 30 mins: 7,500 VND
      mockPricingService.calculateSessionCost.mockResolvedValueOnce({
        totalMinutes: 30,
        totalCost: 7500,
      });

      const settled = await service.endSession('cashier-1', {
        sessionId: sessionId.toString(),
        idempotencyKey: 'idemp-end-1',
      });

      // Usage: 7,500 VND. Refund hold: 10,000 - 7,500 = 2,500 VND
      expect(settled.status).toBe(GamingSessionStatus.SETTLED);
      expect(settled.actualUsageAmount).toBe(7500);
      expect(settled.refundHoldAmount).toBe(2500);

      expect(mockWalletService.settle).toHaveBeenCalledWith(
        customerId.toString(),
        expect.objectContaining({
          amount: 7500,
          heldToRelease: 10000,
          category: WalletCategory.GAME_TIME,
        }),
        'cashier-1',
      );

      // Machine reverted to IDLE
      const machine = inMemoryMachines.find((m) => m.machineCode === 'PC-04');
      expect(machine.status).toBe(GamingMachineStatus.IDLE);
      expect(machine.currentSessionId).toBeNull();
    });
  });

  describe('switchMachine & remoteControl', () => {
    it('should switch machine successfully if target machine is IDLE', async () => {
      const sessionId = new Types.ObjectId();
      const oldMachineId = new Types.ObjectId();
      const targetMachineId = new Types.ObjectId();

      inMemoryMachines.push(
        {
          _id: oldMachineId,
          machineCode: 'PC-OLD',
          status: GamingMachineStatus.IN_USE,
          currentSessionId: sessionId,
          isActive: true,
        },
        {
          _id: targetMachineId,
          machineCode: 'PC-NEW',
          status: GamingMachineStatus.IDLE,
          isActive: true,
        },
      );

      inMemorySessions.push({
        _id: sessionId,
        sessionCode: 'GMS-SWITCH-01',
        machineId: oldMachineId,
        machineCode: 'PC-OLD',
        status: GamingSessionStatus.ACTIVE,
      });

      const switched = await service.switchMachine('cashier-1', {
        sessionId: sessionId.toString(),
        targetMachineCode: 'pc-new',
        idempotencyKey: 'idemp-sw-1',
      });

      expect(switched.machineCode).toBe('PC-NEW');
      expect(switched.machineId.toString()).toBe(targetMachineId.toString());

      const oldM = inMemoryMachines.find((m) => m.machineCode === 'PC-OLD');
      const newM = inMemoryMachines.find((m) => m.machineCode === 'PC-NEW');
      expect(oldM.status).toBe(GamingMachineStatus.IDLE);
      expect(newM.status).toBe(GamingMachineStatus.IN_USE);
    });

    it('should execute remote control LOCK and UNLOCK', async () => {
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: 'PC-REMOTE',
        status: GamingMachineStatus.IDLE,
        save: jest.fn().mockImplementation(async function (this: any) {
          return this;
        }),
      });

      const lockRes = await service.executeRemoteControl('admin-1', {
        machineCode: 'PC-REMOTE',
        action: GamingRemoteAction.LOCK,
      });
      expect(lockRes.success).toBe(true);
    });

    it('should generate usage report', async () => {
      inMemorySessions.push(
        {
          totalPlayedMinutes: 60,
          actualUsageAmount: 15000,
          totalHoldAmount: 20000,
          refundHoldAmount: 5000,
        },
        {
          totalPlayedMinutes: 120,
          actualUsageAmount: 30000,
          totalHoldAmount: 30000,
          refundHoldAmount: 0,
        },
      );

      const report = await service.getUsageReport();
      expect(report.totalSessions).toBe(2);
      expect(report.totalPlayedHours).toBe(3);
      expect(report.totalRevenue).toBe(45000);
      expect(report.totalRefundAmount).toBe(5000);
    });
  });
});
