import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLogService } from './audit-log.service.js';
import { AuditLog } from '../schemas/audit-log.schema.js';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockAuditModel: any;

  beforeEach(async () => {
    mockAuditModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'mock_audit_id',
      save: jest.fn().mockResolvedValue({ _id: 'mock_audit_id', ...dto }),
    }));
    mockAuditModel.findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockAuditModel,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('record', () => {
    it('uses GENESIS as prevHash for the very first log entry', async () => {
      mockAuditModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          session: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const log = await service.record({
        action: 'auth.role.assign',
        targetType: 'User',
        targetId: 'user_123',
        actorId: 'admin_456',
        actorRole: 'ADMIN',
        after: { role: 'MANAGER' },
      });

      expect(log.prevHash).toBe('GENESIS');
      expect(log.hash).toHaveLength(64); // SHA-256 hex string
    });

    it('links prevHash to the hash of the preceding log entry in hash chain', async () => {
      const existingHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      mockAuditModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          session: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ hash: existingHash }),
          }),
        }),
      });

      const log = await service.record({
        action: 'auth.user.lock',
        targetType: 'User',
        targetId: 'user_789',
        after: { reason: 'Suspicious activity' },
      });

      expect(log.prevHash).toBe(existingHash);
      expect(log.hash).toHaveLength(64);
      expect(log.hash).not.toBe(existingHash);
    });
  });
});
