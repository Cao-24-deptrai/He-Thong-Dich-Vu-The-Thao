import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GamingMachineService } from './gaming-machine.service.js';
import { GamingMachine } from '../schemas/gaming-machine.schema.js';
import { GamingSession } from '../schemas/gaming-session.schema.js';
import { GamingMachineZone, GamingMachineStatus } from '@sports/shared';

describe('GamingMachineService', () => {
  let service: GamingMachineService;
  let mockMachineModel: any;
  let mockSessionModel: any;

  const inMemoryMachines: any[] = [];
  const inMemorySessions: any[] = [];

  beforeEach(async () => {
    inMemoryMachines.length = 0;
    inMemorySessions.length = 0;

    mockMachineModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      status: data.status || GamingMachineStatus.IDLE,
      isActive: data.isActive ?? true,
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryMachines.findIndex((m) => m._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryMachines[idx] = { ...this };
        } else {
          inMemoryMachines.push({ ...this });
        }
        return this;
      }),
    }));

    mockMachineModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryMachines.find((m) => {
        if (query.machineCode && m.machineCode === query.machineCode) return true;
        return false;
      });
      return Promise.resolve(found ? {
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryMachines.findIndex((m) => m._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryMachines[idx] = { ...this };
          return this;
        }),
      } : null);
    });

    mockMachineModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryMachines.find(
        (m) => m._id.toString() === id.toString() || m.id === id.toString(),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryMachines.findIndex((m) => m._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryMachines[idx] = { ...this };
          return this;
        }),
      });
    });

    mockMachineModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockImplementation(() => {
              let results = [...inMemoryMachines];
              if (query['position.floor'] !== undefined) {
                results = results.filter((m) => m.position?.floor === query['position.floor']);
              }
              if (query.isActive !== undefined) {
                results = results.filter((m) => m.isActive === query.isActive);
              }
              return Promise.resolve(results);
            }),
          }),
        }),
        exec: jest.fn().mockImplementation(() => {
          let results = [...inMemoryMachines];
          if (query['position.floor'] !== undefined) {
            results = results.filter((m) => m.position?.floor === query['position.floor']);
          }
          if (query.isActive !== undefined) {
            results = results.filter((m) => m.isActive === query.isActive);
          }
          return Promise.resolve(results);
        }),
      }),
      exec: jest.fn().mockResolvedValue(inMemoryMachines),
    }));

    mockMachineModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(inMemoryMachines.length),
    });

    mockMachineModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryMachines.find((m) => {
        if (query.machineCode && m.machineCode === query.machineCode) return true;
        if (query._id && m._id.toString() === query._id.toString()) return true;
        return false;
      });
      if (target && update.$set) {
        Object.assign(target, update.$set);
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    mockSessionModel = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(() => {
          let results = [...inMemorySessions];
          if (query._id?.$in) {
            const idStrs = query._id.$in.map((id: any) => id.toString());
            results = results.filter((s) => idStrs.includes(s._id.toString()));
          }
          return Promise.resolve(results);
        }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamingMachineService,
        { provide: getModelToken(GamingMachine.name), useValue: mockMachineModel },
        { provide: getModelToken(GamingSession.name), useValue: mockSessionModel },
      ],
    }).compile();

    service = module.get<GamingMachineService>(GamingMachineService);
  });

  describe('createMachine & updateMachine', () => {
    it('should create machine successfully', async () => {
      const machine = await service.createMachine({
        machineCode: 'pc-01',
        zone: GamingMachineZone.STANDARD,
        specs: { cpu: 'i5-13400', gpu: 'RTX 4060', ram: '32GB' },
        position: { floor: 1, x: 10, y: 20 },
        hourlyPrice: 15000,
        isActive: true,
      });

      expect(machine.machineCode).toBe('PC-01');
      expect(machine.status).toBe(GamingMachineStatus.IDLE);
      expect(inMemoryMachines.length).toBe(1);
    });

    it('should throw ConflictException if machineCode already exists', async () => {
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: 'PC-01',
        zone: GamingMachineZone.STANDARD,
      });

      await expect(
        service.createMachine({
          machineCode: 'pc-01',
          zone: GamingMachineZone.VIP,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update machine fields', async () => {
      const machineId = new Types.ObjectId();
      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-02',
        zone: GamingMachineZone.STANDARD,
        hourlyPrice: 15000,
      });

      const updated = await service.updateMachine(machineId.toString(), {
        hourlyPrice: 20000,
        status: GamingMachineStatus.MAINTENANCE,
      });

      expect(updated.hourlyPrice).toBe(20000);
      expect(updated.status).toBe(GamingMachineStatus.MAINTENANCE);
    });
  });

  describe('registration & heartbeat', () => {
    it('should generate 6-digit registration OTP code', async () => {
      const machineId = new Types.ObjectId();
      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-03',
        status: GamingMachineStatus.OFFLINE,
      });

      const otp = await service.generateRegistrationCode('PC-03');
      expect(otp).toMatch(/^\d{6}$/);

      const target = inMemoryMachines.find((m) => m.machineCode === 'PC-03');
      expect(target.oneTimeCode).toBe(otp);
    });

    it('should register machine with valid OTP and generate token', async () => {
      const machineId = new Types.ObjectId();
      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-04',
        oneTimeCode: '123456',
        status: GamingMachineStatus.OFFLINE,
      });

      const result = await service.registerMachine({
        machineCode: 'pc-04',
        oneTimeCode: '123456',
        ipAddress: '192.168.1.104',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      });

      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64); // 32 bytes hex
      expect(result.machine.status).toBe(GamingMachineStatus.IDLE);
      expect(result.machine.ipAddress).toBe('192.168.1.104');
    });

    it('should throw BadRequestException if OTP code is invalid', async () => {
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: 'PC-05',
        oneTimeCode: '654321',
        status: GamingMachineStatus.OFFLINE,
      });

      await expect(
        service.registerMachine({
          machineCode: 'PC-05',
          oneTimeCode: '999999',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record heartbeat from client', async () => {
      inMemoryMachines.push({
        _id: new Types.ObjectId(),
        machineCode: 'PC-06',
        lastHeartbeatAt: new Date(2026, 9, 26, 8, 0, 0),
      });

      await service.recordHeartbeat('pc-06');
      const machine = inMemoryMachines.find((m) => m.machineCode === 'PC-06');
      expect(machine.lastHeartbeatAt).toBeDefined();
    });
  });

  describe('getFloorMap', () => {
    it('should return floor map with machines and active session info', async () => {
      const sessionId = new Types.ObjectId();
      const machineId = new Types.ObjectId();

      inMemoryMachines.push({
        _id: machineId,
        machineCode: 'PC-VIP-01',
        zone: GamingMachineZone.VIP,
        status: GamingMachineStatus.IN_USE,
        position: { floor: 2, x: 5, y: 10 },
        currentSessionId: sessionId,
        isActive: true,
      });

      inMemorySessions.push({
        _id: sessionId,
        sessionCode: 'GMS-20261026-TEST',
        customerPhone: '0901234567',
        customerName: 'Nguyễn Văn Test',
        startedAt: new Date(Date.now() - 30 * 60000), // 30 mins ago
        actualUsageAmount: 15000,
        warningMinutesRemaining: 15,
      });

      const map = await service.getFloorMap(2);
      expect(map.floor).toBe(2);
      expect(map.totalMachines).toBe(1);
      expect(map.activeSessions).toBe(1);
      expect(map.machines[0]?.currentSession?.sessionCode).toBe('GMS-20261026-TEST');
      expect(map.machines[0]?.currentSession?.playedMinutes).toBeGreaterThanOrEqual(30);
    });
  });
});
