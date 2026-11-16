import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DeviceEventService } from './device-event.service.js';
import { DeviceCommandService } from './device-command.service.js';
import { GymService } from '../../gym/services/gym.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import { DeviceEvent } from '../schemas/device-event.schema.js';
import { BridgeAgentDocument } from '../schemas/bridge-agent.schema.js';
import {
  DeviceEventType,
  DeviceType,
  BridgeAgentStatus,
  GymAccessMethod,
} from '@sports/shared';

describe('DeviceEventService', () => {
  let service: DeviceEventService;
  let inMemoryEvents: any[] = [];
  let triggeredCommands: any[] = [];
  let auditLogs: any[] = [];

  const mockAgent: Partial<BridgeAgentDocument> = {
    _id: new Types.ObjectId(),
    agentCode: 'GATE-01',
    status: BridgeAgentStatus.ONLINE,
  };

  const mockGymService = {
    checkIn: jest.fn().mockResolvedValue({
      success: true,
      currentInside: 25,
      message: 'Check-in thành công',
    }),
    checkOut: jest.fn().mockResolvedValue({
      success: true,
      currentInside: 24,
      message: 'Check-out thành công',
    }),
  };

  const mockDeviceCommandService = {
    triggerTurnstile: jest.fn().mockImplementation((agentId, direction, duration, key) => {
      const cmd = { agentId, direction, duration, key };
      triggeredCommands.push(cmd);
      return Promise.resolve(cmd);
    }),
  };

  const mockAuditLogService = {
    record: jest.fn().mockImplementation((log) => {
      auditLogs.push(log);
      return Promise.resolve(log);
    }),
  };

  beforeEach(async () => {
    inMemoryEvents = [];
    triggeredCommands = [];
    auditLogs = [];
    jest.clearAllMocks();

    const mockDeviceEventModel: any = jest.fn().mockImplementation((dto) => {
      const doc = {
        _id: new Types.ObjectId(),
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryEvents.findIndex((e) => e._id.toString() === this._id.toString());
          if (idx >= 0) {
            inMemoryEvents[idx] = this;
          } else {
            inMemoryEvents.push(this);
          }
          return this;
        }),
      };
      return doc;
    });

    mockDeviceEventModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(
        inMemoryEvents.find((e) => {
          if (query.idempotencyKey && e.idempotencyKey !== query.idempotencyKey) return false;
          return true;
        }) || null,
      ),
    }));

    mockDeviceEventModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(inMemoryEvents),
        }),
      }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceEventService,
        { provide: getModelToken(DeviceEvent.name), useValue: mockDeviceEventModel },
        { provide: DeviceCommandService, useValue: mockDeviceCommandService },
        { provide: GymService, useValue: mockGymService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<DeviceEventService>(DeviceEventService);
  });

  describe('ingestEvents', () => {
    it('should process QR_SCANNED event for Gym, check in and automatically trigger turnstile', async () => {
      const res = await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-QR-001',
            eventType: DeviceEventType.QR_SCANNED,
            deviceType: DeviceType.QR_SCANNER,
            payload: {
              targetService: 'GYM',
              direction: 'IN',
              qrToken: 'valid-dynamic-qr-token-base64',
            },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-EVT-001',
          },
        ],
      });

      expect(res.receivedCount).toBe(1);
      expect(res.processedCount).toBe(1);
      expect(res.actionResults[0]!.success).toBe(true);
      expect(res.actionResults[0]!.triggeredTurnstile).toBe(true);

      // Verify GymService.checkIn was called with dynamic QR
      expect(mockGymService.checkIn).toHaveBeenCalledWith(
        expect.objectContaining({
          method: GymAccessMethod.DYNAMIC_QR,
          qrToken: 'valid-dynamic-qr-token-base64',
        }),
        'bridge-agent-GATE-01',
      );

      // Verify turnstile command triggered
      expect(mockDeviceCommandService.triggerTurnstile).toHaveBeenCalledWith(
        mockAgent._id!.toString(),
        'IN',
        3000,
        'AUTO-OPEN-IN-EVT-QR-001',
      );
    });

    it('should process RFID_SWIPED event for Gym check-in', async () => {
      const res = await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-RFID-001',
            eventType: DeviceEventType.RFID_SWIPED,
            deviceType: DeviceType.RFID_READER,
            payload: {
              targetService: 'GYM',
              direction: 'IN',
              rfidCardNumber: 'RFID-1234-5678',
            },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-EVT-002',
          },
        ],
      });

      expect(res.actionResults[0]!.success).toBe(true);
      expect(res.actionResults[0]!.triggeredTurnstile).toBe(true);
      expect(mockGymService.checkIn).toHaveBeenCalledWith(
        expect.objectContaining({
          method: GymAccessMethod.RFID,
          rfidCardId: 'RFID-1234-5678',
        }),
        'bridge-agent-GATE-01',
      );
    });

    it('should process Gym check-out and trigger turnstile OUT', async () => {
      const userId = new Types.ObjectId().toString();
      const res = await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-OUT-001',
            eventType: DeviceEventType.RFID_SWIPED,
            deviceType: DeviceType.RFID_READER,
            payload: {
              targetService: 'GYM',
              direction: 'OUT',
              userId,
            },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-EVT-OUT-01',
          },
        ],
      });

      expect(res.actionResults[0]!.success).toBe(true);
      expect(res.actionResults[0]!.triggeredTurnstile).toBe(true);
      expect(mockGymService.checkOut).toHaveBeenCalledWith({ userId });
      expect(mockDeviceCommandService.triggerTurnstile).toHaveBeenCalledWith(
        mockAgent._id!.toString(),
        'OUT',
        3000,
        'AUTO-OPEN-OUT-EVT-OUT-001',
      );
    });

    it('should record cash drawer opening in audit log', async () => {
      const res = await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-DRAWER-01',
            eventType: DeviceEventType.DRAWER_OPENED,
            deviceType: DeviceType.CASH_DRAWER,
            payload: { cashierId: 'USR-CASHIER-01', shiftCode: 'SHIFT-01' },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-DRAWER-001',
          },
        ],
      });

      expect(res.actionResults[0]!.success).toBe(true);
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('CASH_DRAWER_KICKED');
    });

    it('should handle idempotent replay for previously ingested events without duplicate processing', async () => {
      // First ingestion
      await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-QR-REPLAY-01',
            eventType: DeviceEventType.TURNSTILE_PASSED,
            deviceType: DeviceType.TURNSTILE,
            payload: { direction: 'IN' },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-REPLAY-KEY-001',
          },
        ],
      });

      // Second ingestion with same key
      const replayRes = await service.ingestEvents(mockAgent as BridgeAgentDocument, {
        events: [
          {
            eventCode: 'EVT-QR-REPLAY-01',
            eventType: DeviceEventType.TURNSTILE_PASSED,
            deviceType: DeviceType.TURNSTILE,
            payload: { direction: 'IN' },
            occurredAt: new Date(),
            idempotencyKey: 'IDEM-REPLAY-KEY-001',
          },
        ],
      });

      expect(replayRes.processedCount).toBe(0);
      expect(replayRes.actionResults[0]!.message).toContain('Idempotent Replay');
      expect(inMemoryEvents.length).toBe(1);
    });
  });
});
