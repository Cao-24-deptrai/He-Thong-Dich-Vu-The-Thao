import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GymService } from './gym.service.js';
import { GymPackage } from '../schemas/gym-package.schema.js';
import { GymMembership } from '../schemas/gym-membership.schema.js';
import { GymAccessEvent } from '../schemas/gym-access-event.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { RedisService } from '../../../redis/redis.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  GymMembershipStatus,
  GymAccessMethod,
} from '@sports/contracts';

describe('GymService Concurrency Defense (150 Concurrent Check-Ins Race)', () => {
  let service: GymService;

  const inMemoryMemberships: any[] = [];
  const inMemoryAccessEvents: any[] = [];
  const redisSetInside = new Set<string>();

  beforeEach(async () => {
    inMemoryMemberships.length = 0;
    inMemoryAccessEvents.length = 0;
    redisSetInside.clear();

    // 1. Giả lập phòng gym đang có sẵn 90 người tập
    for (let i = 1; i <= 90; i++) {
      redisSetInside.add(`existing_user_${i}`);
    }

    const mockPackageModel = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(4) }),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };

    const mockMembershipModel: any = jest.fn();
    mockMembershipModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        if (query.rfidCardId) {
          return inMemoryMemberships.find((m) => m.rfidCardId === query.rfidCardId) || null;
        }
        return null;
      }),
    }));

    const mockAccessEventModel = {
      create: jest.fn().mockImplementation(async (data) => {
        inMemoryAccessEvents.push(data);
        return data;
      }),
    };

    const mockUserModel = {
      findById: jest.fn(),
    };

    // Mô phỏng Redis server thực thi atomic Lua script đơn luồng (Single-threaded event loop)
    const mockRedisService = {
      client: {
        eval: jest.fn().mockImplementation(async (_script, _numKeys, _key, userId, maxCap) => {
          if (redisSetInside.has(userId)) {
            return [0, 'ANTI_PASSBACK', redisSetInside.size];
          }
          if (redisSetInside.size >= parseInt(maxCap, 10)) {
            return [0, 'GYM_FULL', redisSetInside.size];
          }
          redisSetInside.add(userId);
          return [1, 'OK', redisSetInside.size];
        }),
        scard: jest.fn().mockImplementation(async () => redisSetInside.size),
        srem: jest.fn().mockImplementation(async (_key, userId) => {
          redisSetInside.delete(userId);
          return 1;
        }),
      },
    };

    const mockSettingsService = {
      get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
    };

    const mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymService,
        { provide: getModelToken(GymPackage.name), useValue: mockPackageModel },
        { provide: getModelToken(GymMembership.name), useValue: mockMembershipModel },
        { provide: getModelToken(GymAccessEvent.name), useValue: mockAccessEventModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<GymService>(GymService);
  });

  it('SPEC Acceptance Criteria: 150 người quét thẻ cùng lúc khi đang có 90 người -> ĐÚNG 10 người vào được, 140 người bị từ chối GYM_FULL', async () => {
    expect(redisSetInside.size).toBe(90);

    // Chuẩn bị 150 hội viên hợp lệ với thẻ RFID riêng biệt
    const candidateRfidCards: string[] = [];
    for (let i = 1; i <= 150; i++) {
      const userId = new Types.ObjectId();
      const rfidCardId = `RFID_RACE_${i}`;
      candidateRfidCards.push(rfidCardId);

      inMemoryMemberships.push({
        _id: new Types.ObjectId(),
        membershipCode: `GYM-RACE-${i}`,
        userId,
        rfidCardId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: GymMembershipStatus.ACTIVE,
      });
    }

    // Thực hiện 150 yêu cầu check-in đồng thời (Race condition)
    const checkInPromises = candidateRfidCards.map((rfidCardId) =>
      service.checkIn({
        method: GymAccessMethod.RFID,
        rfidCardId,
      }),
    );

    const results = await Promise.allSettled(checkInPromises);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Khẳng định đúng 10 người vào thành công
    expect(succeeded).toHaveLength(10);

    // Khẳng định đúng 140 người bị từ chối
    expect(failed).toHaveLength(140);

    // Kiểm tra lý do từ chối của 140 người đều là phòng đầy
    for (const f of failed) {
      if (f.status === 'rejected') {
        expect(f.reason.message).toContain('Phòng gym đang đầy');
      }
    }

    // Khẳng định bất biến: Tổng số người đang trong phòng đúng bằng 100 (Không bao giờ vượt quá 100)
    expect(redisSetInside.size).toBe(100);

    // Khẳng định đúng 10 sự kiện CHECK_IN được ghi nhận vào CSDL
    expect(inMemoryAccessEvents).toHaveLength(10);
  });
});
