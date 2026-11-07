import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { GymAccessService, MAX_GYM_CAPACITY } from './gym-access.service';
import { GymQrCredential } from './schemas/gym-qr-credential.schema';
import { GymAccessLog } from './schemas/gym-access-log.schema';
import { User } from '../users/schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { GymPlanType, GymQrStatus } from './enums/gym-plan-type.enum';

describe('GymAccessService (Unit Tests - Bước 3.2: Bộ đếm 100 người & Cửa xoay 2 chiều)', () => {
  let service: GymAccessService;

  let redisStore: Map<string, string>;
  let credentialStore: any[];
  let logStore: any[];

  const mockRedisService = {
    get: jest.fn().mockImplementation((key: string) => {
      return Promise.resolve(redisStore.get(key) || null);
    }),
    set: jest.fn().mockImplementation((key: string, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      redisStore.delete(key);
      return Promise.resolve();
    }),
  };

  const mockEventsGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  const mockQrCredentialModel = {
    findOne: jest.fn().mockImplementation((filter: any) => ({
      exec: jest.fn().mockImplementation(() => {
        const found = credentialStore.find((c) => c.qrCode === filter.qrCode);
        if (!found) return null;
        return {
          ...found,
          save: jest.fn().mockImplementation(function () {
            const idx = credentialStore.findIndex((c) => c.qrCode === this.qrCode);
            if (idx >= 0) credentialStore[idx] = this;
            return Promise.resolve(this);
          }),
        };
      }),
    })),
  };

  const mockAccessLogModel: any = {
    create: jest.fn().mockImplementation((data: any) => {
      logStore.push(data);
      return Promise.resolve(data);
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => Promise.resolve(logStore)),
    }),
  };

  const mockUserModel = {
    findById: jest.fn().mockImplementation((id: any) => ({
      exec: jest.fn().mockResolvedValue({
        _id: id,
        fullName: 'Nguyễn Văn Hùng VIP',
        phone: '0903112233',
      }),
    })),
  };

  beforeEach(async () => {
    redisStore = new Map<string, string>();
    credentialStore = [];
    logStore = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymAccessService,
        {
          provide: getModelToken(GymQrCredential.name),
          useValue: mockQrCredentialModel,
        },
        {
          provide: getModelToken(GymAccessLog.name),
          useValue: mockAccessLogModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<GymAccessService>(GymAccessService);
  });

  describe('1. Kiểm tra tính hợp lệ & Vòng đời mã QR qua cửa xoay (AC-70)', () => {
    it('Báo lỗi 404 NotFound nếu mã QR không tồn tại trong hệ thống', async () => {
      await expect(
        service.scanTurnstile({
          qrCode: 'INVALID_QR_CODE',
          direction: 'IN',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('AC-70: Báo lỗi PASS_EXPIRED nếu gói tập đã hết hạn, cửa không mở', async () => {
      const expiredCredential = {
        userId: new Types.ObjectId(),
        qrCode: 'PHANTA_GYM_EXPIRED_01',
        status: GymQrStatus.EXPIRED,
        activeUntil: new Date(Date.now() - 86400000), // Hôm qua
        currentPlanCode: GymPlanType.DAY_1,
      };
      credentialStore.push(expiredCredential);

      try {
        await service.scanTurnstile({
          qrCode: 'PHANTA_GYM_EXPIRED_01',
          direction: 'IN',
        });
        fail('Phải ném BadRequestException PASS_EXPIRED');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const res = err.getResponse();
        expect(res.errorCode).toBe('PASS_EXPIRED');
        expect(res.message).toContain('hết hạn sử dụng');
      }
    });
  });

  describe('2. Khóa chống quét trùng 5 phút cùng một chiều (BR-30, AC-31, AC-32)', () => {
    const validUserId = new Types.ObjectId();
    const validQrCode = 'PHANTA_GYM_ACTIVE_01';

    beforeEach(() => {
      credentialStore.push({
        userId: validUserId,
        qrCode: validQrCode,
        status: GymQrStatus.ACTIVE,
        activeUntil: new Date(Date.now() + 86400000 * 30),
        currentPlanCode: GymPlanType.MONTH_1,
      });
    });

    it('Quét IN lần 1 thành công; Quét tiếp IN lần 2 trong vòng 5 phút bị từ chối với RECENTLY_SCANNED', async () => {
      // Quét IN lần 1 -> Thành công
      const firstScan = await service.scanTurnstile({
        qrCode: validQrCode,
        direction: 'IN',
      });

      expect(firstScan.accessGranted).toBe(true);
      expect(firstScan.turnstileAction).toBe('OPEN');
      expect(firstScan.insideCount).toBe(1);

      // Quét tiếp IN lần 2 ngay sau đó -> Ném RECENTLY_SCANNED
      try {
        await service.scanTurnstile({
          qrCode: validQrCode,
          direction: 'IN',
        });
        fail('Phải ném RECENTLY_SCANNED');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const res = err.getResponse();
        expect(res.errorCode).toBe('RECENTLY_SCANNED');
        expect(res.message).toContain('vòng 5 phút');
      }
    });

    it('Sau khi quét IN, quét OUT ngay lập tức (khác chiều) ĐƯỢC PHÉP mở cửa ra bình thường', async () => {
      // Quét IN
      await service.scanTurnstile({
        qrCode: validQrCode,
        direction: 'IN',
      });
      expect(await service.getInsideCount()).toBe(1);

      // Quét OUT ngay lập tức -> Không bị chặn vì là chiều OUT khác chiều IN
      const outScan = await service.scanTurnstile({
        qrCode: validQrCode,
        direction: 'OUT',
      });

      expect(outScan.accessGranted).toBe(true);
      expect(outScan.turnstileAction).toBe('OPEN');
      expect(outScan.direction).toBe('OUT');
      expect(outScan.insideCount).toBe(0);

      // Nếu cố quét OUT tiếp lần nữa -> Lúc này mới bị chặn debounce chiều OUT
      await expect(
        service.scanTurnstile({
          qrCode: validQrCode,
          direction: 'OUT',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Bộ đếm sức chứa tối đa 100 người & Chặn quá tải (BR-29, AC-31, AC-32)', () => {
    it('Khi phòng có 99 người, quét vào -> Tăng lên 100, mở cửa xoay thành công', async () => {
      redisStore.set('gym:inside', '99');

      const userId = new Types.ObjectId();
      const qrCode = 'PHANTA_GYM_99_TO_100';
      credentialStore.push({
        userId,
        qrCode,
        status: GymQrStatus.ACTIVE,
        activeUntil: new Date(Date.now() + 86400000 * 30),
        currentPlanCode: GymPlanType.MONTH_1,
      });

      const res = await service.scanTurnstile({
        qrCode,
        direction: 'IN',
      });

      expect(res.accessGranted).toBe(true);
      expect(res.insideCount).toBe(100);
      expect(res.maxCapacity).toBe(MAX_GYM_CAPACITY);
    });

    it('AC-31 & AC-32: Khi phòng đã đủ 100 người, quét vào -> Từ chối 409 Conflict với lỗi GYM_CAPACITY_FULL', async () => {
      // Giả lập phòng đã đủ 100 người
      redisStore.set('gym:inside', '100');

      const userId = new Types.ObjectId();
      const qrCode = 'PHANTA_GYM_FULL_TEST';
      credentialStore.push({
        userId,
        qrCode,
        status: GymQrStatus.ACTIVE,
        activeUntil: new Date(Date.now() + 86400000 * 30),
        currentPlanCode: GymPlanType.MONTH_1,
      });

      try {
        await service.scanTurnstile({
          qrCode,
          direction: 'IN',
        });
        fail('Phải ném ConflictException GYM_CAPACITY_FULL');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        const res = err.getResponse();
        expect(res.errorCode).toBe('GYM_CAPACITY_FULL');
        expect(res.message).toContain('sức chứa tối đa 100 người');
      }

      // Đảm bảo số người vẫn giữ nguyên 100, không bị tăng lố
      expect(await service.getInsideCount()).toBe(100);
    });
  });

  describe('4. Chiều ra (OUT) & Không để số đếm bị âm', () => {
    it('Giảm số người khi quét OUT và không bao giờ để số đếm bị âm', async () => {
      redisStore.set('gym:inside', '0');

      const userId = new Types.ObjectId();
      const qrCode = 'PHANTA_GYM_OUT_TEST';
      credentialStore.push({
        userId,
        qrCode,
        status: GymQrStatus.ACTIVE,
        activeUntil: new Date(Date.now() + 86400000 * 30),
        currentPlanCode: GymPlanType.DAY_1,
      });

      const res = await service.scanTurnstile({
        qrCode,
        direction: 'OUT',
      });

      expect(res.accessGranted).toBe(true);
      expect(res.insideCount).toBe(0); // Không bị âm
    });
  });

  describe('5. Ghi đè số đếm thủ công (Manual Override) & Reset 23:00 (BR-29)', () => {
    it('Admin ghi đè số đếm thủ công thành 42 người kèm lý do hợp lệ', async () => {
      redisStore.set('gym:inside', '15');

      const res = await service.overrideCapacity(
        {
          newCount: 42,
          reason: 'Điều chỉnh theo lượt đếm thực tế của camera cửa',
        },
        new Types.ObjectId().toString(),
      );

      expect(res.success).toBe(true);
      expect(res.previousCount).toBe(15);
      expect(res.newCount).toBe(42);
      expect(await service.getInsideCount()).toBe(42);

      // Ghi log manual override
      expect(logStore.length).toBe(1);
      expect(logStore[0].isManualOverride).toBe(true);
    });

    it('Tự động reset bộ đếm về 0 vào giờ đóng cửa 23:00 theo BR-29', async () => {
      redisStore.set('gym:inside', '55');

      const res = await service.resetDailyCapacity();

      expect(res.insideCount).toBe(0);
      expect(await service.getInsideCount()).toBe(0);
    });
  });
});
