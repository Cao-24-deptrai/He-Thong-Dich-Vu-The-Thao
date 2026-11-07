import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ResourceService } from './resource.service.js';
import { Resource } from '../schemas/resource.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import { ResourceKind, SportType, ResourceStatus } from '@sports/contracts';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockResourceModel: any;
  let mockAuditLogService: any;

  const mockResources = [
    {
      _id: 'res-f1',
      id: 'res-f1',
      code: 'F1',
      name: 'Sân 5 số 1',
      kind: ResourceKind.COURT,
      sport: SportType.FOOTBALL,
      variant: 'F5',
      isComposite: false,
      baseUnitIds: ['F1'],
      toObject: () => ({ code: 'F1' }),
    },
    {
      _id: 'res-f2',
      id: 'res-f2',
      code: 'F2',
      name: 'Sân 5 số 2',
      kind: ResourceKind.COURT,
      sport: SportType.FOOTBALL,
      variant: 'F5',
      isComposite: false,
      baseUnitIds: ['F2'],
      toObject: () => ({ code: 'F2' }),
    },
    {
      _id: 'res-s7a',
      id: 'res-s7a',
      code: 'S7-A',
      name: 'Sân 7 A',
      kind: ResourceKind.COURT,
      sport: SportType.FOOTBALL,
      variant: 'F7',
      isComposite: true,
      baseUnitIds: ['F1', 'F2'],
      toObject: () => ({ code: 'S7-A' }),
    },
    {
      _id: 'res-s11',
      id: 'res-s11',
      code: 'S11',
      name: 'Sân 11',
      kind: ResourceKind.COURT,
      sport: SportType.FOOTBALL,
      variant: 'F11',
      isComposite: true,
      baseUnitIds: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
      toObject: () => ({ code: 'S11' }),
    },
  ];

  beforeEach(async () => {
    mockResourceModel = {
      find: jest.fn().mockImplementation((query) => {
        let results = [...mockResources];
        if (query?.baseUnitIds?.$in) {
          const targets = query.baseUnitIds.$in;
          results = results.filter((r) => r.baseUnitIds.some((u) => targets.includes(u)));
        }
        return {
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(results),
          }),
          exec: jest.fn().mockResolvedValue(results),
        };
      }),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(mockResources.find((r) => r.code === query.code) || null),
      })),
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(mockResources.find((r) => r.id === id) || null),
      })),
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'new-id',
        toObject: () => dto,
      })),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        { provide: getModelToken(Resource.name), useValue: mockResourceModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
  });

  describe('resolveBaseUnits', () => {
    it('phân giải sân đơn F1 thành baseUnitIds = [F1]', async () => {
      const units = await service.resolveBaseUnits('F1');
      expect(units).toEqual(['F1']);
    });

    it('phân giải sân ghép S7-A thành baseUnitIds = [F1, F2]', async () => {
      const units = await service.resolveBaseUnits('S7-A');
      expect(units).toEqual(['F1', 'F2']);
    });

    it('phân giải sân ghép S11 thành baseUnitIds = [F1, F2, F3, F4, F5, F6]', async () => {
      const units = await service.resolveBaseUnits('S11');
      expect(units).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    });

    it('báo lỗi NotFoundException khi tìm mã sân không tồn tại', async () => {
      await expect(service.resolveBaseUnits('UNKNOWN_COURT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findConflictingResources', () => {
    it('tìm thấy các sân có thể gây xung đột lịch với S7-A (F1, F2, S11)', async () => {
      const conflicts = await service.findConflictingResources('S7-A');
      const codes = conflicts.map((c) => c.code);
      expect(codes).toContain('F1');
      expect(codes).toContain('F2');
      expect(codes).toContain('S7-A');
      expect(codes).toContain('S11');
    });
  });

  describe('create', () => {
    it('tạo sân mới thành công và ghi nhận AuditLog', async () => {
      const result = await service.create(
        {
          code: 'T3',
          name: 'Sân Tennis 3',
          kind: ResourceKind.COURT,
          sport: SportType.TENNIS,
          status: ResourceStatus.ACTIVE,
          baseUnitIds: ['T3'],
        },
        'admin-user-1',
      );

      expect(result.code).toBe('T3');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_CREATE',
          targetType: 'facility_resource',
          actorId: 'admin-user-1',
        }),
      );
    });

    it('ném lỗi ConflictException khi mã sân đã tồn tại', async () => {
      await expect(
        service.create(
          {
            code: 'F1',
            name: 'Sân 1 trùng mã',
            kind: ResourceKind.COURT,
            sport: SportType.FOOTBALL,
          },
          'admin-user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
