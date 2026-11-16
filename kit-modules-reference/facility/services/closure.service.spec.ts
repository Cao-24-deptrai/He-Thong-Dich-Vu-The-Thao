import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClosureService } from './closure.service.js';
import { Closure } from '../schemas/closure.schema.js';
import { ResourceService } from './resource.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

describe('ClosureService', () => {
  let service: ClosureService;
  let mockClosureModel: any;
  let mockResourceService: any;
  let mockAuditLogService: any;

  const closuresInDb: any[] = [];

  beforeEach(async () => {
    closuresInDb.length = 0;

    mockClosureModel = {
      find: jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(closuresInDb),
        }),
        exec: jest.fn().mockResolvedValue(closuresInDb),
      })),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(async () => {
          return closuresInDb.find((c) => {
            const hasUnit = c.affectedUnitIds.some((u: string) => query.affectedUnitIds?.$in?.includes(u));
            const overlap = c.fromAt < query.toAt.$gt && c.toAt > query.fromAt.$lt;
            return hasUnit && overlap;
          }) || null;
        }),
      })),
      create: jest.fn().mockImplementation((dto) => {
        const item = { ...dto, id: 'closure-1', toObject: () => dto };
        closuresInDb.push(item);
        return item;
      }),
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(closuresInDb.find((c) => c.id === id) || null),
      })),
      findByIdAndDelete: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({}),
      })),
    };

    mockResourceService = {
      resolveBaseUnits: jest.fn().mockImplementation((code) => {
        if (code === 'S7-A') return Promise.resolve(['F1', 'F2']);
        if (code === 'S11') return Promise.resolve(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
        if (code === 'F1') return Promise.resolve(['F1']);
        return Promise.resolve([code]);
      }),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClosureService,
        { provide: getModelToken(Closure.name), useValue: mockClosureModel },
        { provide: ResourceService, useValue: mockResourceService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ClosureService>(ClosureService);
  });

  describe('create', () => {
    it('tạo closure cho sân ghép S7-A thì affectedUnitIds tự động bao gồm [F1, F2]', async () => {
      const result = await service.create(
        {
          resourceIds: ['S7-A'],
          fromAt: '2026-03-20T08:00:00.000Z',
          toAt: '2026-03-20T12:00:00.000Z',
          reason: 'Bảo dưỡng cỏ nhân tạo',
        },
        'admin-user-1',
      );

      expect(result.resourceIds).toEqual(['S7-A']);
      expect(result.affectedUnitIds).toContain('F1');
      expect(result.affectedUnitIds).toContain('F2');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLOSURE_CREATE',
          targetType: 'facility_closure',
        }),
      );
    });
  });

  describe('isResourceClosed', () => {
    it('khi S7-A bị đóng thì kiểm tra sân con F1 cũng bị tính là đóng', async () => {
      await service.create(
        {
          resourceIds: ['S7-A'],
          fromAt: '2026-03-20T08:00:00.000Z',
          toAt: '2026-03-20T12:00:00.000Z',
          reason: 'Bảo dưỡng',
        },
        'admin-user-1',
      );

      // F1 có thuộc S7-A nên trong khoảng giờ đó F1 bị đóng
      const isClosed = await service.isResourceClosed(
        'F1',
        new Date('2026-03-20T09:00:00.000Z'),
        new Date('2026-03-20T10:00:00.000Z'),
      );

      expect(isClosed).toBe(true);
    });

    it('ngoài khoảng thời gian đóng thì sân mở bình thường', async () => {
      await service.create(
        {
          resourceIds: ['S7-A'],
          fromAt: '2026-03-20T08:00:00.000Z',
          toAt: '2026-03-20T12:00:00.000Z',
          reason: 'Bảo dưỡng',
        },
        'admin-user-1',
      );

      const isClosed = await service.isResourceClosed(
        'F1',
        new Date('2026-03-20T14:00:00.000Z'),
        new Date('2026-03-20T15:00:00.000Z'),
      );

      expect(isClosed).toBe(false);
    });
  });
});
