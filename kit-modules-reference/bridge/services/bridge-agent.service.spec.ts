import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as crypto from 'crypto';
import { BridgeAgentService } from './bridge-agent.service.js';
import { BridgeAgent } from '../schemas/bridge-agent.schema.js';
import { DeviceCommand } from '../schemas/device-command.schema.js';
import {
  BridgeAgentStatus,
  DeviceType,
  DeviceHealthStatus,
  DeviceCommandStatus,
} from '@sports/shared';

describe('BridgeAgentService', () => {
  let service: BridgeAgentService;
  let inMemoryAgents: any[] = [];
  let inMemoryCommands: any[] = [];

  beforeEach(async () => {
    inMemoryAgents = [];
    inMemoryCommands = [];

    const mockBridgeAgentModel: any = jest.fn().mockImplementation((dto) => {
      const doc = {
        _id: new Types.ObjectId(),
        ...dto,
        deviceStatuses: dto.deviceStatuses || new Map(),
        config: dto.config || new Map(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryAgents.findIndex((a) => a._id.toString() === this._id.toString());
          if (idx >= 0) {
            inMemoryAgents[idx] = this;
          } else {
            inMemoryAgents.push(this);
          }
          return this;
        }),
      };
      return doc;
    });

    mockBridgeAgentModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(
        inMemoryAgents.find((a) => {
          if (query.agentCode && a.agentCode !== query.agentCode) return false;
          return true;
        }) || null,
      ),
    }));

    mockBridgeAgentModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockResolvedValue(
        inMemoryAgents.find((a) => a._id.toString() === id.toString()) || null,
      ),
    }));

    mockBridgeAgentModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(inMemoryAgents),
      }),
    }));

    const mockDeviceCommandModel: any = {
      countDocuments: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryCommands.filter((c) => {
            if (query.agentId && c.agentId.toString() !== query.agentId.toString()) return false;
            if (query.status && c.status !== query.status) return false;
            return true;
          }).length,
        ),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BridgeAgentService,
        { provide: getModelToken(BridgeAgent.name), useValue: mockBridgeAgentModel },
        { provide: getModelToken(DeviceCommand.name), useValue: mockDeviceCommandModel },
      ],
    }).compile();

    service = module.get<BridgeAgentService>(BridgeAgentService);
  });

  describe('registerAgent', () => {
    it('should register a new bridge agent with random secret key and SHA-256 hash', async () => {
      const res = await service.registerAgent({
        agentCode: 'GATE-01',
        name: 'Cửa xoay Gym tầng 1',
        location: 'Khu vực Gym',
        supportedDevices: [DeviceType.TURNSTILE, DeviceType.QR_SCANNER],
        config: { turnstilePulseDurationMs: 4000 },
      });

      expect(res.agent.agentCode).toBe('GATE-01');
      expect(res.agent.status).toBe(BridgeAgentStatus.OFFLINE);
      expect(res.secretKey).toBeDefined();
      expect(res.secretKey.length).toBe(64); // 32 bytes hex = 64 chars

      const saved = inMemoryAgents[0];
      expect(saved.tokenHash).toBe(crypto.createHash('sha256').update(res.secretKey).digest('hex'));
    });

    it('should reject registration if agentCode already exists', async () => {
      await service.registerAgent({
        agentCode: 'GATE-01',
        name: 'Cửa xoay 1',
        location: 'Gym',
        supportedDevices: [DeviceType.TURNSTILE],
      });

      await expect(
        service.registerAgent({
          agentCode: 'GATE-01',
          name: 'Cửa xoay trùng',
          location: 'Gym',
          supportedDevices: [DeviceType.TURNSTILE],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('handshake', () => {
    it('should perform handshake, verify secret and generate active session token', async () => {
      const reg = await service.registerAgent({
        agentCode: 'POS-01',
        name: 'Quầy Thu ngân 1',
        location: 'Sảnh chính',
        supportedDevices: [DeviceType.ESC_POS_PRINTER, DeviceType.CASH_DRAWER],
      });

      const handshakeRes = await service.handshake({
        agentCode: 'POS-01',
        secretKey: reg.secretKey,
        version: '1.0.0',
        ipAddress: '192.168.1.100',
      });

      expect(handshakeRes.sessionToken).toBeDefined();
      expect(handshakeRes.expiresInSeconds).toBe(86400);

      const agent = inMemoryAgents[0];
      expect(agent.status).toBe(BridgeAgentStatus.ONLINE);
      expect(agent.version).toBe('1.0.0');
      expect(agent.ipAddress).toBe('192.168.1.100');
    });

    it('should reject handshake with invalid secret key', async () => {
      await service.registerAgent({
        agentCode: 'POS-02',
        name: 'Quầy 2',
        location: 'Sảnh',
        supportedDevices: [DeviceType.CASH_DRAWER],
      });

      await expect(
        service.handshake({
          agentCode: 'POS-02',
          secretKey: 'invalid-secret-key-1234567890',
          version: '1.0.0',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject handshake if agent was revoked', async () => {
      const reg = await service.registerAgent({
        agentCode: 'POS-03',
        name: 'Quầy 3',
        location: 'Sảnh',
        supportedDevices: [DeviceType.CASH_DRAWER],
      });

      await service.revokeAgent(reg.agent.id);

      await expect(
        service.handshake({
          agentCode: 'POS-03',
          secretKey: reg.secretKey,
          version: '1.0.0',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateSessionToken & heartbeat', () => {
    it('should validate active session token and update device diagnostic health on heartbeat', async () => {
      const reg = await service.registerAgent({
        agentCode: 'GATE-02',
        name: 'Cửa xoay 2',
        location: 'Gym',
        supportedDevices: [DeviceType.TURNSTILE, DeviceType.ESC_POS_PRINTER],
      });

      const hs = await service.handshake({
        agentCode: 'GATE-02',
        secretKey: reg.secretKey,
        version: '1.0.0',
      });

      // 1. Validate session token
      const validatedAgent = await service.validateSessionToken('GATE-02', hs.sessionToken);
      expect(validatedAgent._id.toString()).toBe(reg.agent.id);

      // 2. Add pending command
      inMemoryCommands.push({
        agentId: validatedAgent._id,
        status: DeviceCommandStatus.PENDING,
      });

      // 3. Heartbeat with hardware diagnostic status
      const hb = await service.heartbeat(validatedAgent, {
        agentCode: 'GATE-02',
        deviceStatuses: {
          [DeviceType.TURNSTILE]: { status: DeviceHealthStatus.OK },
          [DeviceType.ESC_POS_PRINTER]: { status: DeviceHealthStatus.OUT_OF_PAPER, details: 'Hết cuộn giấy in 80mm' },
        },
        version: '1.0.1',
      });

      expect(hb.acknowledged).toBe(true);
      expect(hb.hasPendingCommands).toBe(true);

      // Verify diagnostics map updated
      const printerStatus = validatedAgent.deviceStatuses.get(DeviceType.ESC_POS_PRINTER);
      expect(printerStatus?.status).toBe(DeviceHealthStatus.OUT_OF_PAPER);
      expect(printerStatus?.details).toContain('Hết cuộn giấy');
    });

    it('should reject session token if expired', async () => {
      const reg = await service.registerAgent({
        agentCode: 'GATE-03',
        name: 'Cửa 3',
        location: 'Gym',
        supportedDevices: [DeviceType.TURNSTILE],
      });

      const hs = await service.handshake({
        agentCode: 'GATE-03',
        secretKey: reg.secretKey,
        version: '1.0.0',
      });

      // Force expire session
      inMemoryAgents[0].sessionExpiresAt = new Date(Date.now() - 1000);

      await expect(
        service.validateSessionToken('GATE-03', hs.sessionToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
