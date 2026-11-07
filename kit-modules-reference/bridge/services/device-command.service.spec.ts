import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DeviceCommandService } from './device-command.service.js';
import { DeviceCommand } from '../schemas/device-command.schema.js';
import { BridgeAgent } from '../schemas/bridge-agent.schema.js';
import {
  BridgeAgentStatus,
  DeviceCommandStatus,
  DeviceCommandType,
} from '@sports/shared';

describe('DeviceCommandService', () => {
  let service: DeviceCommandService;
  let inMemoryCommands: any[] = [];
  let inMemoryAgents: any[] = [];

  beforeEach(async () => {
    inMemoryCommands = [];
    inMemoryAgents = [];

    const mockDeviceCommandModel: any = jest.fn().mockImplementation((dto) => {
      const doc = {
        _id: new Types.ObjectId(),
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryCommands.findIndex((c) => c._id.toString() === this._id.toString());
          if (idx >= 0) {
            inMemoryCommands[idx] = this;
          } else {
            inMemoryCommands.push(this);
          }
          return this;
        }),
      };
      return doc;
    });

    mockDeviceCommandModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(
        inMemoryCommands.find((c) => {
          if (query.idempotencyKey && c.idempotencyKey !== query.idempotencyKey) return false;
          if (query._id && c._id.toString() !== query._id.toString()) return false;
          if (query.agentId && c.agentId.toString() !== query.agentId.toString()) return false;
          return true;
        }) || null,
      ),
    }));

    mockDeviceCommandModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(
            inMemoryCommands
              .filter((c) => {
                if (query.agentId && c.agentId.toString() !== query.agentId.toString()) return false;
                if (query.status && c.status !== query.status) return false;
                return true;
              })
              .sort((a, b) => (b.priority || 1) - (a.priority || 1)),
          ),
        }),
      }),
    }));

    mockDeviceCommandModel.updateMany = jest.fn().mockImplementation((query, update) => {
      const ids = query._id?.$in?.map((id: any) => id.toString()) || [];
      for (const c of inMemoryCommands) {
        if (ids.includes(c._id.toString())) {
          if (update.$set?.status) {
            c.status = update.$set.status;
          }
        }
      }
      return Promise.resolve({ modifiedCount: ids.length });
    });

    const mockBridgeAgentModel: any = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryAgents.find((a) => a._id.toString() === id.toString()) || null,
        ),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceCommandService,
        { provide: getModelToken(DeviceCommand.name), useValue: mockDeviceCommandModel },
        { provide: getModelToken(BridgeAgent.name), useValue: mockBridgeAgentModel },
      ],
    }).compile();

    service = module.get<DeviceCommandService>(DeviceCommandService);
  });

  describe('createCommand', () => {
    it('should create a new device command with PENDING status and commandCode', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({
        _id: agentId,
        agentCode: 'GATE-01',
        status: BridgeAgentStatus.ONLINE,
      });

      const cmd = await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.TRIGGER_TURNSTILE,
        payload: { pulseDurationMs: 3000 },
        priority: 10,
        idempotencyKey: 'IDEM-CMD-001',
      });

      expect(cmd.commandCode).toContain('CMD-');
      expect(cmd.commandType).toBe(DeviceCommandType.TRIGGER_TURNSTILE);
      expect(cmd.status).toBe(DeviceCommandStatus.PENDING);
      expect(cmd.priority).toBe(10);
      expect(inMemoryCommands.length).toBe(1);
    });

    it('should replay existing command when identical idempotencyKey is used', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({
        _id: agentId,
        agentCode: 'GATE-01',
        status: BridgeAgentStatus.ONLINE,
      });

      const first = await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.OPEN_CASH_DRAWER,
        payload: {},
        idempotencyKey: 'IDEM-CMD-DRAWER-01',
      });

      const second = await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.OPEN_CASH_DRAWER,
        payload: {},
        idempotencyKey: 'IDEM-CMD-DRAWER-01',
      });

      expect(first.id).toBe(second.id);
      expect(inMemoryCommands.length).toBe(1);
    });

    it('should reject command dispatch if agent is revoked', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({
        _id: agentId,
        agentCode: 'REVOKED-01',
        status: BridgeAgentStatus.REVOKED,
      });

      await expect(
        service.createCommand({
          agentId: agentId.toString(),
          commandType: DeviceCommandType.PRINT_RECEIPT,
          payload: {},
          idempotencyKey: 'IDEM-CMD-ERR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingCommandsForAgent & completeCommand', () => {
    it('should fetch pending commands in priority order and mark them SENT', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({ _id: agentId, agentCode: 'POS-01', status: BridgeAgentStatus.ONLINE });

      // Low priority command
      await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.PRINT_RECEIPT,
        priority: 1,
        idempotencyKey: 'IDEM-PRINT-01',
      });

      // High priority command (Emergency Turnstile open)
      await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.TRIGGER_TURNSTILE,
        priority: 10,
        idempotencyKey: 'IDEM-OPEN-01',
      });

      const pending = await service.getPendingCommandsForAgent(agentId, 10);
      expect(pending.length).toBe(2);
      expect(pending[0]!.commandType).toBe(DeviceCommandType.TRIGGER_TURNSTILE); // Priority 10 first
      expect(pending[1]!.commandType).toBe(DeviceCommandType.PRINT_RECEIPT);

      // Verify marked as SENT in memory
      expect(inMemoryCommands[0].status).toBe(DeviceCommandStatus.SENT);
      expect(inMemoryCommands[1].status).toBe(DeviceCommandStatus.SENT);
    });

    it('should mark command EXECUTED with executed timestamp', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({ _id: agentId, agentCode: 'POS-01', status: BridgeAgentStatus.ONLINE });

      const cmd = await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.OPEN_CASH_DRAWER,
        idempotencyKey: 'IDEM-DRAWER-02',
      });

      const completed = await service.completeCommand(agentId, cmd.id, {
        status: DeviceCommandStatus.EXECUTED,
      });

      expect(completed.status).toBe(DeviceCommandStatus.EXECUTED);
      expect(completed.executedAt).toBeDefined();
    });

    it('should mark command FAILED with error message if execution failed', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({ _id: agentId, agentCode: 'POS-01', status: BridgeAgentStatus.ONLINE });

      const cmd = await service.createCommand({
        agentId: agentId.toString(),
        commandType: DeviceCommandType.PRINT_RECEIPT,
        idempotencyKey: 'IDEM-PRINT-ERR',
      });

      const failed = await service.completeCommand(agentId, cmd.id, {
        status: DeviceCommandStatus.FAILED,
        errorMessage: 'Máy in nhiệt hết giấy',
      });

      expect(failed.status).toBe(DeviceCommandStatus.FAILED);
      expect(failed.errorMessage).toBe('Máy in nhiệt hết giấy');
    });
  });

  describe('Shortcuts', () => {
    it('should dispatch triggerTurnstile with priority 10', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({ _id: agentId, agentCode: 'GATE-01', status: BridgeAgentStatus.ONLINE });

      const cmd = await service.triggerTurnstile(agentId.toString(), 'IN', 4000);
      expect(cmd.commandType).toBe(DeviceCommandType.TRIGGER_TURNSTILE);
      expect(cmd.priority).toBe(10);
      expect(cmd.payload.direction).toBe('IN');
      expect(cmd.payload.pulseDurationMs).toBe(4000);
    });

    it('should dispatch openCashDrawer with priority 8', async () => {
      const agentId = new Types.ObjectId();
      inMemoryAgents.push({ _id: agentId, agentCode: 'POS-01', status: BridgeAgentStatus.ONLINE });

      const cmd = await service.openCashDrawer(agentId.toString(), 'IDEM-DRAWER-PULSE');
      expect(cmd.commandType).toBe(DeviceCommandType.OPEN_CASH_DRAWER);
      expect(cmd.priority).toBe(8);
      expect(cmd.payload.pulseMs).toBe(100);
    });
  });
});
