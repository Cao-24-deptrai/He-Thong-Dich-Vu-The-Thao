import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TournamentRegistrationService } from './tournament-registration.service.js';
import { Tournament } from '../schemas/tournament.schema.js';
import { TournamentTeam } from '../schemas/tournament-team.schema.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  TournamentStatus,
  TournamentTeamStatus,
  PaymentMethod,
  TournamentType,
  TournamentFormat,
} from '@sports/shared';

describe('TournamentRegistrationService', () => {
  let service: TournamentRegistrationService;

  const tournamentId = new Types.ObjectId();
  const captainId = new Types.ObjectId();
  const shiftId = new Types.ObjectId();

  let inMemoryTournaments: any[] = [];
  let inMemoryTeams: any[] = [];

  const mockCashierShiftService = {
    recordOrderSales: jest.fn().mockResolvedValue(undefined),
    recordOrderRefund: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditLogService = {
    record: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
  };

  beforeEach(async () => {
    inMemoryTournaments = [
      {
        _id: tournamentId,
        code: 'CUP-BONGDA-2026',
        name: 'Giải Bóng Đá Tứ Hùng 2026',
        type: TournamentType.SPORT,
        sportOrGame: 'Bóng đá 7 người',
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
        maxTeams: 8,
        currentTeamCount: 2,
        teamSize: 7,
        entryFee: 1500000,
        prizePool: 10000000,
        registrationStartDate: new Date(Date.now() - 7 * 86400000),
        registrationEndDate: new Date(Date.now() + 7 * 86400000),
        tournamentStartDate: new Date(Date.now() + 10 * 86400000),
        tournamentEndDate: new Date(Date.now() + 14 * 86400000),
        status: TournamentStatus.REGISTRATION_OPEN,
      },
    ];

    inMemoryTeams = [];

    const mockTournamentModel: any = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryTournaments.find((t) => t._id.toString() === id.toString()) || null,
        ),
      })),
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        const t = inMemoryTournaments.find(
          (item) =>
            item._id.toString() === query._id.toString() &&
            item.status === query.status &&
            item.currentTeamCount < query.currentTeamCount.$lt,
        );
        if (!t) return { exec: jest.fn().mockResolvedValue(null) };
        if (update.$inc?.currentTeamCount) {
          t.currentTeamCount += update.$inc.currentTeamCount;
        }
        return { exec: jest.fn().mockResolvedValue({ ...t }) };
      }),
      updateOne: jest.fn().mockImplementation((query, update) => {
        const t = inMemoryTournaments.find((item) => item._id.toString() === query._id.toString());
        if (t && update.$inc?.currentTeamCount) {
          t.currentTeamCount += update.$inc.currentTeamCount;
        }
        return { exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
      }),
    };

    const mockTeamModel: any = function (data: any) {
      const doc = {
        ...data,
        _id: new Types.ObjectId(),
        save: jest.fn().mockImplementation(async function (this: any) {
          inMemoryTeams.push(this);
          return this;
        }),
      };
      return doc;
    };

    mockTeamModel.findOne = jest.fn().mockImplementation((query) => {
      let found: any = null;
      if (query.idempotencyKey) {
        found = inMemoryTeams.find((t) => t.idempotencyKey === query.idempotencyKey);
      } else if (query.tournamentId && query.teamName) {
        found = inMemoryTeams.find(
          (t) =>
            t.tournamentId.toString() === query.tournamentId.toString() &&
            t.teamName.toLowerCase() === query.teamName.toLowerCase() &&
            (!query.status || t.status !== query.status.$ne),
        );
      }
      return { exec: jest.fn().mockResolvedValue(found || null) };
    });

    mockTeamModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryTeams.find((t) => t._id.toString() === id.toString());
      if (!found) return { exec: jest.fn().mockResolvedValue(null) };
      return {
        exec: jest.fn().mockResolvedValue({
          ...found,
          save: jest.fn().mockImplementation(async function (this: any) {
            const idx = inMemoryTeams.findIndex((t) => t._id.toString() === this._id.toString());
            if (idx >= 0) inMemoryTeams[idx] = this;
            return this;
          }),
        }),
      };
    });

    mockTeamModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          inMemoryTeams.filter((t) => t.tournamentId.toString() === query.tournamentId.toString()),
        ),
      }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentRegistrationService,
        { provide: getModelToken(Tournament.name), useValue: mockTournamentModel },
        { provide: getModelToken(TournamentTeam.name), useValue: mockTeamModel },
        { provide: CashierShiftService, useValue: mockCashierShiftService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<TournamentRegistrationService>(TournamentRegistrationService);
    jest.clearAllMocks();
  });

  describe('registerTeam', () => {
    it('should successfully register a team with CASH payment and record cashier shift', async () => {
      const dto = {
        teamName: 'FC Sông Lam',
        captainName: 'Nguyễn Văn Đội Trưởng',
        captainPhone: '0901234567',
        members: [
          { fullName: 'Nguyễn Văn Đội Trưởng', phone: '0901234567', isCaptain: true },
          { fullName: 'Trần Văn Tiền Đạo', phone: '0909998881', isCaptain: false },
        ],
        paymentMethod: PaymentMethod.CASH,
        cashierShiftId: shiftId.toString(),
        idempotencyKey: 'idemp-team-reg-001',
      };

      const result = await service.registerTeam(tournamentId.toString(), captainId.toString(), dto);

      expect(result).toBeDefined();
      expect(result.teamName).toBe('FC Sông Lam');
      expect(result.entryFeePaid).toBe(1500000);
      expect(result.status).toBe(TournamentTeamStatus.CONFIRMED);
      expect(inMemoryTournaments[0].currentTeamCount).toBe(3);
      expect(mockCashierShiftService.recordOrderSales).toHaveBeenCalledWith(
        shiftId.toString(),
        1500000,
        PaymentMethod.CASH,
      );
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('should successfully register a team with VIETQR payment', async () => {
      const dto = {
        teamName: 'FC Hà Nội',
        captainName: 'Lê Văn Trưởng',
        captainPhone: '0912345678',
        members: [
          { fullName: 'Lê Văn Trưởng', phone: '0912345678', isCaptain: true },
        ],
        paymentMethod: PaymentMethod.VIETQR,
        idempotencyKey: 'idemp-team-reg-002',
      };

      const result = await service.registerTeam(tournamentId.toString(), captainId.toString(), dto);

      expect(result).toBeDefined();
      expect(result.teamName).toBe('FC Hà Nội');
      expect(result.paymentMethod).toBe(PaymentMethod.VIETQR);
      expect(inMemoryTournaments[0].currentTeamCount).toBe(3);
    });

    it('should strictly reject wallet payment (WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT)', async () => {
      const dto: any = {
        teamName: 'FC Ví Nội Bộ',
        captainName: 'Trần Văn Ví',
        captainPhone: '0987654321',
        members: [{ fullName: 'Trần Văn Ví', phone: '0987654321', isCaptain: true }],
        paymentMethod: 'INTERNAL_WALLET',
        idempotencyKey: 'idemp-team-reg-wallet',
      };

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto),
      ).rejects.toThrow(/WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT/);
    });

    it('should return existing team on identical idempotencyKey (idempotent replay)', async () => {
      const dto = {
        teamName: 'FC Tái Hiện',
        captainName: 'Phạm Văn Trưởng',
        captainPhone: '0903334444',
        members: [{ fullName: 'Phạm Văn Trưởng', phone: '0903334444', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-team-replay-key',
      };

      const first = await service.registerTeam(tournamentId.toString(), captainId.toString(), dto);
      const second = await service.registerTeam(tournamentId.toString(), captainId.toString(), dto);

      expect(first._id.toString()).toBe(second._id.toString());
      expect(inMemoryTournaments[0].currentTeamCount).toBe(3); // Increment only once
    });

    it('should reject when registration deadline has passed', async () => {
      inMemoryTournaments[0].registrationEndDate = new Date(Date.now() - 3600000); // 1 hour ago

      const dto = {
        teamName: 'FC Trễ Hạn',
        captainName: 'Nguyễn Trễ',
        captainPhone: '0901112222',
        members: [{ fullName: 'Nguyễn Trễ', phone: '0901112222', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-deadline-passed',
      };

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto),
      ).rejects.toThrow(/registration deadline has passed/);
    });

    it('should reject duplicate team name within the same tournament', async () => {
      const dto1 = {
        teamName: 'FC Trùng Tên',
        captainName: 'Đội Trưởng 1',
        captainPhone: '0901111111',
        members: [{ fullName: 'Đội Trưởng 1', phone: '0901111111', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-duplicate-1',
      };
      await service.registerTeam(tournamentId.toString(), captainId.toString(), dto1);

      const dto2 = {
        teamName: 'FC Trùng Tên',
        captainName: 'Đội Trưởng 2',
        captainPhone: '0902222222',
        members: [{ fullName: 'Đội Trưởng 2', phone: '0902222222', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-duplicate-2',
      };

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto2),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject when tournament team capacity is reached (TOURNAMENT_TEAMS_FULL)', async () => {
      inMemoryTournaments[0].currentTeamCount = 8;
      inMemoryTournaments[0].maxTeams = 8;

      const dto = {
        teamName: 'FC Hết Chỗ',
        captainName: 'Đội Trưởng Hết',
        captainPhone: '0909999999',
        members: [{ fullName: 'Đội Trưởng Hết', phone: '0909999999', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-teams-full',
      };

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.registerTeam(tournamentId.toString(), captainId.toString(), dto),
      ).rejects.toThrow(/TOURNAMENT_TEAMS_FULL/);
    });
  });

  describe('withdrawTeam', () => {
    it('should successfully withdraw a team before deadline and decrement team count', async () => {
      const registerDto = {
        teamName: 'FC Rút Lui',
        captainName: 'Đội Trưởng Rút',
        captainPhone: '0908887777',
        members: [{ fullName: 'Đội Trưởng Rút', phone: '0908887777', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        cashierShiftId: shiftId.toString(),
        idempotencyKey: 'idemp-withdraw-test',
      };
      const team = await service.registerTeam(tournamentId.toString(), captainId.toString(), registerDto);
      expect(inMemoryTournaments[0].currentTeamCount).toBe(3);

      const withdrawDto = {
        reason: 'Thiếu người thi đấu',
        idempotencyKey: 'idemp-withdraw-action',
      };

      const withdrawnTeam = await service.withdrawTeam(
        team._id.toString(),
        captainId.toString(),
        withdrawDto,
      );

      expect(withdrawnTeam.status).toBe(TournamentTeamStatus.WITHDRAWN);
      expect(inMemoryTournaments[0].currentTeamCount).toBe(2);
      expect(mockCashierShiftService.recordOrderRefund).toHaveBeenCalledWith(
        shiftId.toString(),
        1500000,
        PaymentMethod.CASH,
      );
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('should reject withdrawal when bracket has already been generated', async () => {
      const registerDto = {
        teamName: 'FC Sau Nhánh Đấu',
        captainName: 'Đội Trưởng',
        captainPhone: '0905556666',
        members: [{ fullName: 'Đội Trưởng', phone: '0905556666', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-withdraw-post-bracket',
      };
      const team = await service.registerTeam(tournamentId.toString(), captainId.toString(), registerDto);

      // Change status to BRACKET_GENERATED
      inMemoryTournaments[0].status = TournamentStatus.BRACKET_GENERATED;

      await expect(
        service.withdrawTeam(team._id.toString(), captainId.toString(), {
          idempotencyKey: 'idemp-withdraw-fail',
        }),
      ).rejects.toThrow(/CANNOT_WITHDRAW_AFTER_BRACKET_GENERATION/);
    });

    it('should reject withdrawal if team is already withdrawn', async () => {
      const registerDto = {
        teamName: 'FC Đã Rút',
        captainName: 'Đội Trưởng',
        captainPhone: '0901231231',
        members: [{ fullName: 'Đội Trưởng', phone: '0901231231', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-already-withdrawn',
      };
      const team = await service.registerTeam(tournamentId.toString(), captainId.toString(), registerDto);

      await service.withdrawTeam(team._id.toString(), captainId.toString(), {
        idempotencyKey: 'idemp-withdraw-1',
      });

      await expect(
        service.withdrawTeam(team._id.toString(), captainId.toString(), {
          idempotencyKey: 'idemp-withdraw-2',
        }),
      ).rejects.toThrow(/TEAM_ALREADY_WITHDRAWN/);
    });

    it('should reject withdrawal by non-captain non-admin user', async () => {
      const registerDto = {
        teamName: 'FC Bảo Mật',
        captainName: 'Đội Trưởng',
        captainPhone: '0909990000',
        members: [{ fullName: 'Đội Trưởng', phone: '0909990000', isCaptain: true }],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: 'idemp-security-test',
      };
      const team = await service.registerTeam(tournamentId.toString(), captainId.toString(), registerDto);

      const hackerId = new Types.ObjectId();
      await expect(
        service.withdrawTeam(team._id.toString(), hackerId.toString(), {
          idempotencyKey: 'idemp-hacker-withdraw',
        }),
      ).rejects.toThrow(/FORBIDDEN_WITHDRAWAL/);
    });
  });
});
