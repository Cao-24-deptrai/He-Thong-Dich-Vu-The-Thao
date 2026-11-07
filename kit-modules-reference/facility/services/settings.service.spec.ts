import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SettingsService, DEFAULT_FACILITY_SETTINGS } from './settings.service.js';
import { Setting } from '../schemas/setting.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockSettingModel: any;
  let mockAuditLogService: any;

  const dbStore = new Map<string, any>();

  beforeEach(async () => {
    dbStore.clear();

    mockSettingModel = {
      find: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(Array.from(dbStore.values())),
        }),
      })),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(dbStore.get(query.key) || null),
      })),
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        const existing = dbStore.get(query.key) || { key: query.key, value: null, version: 0 };
        const updated = {
          ...existing,
          value: update.$set.value,
          updatedBy: update.$set.updatedBy,
          version: (existing.version || 0) + 1,
        };
        dbStore.set(query.key, updated);
        return {
          exec: jest.fn().mockResolvedValue(updated),
        };
      }),
      updateOne: jest.fn().mockImplementation((query, update) => {
        if (!dbStore.has(query.key)) {
          dbStore.set(query.key, {
            key: query.key,
            value: update.$setOnInsert.value,
            version: update.$setOnInsert.version,
          });
        }
        return Promise.resolve({ acknowledged: true });
      }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getModelToken(Setting.name), useValue: mockSettingModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    await service.onModuleInit();
  });

  describe('defaults and get', () => {
    it('trả về giá trị cấu hình mặc định theo Phụ lục C', () => {
      expect(service.get('booking.slotMinutes')).toBe(30);
      expect(service.get('booking.holdMinutes')).toBe(10);
      expect(service.get('booking.depositPercent')).toBe(30);
      expect(service.get('gym.capacity')).toBe(100);
      expect(service.get('invoice.vatRate')).toBe(8);
    });

    it('trả về fallback nếu key chưa từng được định nghĩa', () => {
      expect(service.get('unknown.config', 'default-val')).toBe('default-val');
    });

    it('getAll trả về đầy đủ danh sách cấu hình', () => {
      const all = service.getAll();
      expect(all['booking.slotMinutes']).toBe(30);
      expect(Object.keys(all).length).toBeGreaterThanOrEqual(Object.keys(DEFAULT_FACILITY_SETTINGS).length);
    });
  });

  describe('set', () => {
    it('cập nhật cấu hình, cập nhật cache và ghi AuditLog', async () => {
      await service.set('booking.depositPercent', 50, 'admin-user-1');

      expect(service.get('booking.depositPercent')).toBe(50);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SETTING_UPDATE',
          targetType: 'setting',
          targetId: 'booking.depositPercent',
          actorId: 'admin-user-1',
          before: { key: 'booking.depositPercent', value: 30 },
          after: { key: 'booking.depositPercent', value: 50 },
        }),
      );
    });
  });
});
