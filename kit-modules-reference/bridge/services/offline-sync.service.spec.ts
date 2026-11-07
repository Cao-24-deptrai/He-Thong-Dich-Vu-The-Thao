import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { OfflineSyncService } from './offline-sync.service.js';
import { DeviceEventService } from './device-event.service.js';
import { GymMembership } from '../../gym/schemas/gym-membership.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { BridgeAgentDocument } from '../schemas/bridge-agent.schema.js';
import {
  BridgeAgentStatus,
  DeviceEventType,
  DeviceType,
  GymMembershipStatus,
} from '@sports/shared';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;
  let inMemoryMemberships: any[] = [];
  let inMemoryUsers: any[] = [];
  let replayedEvents: any[] = [];

  const mockAgent: Partial<BridgeAgentDocument> = {
    _id: new Types.ObjectId(),
    agentCode: 'GATE-01',
    status: BridgeAgentStatus.ONLINE,
  };

  const mockDeviceEventService = {
    ingestEvents: jest.fn().mockImplementation((_agent, dto) => {
      replayedEvents.push(...dto.events);
      return Promise.resolve({
        receivedCount: dto.events.length,
        processedCount: dto.events.length,
        actionResults: dto.events.map((e: any) => ({
          eventCode: e.eventCode,
          success: true,
          triggeredTurnstile: true,
        })),
      });
    }),
  };

  beforeEach(async () => {
    inMemoryMemberships = [];
    inMemoryUsers = [];
    replayedEvents = [];
    jest.clearAllMocks();

    const mockGymMembershipModel: any = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryMemberships.filter((m) => {
            if (query.status && m.status !== query.status) return false;
            if (query.endDate?.$gte && m.endDate < query.endDate.$gte) return false;
            return true;
          }),
        ),
      })),
    };

    const mockUserModel: any = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryUsers.filter((u) => {
            if (query._id?.$in) {
              const ids = query._id.$in.map((id: any) => id.toString());
              return ids.includes(u._id.toString());
            }
            return true;
          }),
        ),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineSyncService,
        { provide: getModelToken(GymMembership.name), useValue: mockGymMembershipModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: DeviceEventService, useValue: mockDeviceEventService },
      ],
    }).compile();

    service = module.get<OfflineSyncService>(OfflineSyncService);
  });

  describe('getOfflineMemberSnapshot', () => {
    it('should generate snapshot of active gym memberships with HMAC-SHA256 signature for offline cryptographic verification', async () => {
      const uId = new Types.ObjectId();
      const mId = new Types.ObjectId();
      const validUntil = new Date(Date.now() + 30 * 86400000); // 30 days valid

      inMemoryUsers.push({
        _id: uId,
        fullName: 'Trần Văn Nam',
        phone: '0988776655',
      });

      inMemoryMemberships.push({
        _id: mId,
        userId: uId,
        status: GymMembershipStatus.ACTIVE,
        endDate: validUntil,
        packageCode: 'GYM-1M',
        rfidCardNumber: 'RFID-VIP-9999',
      });

      const snapshot = await service.getOfflineMemberSnapshot();

      expect(snapshot.totalMembers).toBe(1);
      const member = snapshot.members[0]!;
      expect(member.memberId).toBe(mId.toString());
      expect(member.fullName).toBe('Trần Văn Nam');
      expect(member.phone).toBe('0988776655');
      expect(member.membershipType).toBe('GYM-1M');
      expect(member.signature).toBeDefined();

      // Verify HMAC-SHA256 signature
      const expectedHmac = crypto
        .createHmac('sha256', 'offline-agent-cache-hmac-secret-key-2026')
        .update(`${mId.toString()}:0988776655:${validUntil.toISOString()}`)
        .digest('hex');

      expect(member.signature).toBe(expectedHmac);
    });

    it('should not include expired memberships in the snapshot', async () => {
      const uId = new Types.ObjectId();
      inMemoryMemberships.push({
        _id: new Types.ObjectId(),
        userId: uId,
        status: GymMembershipStatus.EXPIRED,
        endDate: new Date(Date.now() - 86400000), // Expired yesterday
      });

      const snapshot = await service.getOfflineMemberSnapshot();
      expect(snapshot.totalMembers).toBe(0);
    });
  });

  describe('syncOfflineEvents', () => {
    it('should replay offline event queue and mark events with isOfflineReplay: true', async () => {
      const offlineEvents = [
        {
          eventCode: 'OFFLINE-EVT-01',
          eventType: DeviceEventType.QR_SCANNED,
          deviceType: DeviceType.QR_SCANNER,
          payload: { memberId: 'MBR-01', occurredOffline: true },
          occurredAt: new Date(Date.now() - 3600000), // 1 hour ago during outage
          idempotencyKey: 'IDEM-OFFLINE-001',
        },
        {
          eventCode: 'OFFLINE-EVT-02',
          eventType: DeviceEventType.RFID_SWIPED,
          deviceType: DeviceType.RFID_READER,
          payload: { rfidCardNumber: 'CARD-02' },
          occurredAt: new Date(Date.now() - 1800000), // 30 mins ago
          idempotencyKey: 'IDEM-OFFLINE-002',
        },
      ];

      const res = await service.syncOfflineEvents(mockAgent as BridgeAgentDocument, offlineEvents);

      expect(res.receivedCount).toBe(2);
      expect(res.processedCount).toBe(2);
      expect(replayedEvents.length).toBe(2);
      expect(replayedEvents[0].isOfflineReplay).toBe(true);
      expect(replayedEvents[1].isOfflineReplay).toBe(true);
    });
  });
});
