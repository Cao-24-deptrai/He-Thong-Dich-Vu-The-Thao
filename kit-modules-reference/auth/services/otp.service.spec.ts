import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OtpService } from './otp.service.js';
import { OtpChallenge } from '../schemas/otp-challenge.schema.js';
import { PasswordService } from './password.service.js';

describe('OtpService', () => {
  let service: OtpService;
  let mockOtpModel: any;
  let passwordService: PasswordService;

  beforeEach(async () => {
    passwordService = new PasswordService();

    mockOtpModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'mock_challenge_id_123',
      save: jest.fn().mockResolvedValue({ _id: 'mock_challenge_id_123', ...dto }),
    }));
    mockOtpModel.findOne = jest.fn();
    mockOtpModel.findById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getModelToken(OtpChallenge.name),
          useValue: mockOtpModel,
        },
        {
          provide: PasswordService,
          useValue: passwordService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('createOtpChallenge', () => {
    it('creates OTP challenge successfully when no recent OTP was sent', async () => {
      mockOtpModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.createOtpChallenge('0901234567', 'LOGIN');
      expect(result.challengeId).toBe('mock_challenge_id_123');
      expect(result.waitSeconds).toBe(60);
      expect(result.devCode).toHaveLength(6);
    });

    it('throws OTP_RATE_LIMITED when requested within 60 seconds cooldown', async () => {
      const recentDate = new Date(Date.now() - 30 * 1000); // 30s ago
      mockOtpModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ createdAt: recentDate }),
        }),
      });

      await expect(service.createOtpChallenge('0901234567', 'LOGIN')).rejects.toThrow(
        expect.objectContaining({ code: 'OTP_RATE_LIMITED' }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('verifies correct OTP code successfully', async () => {
      const plainCode = '123456';
      const codeHash = passwordService.hashToken(plainCode);
      const mockChallenge = {
        _id: 'mock_challenge_id',
        phone: '0901234567',
        codeHash,
        purpose: 'LOGIN',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockOtpModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockChallenge),
      });

      const result = await service.verifyOtp('mock_challenge_id', plainCode);
      expect(result.phone).toBe('0901234567');
      expect(result.purpose).toBe('LOGIN');
      expect(mockChallenge.usedAt).toBeDefined();
    });

    it('increments attempts and throws OTP_INVALID when code does not match', async () => {
      const mockChallenge = {
        _id: 'mock_challenge_id',
        phone: '0901234567',
        codeHash: passwordService.hashToken('123456'),
        purpose: 'LOGIN',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockOtpModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockChallenge),
      });

      await expect(service.verifyOtp('mock_challenge_id', '999999')).rejects.toThrow(
        expect.objectContaining({ code: 'OTP_INVALID' }),
      );
      expect(mockChallenge.attempts).toBe(1);
    });

    it('throws OTP_EXPIRED when challenge is expired', async () => {
      const mockChallenge = {
        _id: 'mock_challenge_id',
        phone: '0901234567',
        codeHash: passwordService.hashToken('123456'),
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
      };

      mockOtpModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockChallenge),
      });

      await expect(service.verifyOtp('mock_challenge_id', '123456')).rejects.toThrow(
        expect.objectContaining({ code: 'OTP_EXPIRED' }),
      );
    });
  });
});
