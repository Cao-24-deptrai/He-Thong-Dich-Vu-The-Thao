import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TournamentRegistrationService } from './tournament-registration.service.js';
import { Tournament } from '../schemas/tournament.schema.js';
import { TournamentTeam } from '../schemas/tournament-team.schema.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  TournamentStatus,
  PaymentMethod,
  TournamentType,
  TournamentFormat,
} from '@sports/shared';

describe('TournamentRegistrationService Concurrency Defense (20 Concurrent Teams for 2 Last Tournament Slots Race)', () => {
  let service: TournamentRegistrationService;

  const inMemoryTournaments: any[] = [];
  const inMemoryTeams: any[] = [];
  const tournamentId = new Types.ObjectId();

  beforeEach(async () => {
    inMemoryTournaments.length = 0;
    inMemoryTeams.length = 0;

    // Khởi tạo giải đấu có quy mô 16 đội, hiện tại đã có 14 đội (chỉ còn đúng 2 suất)
    inMemoryTournaments.push({
      _id: tournamentId,
      code: 'CUP-VODICH-2026',
      name: 'Giải Vô Địch Sân 7 Mùa Hè 2026',
      type: TournamentType.SPORT,
      sportOrGame: 'Bóng đá 7 người',
      format: TournamentFormat.SINGLE_ELIMINATION,
      minTeams: 4,
      maxTeams: 16,
      currentTeamCount: 14,
      teamSize: 7,
      entryFee: 1000000,
      prizePool: 20000000,
      registrationStartDate: new Date(Date.now() - 7 * 86400000),
      registrationEndDate: new Date(Date.now() + 7 * 86400000),
      tournamentStartDate: new Date(Date.now() + 10 * 86400000),
      tournamentEndDate: new Date(Date.now() + 14 * 86400000),
      status: TournamentStatus.REGISTRATION_OPEN,
    });

    let lock = Promise.resolve();

    const mockTournamentModel: any = {
      findById: jest.fn().mockImplementation((id) => {
        const found = inMemoryTournaments.find((t) => t._id.toString() === id.toString());
        return { exec: jest.fn().mockResolvedValue(found ? { ...found } : null) };
      }),
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        const promise = new Promise((resolve) => {
          lock = lock.then(async () => {
            // Thêm jitter mô phỏng độ trễ I/O luồng đồng thời
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

            const target = inMemoryTournaments.find((t) => {
              if (t._id.toString() !== query._id.toString()) return false;
              if (query.status && t.status !== query.status) return false;
              if (query.currentTeamCount?.$lt !== undefined && t.currentTeamCount >= query.currentTeamCount.$lt) {
                return false;
              }
              return true;
            });

            if (!target) {
              resolve(null);
              return;
            }

            if (update.$inc?.currentTeamCount) {
              target.currentTeamCount += update.$inc.currentTeamCount;
            }

            resolve({ ...target });
          });
        });
        return { exec: () => promise };
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

    mockTeamModel.findOne = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(null),
    }));

    const mockCashierShiftService = {
      recordOrderSales: jest.fn().mockResolvedValue(undefined),
    };

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

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
  });

  it('20 concurrent teams registering for 2 remaining tournament slots -> exactly 2 succeed, 18 rejected with TOURNAMENT_TEAMS_FULL', async () => {
    const concurrentRequests = 20;

    const registrationPromises = Array.from({ length: concurrentRequests }, (_, i) => {
      const captainId = new Types.ObjectId().toString();
      const dto = {
        teamName: `FC Concurrency Team ${i + 1}`,
        captainName: `Captain ${i + 1}`,
        captainPhone: `09012345${i.toString().padStart(2, '0')}`,
        members: [
          {
            fullName: `Captain ${i + 1}`,
            phone: `09012345${i.toString().padStart(2, '0')}`,
            isCaptain: true,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        idempotencyKey: `idemp-race-team-${i + 1}`,
      };

      return service
        .registerTeam(tournamentId.toString(), captainId, dto)
        .then((res) => ({ success: true as const, team: res }))
        .catch((err) => ({ success: false as const, error: err }));
    });

    const results = await Promise.all(registrationPromises);

    const successfulRegistrations = results.filter((r): r is { success: true; team: any } => r.success);
    const rejectedRegistrations = results.filter((r): r is { success: false; error: any } => !r.success);

    // Exactly 2 must succeed
    expect(successfulRegistrations).toHaveLength(2);

    // Exactly 18 must be rejected
    expect(rejectedRegistrations).toHaveLength(18);

    // All rejections must be due to TOURNAMENT_TEAMS_FULL
    for (const rejected of rejectedRegistrations) {
      expect(rejected.error).toBeInstanceOf(BadRequestException);
      expect(rejected.error.message).toMatch(/TOURNAMENT_TEAMS_FULL/);
    }

    // Exactly 2 teams saved in memory
    expect(inMemoryTeams).toHaveLength(2);

    // Final currentTeamCount in tournament must be exactly 16 (never oversold to 17 or 34!)
    expect(inMemoryTournaments[0].currentTeamCount).toBe(16);
  });
});
