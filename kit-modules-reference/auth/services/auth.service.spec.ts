import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { User } from '../schemas/user.schema.js';
import { UserSession } from '../schemas/user-session.schema.js';
import { PasswordService } from './password.service.js';
import { OtpService } from './otp.service.js';
import { AuditLogService } from './audit-log.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { Role } from '@sports/shared';
import { DomainError } from '../../../common/errors/domain-error.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockSessionModel: any;
  let passwordService: PasswordService;
  let mockOtpService: any;
  let mockAuditLogService: any;
  let mockJwtService: any;
  let mockDbTxService: any;

  beforeEach(async () => {
    passwordService = new PasswordService();

    mockUserModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'mock_user_id',
      save: jest.fn().mockResolvedValue({ _id: 'mock_user_id', ...dto }),
    }));
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();

    mockSessionModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    };

    mockOtpService = {
      createOtpChallenge: jest.fn().mockResolvedValue({
        challengeId: 'mock_challenge_id',
        waitSeconds: 60,
      }),
      verifyOtp: jest.fn(),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_access_token'),
    };

    mockDbTxService = {
      runTransaction: jest.fn().mockImplementation((fn) => fn({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(UserSession.name),
          useValue: mockSessionModel,
        },
        {
          provide: PasswordService,
          useValue: passwordService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DatabaseTransactionService,
          useValue: mockDbTxService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login & brute-force protection', () => {
    it('locks account for 15 minutes after 5 consecutive failed login attempts', async () => {
      const mockUser: {
        _id: string;
        phone: string;
        passwordHash: string;
        failedLoginAttempts: number;
        status: string;
        role: Role;
        lockedUntil?: Date;
        save: jest.Mock;
      } = {
        _id: 'user_brute_force',
        phone: '0901234567',
        passwordHash: await passwordService.hashPassword('CorrectPassword123@'),
        failedLoginAttempts: 4, // 5th attempt will lock
        status: 'ACTIVE',
        role: Role.CUSTOMER,
        lockedUntil: undefined,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // 5th wrong attempt
      await expect(
        service.login({
          phone: '0901234567',
          password: 'WrongPassword',
          deviceId: 'device_1',
          deviceName: 'Web Browser',
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      expect(mockUser.failedLoginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeDefined();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.user.locked_bruteforce' }),
      );
    });

    it('rejects login when account is locked (lockedUntil is in the future)', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      const mockUser = {
        _id: 'user_locked',
        phone: '0901234567',
        status: 'ACTIVE',
        lockedUntil: futureDate,
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.login({
          phone: '0901234567',
          password: 'AnyPassword',
          deviceId: 'device_1',
          deviceName: 'Web Browser',
        }),
      ).rejects.toThrow(DomainError);

      await expect(
        service.login({
          phone: '0901234567',
          password: 'AnyPassword',
          deviceId: 'device_1',
          deviceName: 'Web Browser',
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'ACCOUNT_LOCKED', httpStatus: 403 }));
    });

    it('always requires OTP challenge for Staff logins (Rule 02-security-privacy)', async () => {
      const password = 'StaffPassword123@';
      const mockStaff = {
        _id: 'staff_1',
        phone: '0909999999',
        type: 'STAFF',
        role: Role.CASHIER,
        passwordHash: await passwordService.hashPassword(password),
        status: 'ACTIVE',
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStaff),
      });

      const response = await service.login({
        phone: '0909999999',
        password,
        deviceId: 'pos_counter_1',
        deviceName: 'POS Station 1',
      });

      expect(response.requiresOtp).toBe(true);
      if (response.requiresOtp) {
        expect(response.challengeId).toBe('mock_challenge_id');
        expect(mockOtpService.createOtpChallenge).toHaveBeenCalledWith('0909999999', 'LOGIN');
      }
    });
  });
});
