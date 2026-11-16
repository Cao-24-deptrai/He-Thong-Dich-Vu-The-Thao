import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
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
  PaymentMethod,
} from '@sports/contracts';

describe('GymService', () => {
  let service: GymService;
  let mockPackageModel: any;
  let mockMembershipModel: any;
  let mockAccessEventModel: any;
  let mockUserModel: any;
  let mockRedisService: any;
  let mockSettingsService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;

  const inMemoryPackages: any[] = [];
  const inMemoryMemberships: any[] = [];
  const inMemoryAccessEvents: any[] = [];
  const inMemoryUsers: any[] = [];
  const redisSetInside = new Set<string>();
  const redisKvStore = new Map<string, string>();

  beforeEach(async () => {
    inMemoryPackages.length = 0;
    inMemoryMemberships.length = 0;
    inMemoryAccessEvents.length = 0;
    inMemoryUsers.length = 0;
    redisSetInside.clear();
    redisKvStore.clear();

    mockPackageModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      id: (data._id || new Types.ObjectId()).toString(),
    }));
    mockPackageModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryPackages.length),
    }));
    mockPackageModel.insertMany = jest.fn().mockImplementation(async (items) => {
      for (const item of items) {
        const idObj = new Types.ObjectId();
        inMemoryPackages.push({
          ...item,
          _id: idObj,
          id: idObj.toString(),
        });
      }
      return inMemoryPackages;
    });
    mockPackageModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockImplementation(async () => {
        return (
          inMemoryPackages.find(
            (p) => p.id === id.toString() || p._id?.toString() === id.toString(),
          ) || null
        );
      }),
    }));
    mockPackageModel.find = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryPackages),
    }));

    mockMembershipModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryMemberships.findIndex((m) => m.id === doc.id);
          if (index >= 0) inMemoryMemberships[index] = doc;
          else inMemoryMemberships.push(doc);
          return doc;
        }),
      };
      return doc;
    });
    mockMembershipModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryMemberships.find((m) => m.id === id.toString()) || null;
      }),
    }));
    mockMembershipModel.findOne = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        if (query.idempotencyKey) {
          return inMemoryMemberships.find((m) => m.idempotencyKey === query.idempotencyKey) || null;
        }
        if (query.rfidCardId) {
          return inMemoryMemberships.find(
            (m) => m.rfidCardId === query.rfidCardId && (!query.status || m.status === query.status),
          ) || null;
        }
        if (query.userId) {
          return inMemoryMemberships.find(
            (m) => m.userId.toString() === query.userId.toString() && (!query.status || m.status === query.status),
          ) || null;
        }
        return null;
      }),
    }));
    mockMembershipModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(inMemoryMemberships),
    }));
    mockMembershipModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryMemberships.length),
    }));

    mockAccessEventModel = {
      create: jest.fn().mockImplementation(async (data) => {
        const doc = {
          ...data,
          _id: new Types.ObjectId(),
          id: new Types.ObjectId().toString(),
        };
        inMemoryAccessEvents.push(doc);
        return doc;
      }),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryUsers.find((u) => u.id === id.toString()) || null;
        }),
      })),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryUsers.find((u) => u.phone === query.phone) || null;
        }),
      })),
    };

    mockRedisService = {
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
        smembers: jest.fn().mockImplementation(async () => Array.from(redisSetInside)),
        set: jest.fn().mockImplementation(async (key, val, _mode, _ttl, flag) => {
          if (flag === 'NX' && redisKvStore.has(key)) return null;
          redisKvStore.set(key, val);
          return 'OK';
        }),
      },
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
    };

    mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    mockAuditLogService = {
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
    await service.onModuleInit();
  });

  describe('Purchase Membership (F10.2)', () => {
    it('should throw BadRequestException when paying gym with INTERNAL_WALLET (Invariant Rule 00)', async () => {
      const pkg = inMemoryPackages[0]!;
      await expect(
        service.purchaseMembership(new Types.ObjectId().toString(), {
          packageId: pkg.id,
          paymentMethod: 'INTERNAL_WALLET' as any,
          amount: pkg.price,
          idempotencyKey: 'idemp_test_wallet_fail',
        }),
      ).rejects.toThrow('Không được phép thanh toán thẻ gym bằng ví nội bộ');
    });

    it('should create ACTIVE membership when startDate is today', async () => {
      const userId = new Types.ObjectId().toString();
      const pkg = inMemoryPackages[0]!; // 1 month - 600.000đ

      const result = await service.purchaseMembership(userId, {
        packageId: pkg.id,
        paymentMethod: PaymentMethod.VIETQR,
        amount: pkg.price,
        idempotencyKey: 'idemp_buy_today',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(GymMembershipStatus.ACTIVE);
      expect(result.pricePaid).toBe(600000);
      expect(result.membershipCode).toMatch(/^GYM-\d{8}-[A-Z0-9]{4}$/);
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'gym_membership.purchased' }),
      );
    });

    it('should create UPCOMING membership when startDate is in the future', async () => {
      const userId = new Types.ObjectId().toString();
      const pkg = inMemoryPackages[0]!;
      const futureStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const result = await service.purchaseMembership(userId, {
        packageId: pkg.id,
        startDate: futureStart.toISOString(),
        paymentMethod: PaymentMethod.CASH,
        amount: pkg.price,
        idempotencyKey: 'idemp_buy_future',
      });

      expect(result.status).toBe(GymMembershipStatus.UPCOMING);
    });

    it('should reject when amount does not match package price', async () => {
      const userId = new Types.ObjectId().toString();
      const pkg = inMemoryPackages[0]!;

      await expect(
        service.purchaseMembership(userId, {
          packageId: pkg.id,
          paymentMethod: PaymentMethod.CASH,
          amount: 500000, // pkg is 600000
          idempotencyKey: 'idemp_wrong_amount',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Renew Membership (F10.3)', () => {
    it('should cumulatively extend membership from endDate + 1 day and apply early renewal discount', async () => {
      const userId = new Types.ObjectId();
      const pkg = inMemoryPackages[2]!; // 6M - 3.000.000đ, earlyRenewDiscount = 10%
      const now = new Date();
      const currentEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // Còn 10 ngày -> hưởng 10% discount

      const currentMembership = mockMembershipModel({
        _id: new Types.ObjectId(),
        membershipCode: 'GYM-20261026-0001',
        userId,
        packageId: pkg._id,
        packageName: pkg.name,
        startDate: new Date(now.getTime() - 170 * 24 * 60 * 60 * 1000),
        endDate: currentEnd,
        status: GymMembershipStatus.ACTIVE,
        pricePaid: 3000000,
        idempotencyKey: 'idemp_old',
      });
      inMemoryMemberships.push(currentMembership);

      // Expected discounted price = 3.000.000 - 10% = 2.700.000đ
      const renewed = await service.renewMembership(userId.toString(), currentMembership.id, {
        paymentMethod: PaymentMethod.VIETQR,
        amount: 2700000,
        idempotencyKey: 'idemp_renew_early',
      });

      expect(renewed).toBeDefined();
      expect(renewed.pricePaid).toBe(2700000);
      // New startDate must be currentEnd + 1 day
      expect(renewed.startDate.getTime()).toBeGreaterThan(currentEnd.getTime());
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'gym_membership.renewed' }),
      );
    });
  });

  describe('Upgrade Membership Pro-Rata (F10.4)', () => {
    it('should calculate pro-rata remaining value and deduct from new package', async () => {
      const userId = new Types.ObjectId();
      const oldPkg = inMemoryPackages[0]!; // 1M - 600.000đ
      const newPkg = inMemoryPackages[2]!; // 6M - 3.000.000đ

      const now = new Date();
      // Old package: 30 days total, 15 days remaining -> remainingValue = 600.000 * 15 / 30 = 300.000đ
      const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      const oldMembership = mockMembershipModel({
        _id: new Types.ObjectId(),
        membershipCode: 'GYM-20261026-0002',
        userId,
        packageId: oldPkg._id,
        packageName: oldPkg.name,
        startDate,
        endDate,
        status: GymMembershipStatus.ACTIVE,
        pricePaid: 600000,
        idempotencyKey: 'idemp_old_upgrade',
      });
      inMemoryMemberships.push(oldMembership);

      // Expected amount to pay = 3.000.000 - 300.000 = 2.700.000đ
      const upgraded = await service.upgradeMembership(
        userId.toString(),
        oldMembership.id,
        {
          newPackageId: newPkg.id,
          paymentMethod: PaymentMethod.VIETQR,
          amount: 2700000,
          idempotencyKey: 'idemp_upgrade_success',
        },
      );

      expect(oldMembership.status).toBe(GymMembershipStatus.UPGRADED);
      expect(upgraded.status).toBe(GymMembershipStatus.ACTIVE);
      expect(upgraded.pricePaid).toBe(2700000);
      expect(upgraded.packageName).toBe(newPkg.name);
    });

    it('should reject downgrade to lower price package', async () => {
      const userId = new Types.ObjectId();
      const oldPkg = inMemoryPackages[2]!; // 6M - 3.000.000đ
      const lowerPkg = inMemoryPackages[0]!; // 1M - 600.000đ

      const oldMembership = mockMembershipModel({
        _id: new Types.ObjectId(),
        userId,
        packageId: oldPkg._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        status: GymMembershipStatus.ACTIVE,
        pricePaid: 3000000,
        idempotencyKey: 'idemp_old_downgrade',
      });
      inMemoryMemberships.push(oldMembership);

      await expect(
        service.upgradeMembership(userId.toString(), oldMembership.id, {
          newPackageId: lowerPkg.id,
          paymentMethod: PaymentMethod.VIETQR,
          amount: 0,
          idempotencyKey: 'idemp_try_downgrade',
        }),
      ).rejects.toThrow('Không thể hạ cấp xuống gói có giá trị thấp hơn hoặc bằng gói cũ');
    });
  });

  describe('Dynamic QR 30s & Check-in / Check-out', () => {
    it('should generate signed dynamic QR and successfully check-in within 30s', async () => {
      const userId = new Types.ObjectId();
      const membership = mockMembershipModel({
        _id: new Types.ObjectId(),
        membershipCode: 'GYM-20261026-QR',
        userId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: GymMembershipStatus.ACTIVE,
      });
      inMemoryMemberships.push(membership);

      const qr = await service.generateDynamicQr(userId.toString());
      expect(qr.qrToken).toBeDefined();
      expect(qr.expiresInSeconds).toBe(30);

      const checkInResult = await service.checkIn({
        method: GymAccessMethod.DYNAMIC_QR,
        qrToken: qr.qrToken,
      });

      expect(checkInResult.success).toBe(true);
      expect(checkInResult.currentInside).toBe(1);
      expect(inMemoryAccessEvents).toHaveLength(1);
    });

    it('should reject anti-passback when user tries to check-in twice without checking out', async () => {
      const userId = new Types.ObjectId();
      const membership = mockMembershipModel({
        _id: new Types.ObjectId(),
        userId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: GymMembershipStatus.ACTIVE,
        rfidCardId: 'RFID-112233',
      });
      inMemoryMemberships.push(membership);

      // First check-in succeeds
      await service.checkIn({
        method: GymAccessMethod.RFID,
        rfidCardId: 'RFID-112233',
      });

      // Second check-in must fail due to Anti-Passback
      await expect(
        service.checkIn({
          method: GymAccessMethod.RFID,
          rfidCardId: 'RFID-112233',
        }),
      ).rejects.toThrow('Anti-passback');
    });

    it('should successfully check-out and decrement current inside counter', async () => {
      const userId = new Types.ObjectId();
      const membership = mockMembershipModel({
        _id: new Types.ObjectId(),
        userId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: GymMembershipStatus.ACTIVE,
        rfidCardId: 'RFID-998877',
      });
      inMemoryMemberships.push(membership);

      await service.checkIn({
        method: GymAccessMethod.RFID,
        rfidCardId: 'RFID-998877',
      });

      const checkOutRes = await service.checkOut({
        method: GymAccessMethod.RFID,
        rfidCardId: 'RFID-998877',
      });

      expect(checkOutRes.success).toBe(true);
      expect(checkOutRes.currentInside).toBe(0);
    });
  });

  describe('Capacity Status & RFID Assignment', () => {
    it('should return real-time capacity status', async () => {
      const status = await service.getCapacityStatus();
      expect(status.currentInside).toBe(0);
      expect(status.maxCapacity).toBe(100);
      expect(status.isFull).toBe(false);
    });

    it('should assign RFID to membership and reject duplicate assignment', async () => {
      const m1 = mockMembershipModel({
        _id: new Types.ObjectId(),
        status: GymMembershipStatus.ACTIVE,
      });
      const m2 = mockMembershipModel({
        _id: new Types.ObjectId(),
        status: GymMembershipStatus.ACTIVE,
      });
      inMemoryMemberships.push(m1, m2);

      await service.assignRfid(m1.id, 'RFID-UNIQUE-1');
      expect(m1.rfidCardId).toBe('RFID-UNIQUE-1');

      await expect(
        service.assignRfid(m2.id, 'RFID-UNIQUE-1'),
      ).rejects.toThrow('Thẻ RFID này đang được sử dụng bởi một hội viên khác');
    });
  });
});
