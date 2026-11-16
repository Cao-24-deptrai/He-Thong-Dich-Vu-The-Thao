import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TournamentBracketService } from './tournament-bracket.service.js';
import { Tournament } from '../schemas/tournament.schema.js';
import { TournamentTeam } from '../schemas/tournament-team.schema.js';
import { TournamentMatch } from '../schemas/tournament-match.schema.js';
import { TournamentStanding } from '../schemas/tournament-standing.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  TournamentMatchStatus,
  TournamentBracketType,
} from '@sports/shared';

describe('TournamentBracketService Resource Conflict Concurrency Defense (10 Concurrent Match Schedulings on Same Resource)', () => {
  let service: TournamentBracketService;

  const tournamentId = new Types.ObjectId();
  const courtId = new Types.ObjectId();
  const inMemoryMatches: any[] = [];

  beforeEach(async () => {
    inMemoryMatches.length = 0;

    // Tạo 10 trận đấu chưa được xếp lịch
    for (let i = 1; i <= 10; i++) {
      inMemoryMatches.push({
        _id: new Types.ObjectId(),
        tournamentId,
        matchCode: `M${i}`,
        round: 1,
        matchNumber: i,
        bracketType: TournamentBracketType.WINNERS,
        team1Id: new Types.ObjectId(),
        team1Name: `Team ${i}A`,
        team2Id: new Types.ObjectId(),
        team2Name: `Team ${i}B`,
        status: TournamentMatchStatus.SCHEDULED,
      });
    }

    let lock = Promise.resolve();

    const mockMatchModel: any = {
      findById: jest.fn().mockImplementation((id) => {
        const found = inMemoryMatches.find((m) => m._id.toString() === id.toString());
        if (!found) return { exec: jest.fn().mockResolvedValue(null) };
        return {
          exec: jest.fn().mockResolvedValue({
            ...found,
            save: jest.fn().mockImplementation(async function (this: any) {
              const idx = inMemoryMatches.findIndex((m) => m._id.toString() === this._id.toString());
              if (idx >= 0) inMemoryMatches[idx] = this;
              return this;
            }),
          }),
        };
      }),
      find: jest.fn().mockImplementation((query) => {
        const promise = new Promise((resolve) => {
          lock = lock.then(async () => {
            // Thêm jitter mô phỏng độ trễ I/O song song
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

            let results = inMemoryMatches.filter((m) => {
              if (query.resourceId && m.resourceId?.toString() !== query.resourceId.toString()) {
                return false;
              }
              if (query._id?.$ne && m._id.toString() === query._id.$ne.toString()) {
                return false;
              }
              if (query.status?.$ne && m.status === query.status.$ne) {
                return false;
              }
              if (query.scheduledDate?.$gte && (!m.scheduledDate || m.scheduledDate < query.scheduledDate.$gte)) {
                return false;
              }
              return true;
            });

            resolve(results);
          });
        });

        return {
          sort: jest.fn().mockReturnValue({ exec: () => promise }),
          exec: () => promise,
        };
      }),
    };

    const mockTournamentModel: any = {};
    const mockTeamModel: any = {};
    const mockStandingModel: any = {};

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentBracketService,
        { provide: getModelToken(Tournament.name), useValue: mockTournamentModel },
        { provide: getModelToken(TournamentTeam.name), useValue: mockTeamModel },
        { provide: getModelToken(TournamentMatch.name), useValue: mockMatchModel },
        { provide: getModelToken(TournamentStanding.name), useValue: mockStandingModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<TournamentBracketService>(TournamentBracketService);
  });

  it('10 concurrent matches trying to schedule on the exact same court and overlapping time -> exactly 1 succeeds, 9 rejected with RESOURCE_CONFLICT', async () => {
    const scheduledDate = new Date('2026-11-05T00:00:00Z');

    const schedulingPromises = inMemoryMatches.map((match, i) => {
      // Cả 10 trận cùng tranh chấp khung giờ 08:00 - 10:00 trên cùng 1 sân
      const dto = {
        scheduledDate,
        startTime: '08:00',
        endTime: '10:00',
        resourceId: courtId.toString(),
      };

      return service
        .scheduleMatch(match._id.toString(), dto, `admin-${i + 1}`)
        .then((res) => ({ success: true as const, match: res }))
        .catch((err) => ({ success: false as const, error: err }));
    });

    const results = await Promise.all(schedulingPromises);

    const successfulSchedules = results.filter((r): r is { success: true; match: any } => r.success);
    const rejectedSchedules = results.filter((r): r is { success: false; error: any } => !r.success);

    // Exactly 1 must succeed
    expect(successfulSchedules).toHaveLength(1);

    // Exactly 9 must be rejected due to conflict
    expect(rejectedSchedules).toHaveLength(9);

    for (const rejected of rejectedSchedules) {
      expect(rejected.error).toBeInstanceOf(ConflictException);
      expect(rejected.error.message).toMatch(/RESOURCE_CONFLICT/);
    }

    // Only 1 match in memory has resourceId assigned
    const scheduledOnCourt = inMemoryMatches.filter(
      (m) => m.resourceId?.toString() === courtId.toString(),
    );
    expect(scheduledOnCourt).toHaveLength(1);
  });
});
