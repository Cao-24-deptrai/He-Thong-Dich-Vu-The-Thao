import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TournamentBracketService } from './tournament-bracket.service.js';
import { Tournament } from '../schemas/tournament.schema.js';
import { TournamentTeam } from '../schemas/tournament-team.schema.js';
import { TournamentMatch } from '../schemas/tournament-match.schema.js';
import { TournamentStanding } from '../schemas/tournament-standing.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  TournamentStatus,
  TournamentTeamStatus,
  TournamentMatchStatus,
  TournamentFormat,
  TournamentType,
  PaymentMethod,
} from '@sports/shared';

describe('TournamentBracketService', () => {
  let service: TournamentBracketService;

  const tournamentId = new Types.ObjectId();
  const courtId = new Types.ObjectId();
  const gamingMachine1 = new Types.ObjectId();
  const gamingMachine2 = new Types.ObjectId();

  let inMemoryTournaments: any[] = [];
  let inMemoryTeams: any[] = [];
  let inMemoryMatches: any[] = [];
  let inMemoryStandings: any[] = [];

  const mockAuditLogService = {
    record: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
  };

  beforeEach(async () => {
    inMemoryTournaments = [
      {
        _id: tournamentId,
        code: 'CUP-TET-2026',
        name: 'Giải Đấu Mùa Xuân 2026',
        type: TournamentType.SPORT,
        sportOrGame: 'Bóng đá sân 7',
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
        maxTeams: 8,
        currentTeamCount: 4,
        teamSize: 7,
        entryFee: 1000000,
        prizePool: 6000000,
        registrationStartDate: new Date(Date.now() - 5 * 86400000),
        registrationEndDate: new Date(Date.now() - 1 * 86400000),
        tournamentStartDate: new Date(Date.now() + 2 * 86400000),
        tournamentEndDate: new Date(Date.now() + 5 * 86400000),
        status: TournamentStatus.REGISTRATION_CLOSED,
        save: jest.fn().mockImplementation(async function (this: any) {
          return this;
        }),
      },
    ];

    inMemoryTeams = [
      {
        _id: new Types.ObjectId(),
        tournamentId,
        teamName: 'Đội Alpha',
        captainId: new Types.ObjectId(),
        captainName: 'Nguyễn Văn A',
        captainPhone: '0901111111',
        entryFeePaid: 1000000,
        paymentMethod: PaymentMethod.CASH,
        status: TournamentTeamStatus.CONFIRMED,
        idempotencyKey: 'seed-team-1',
      },
      {
        _id: new Types.ObjectId(),
        tournamentId,
        teamName: 'Đội Beta',
        captainId: new Types.ObjectId(),
        captainName: 'Trần Văn B',
        captainPhone: '0902222222',
        entryFeePaid: 1000000,
        paymentMethod: PaymentMethod.CASH,
        status: TournamentTeamStatus.CONFIRMED,
        idempotencyKey: 'seed-team-2',
      },
      {
        _id: new Types.ObjectId(),
        tournamentId,
        teamName: 'Đội Gamma',
        captainId: new Types.ObjectId(),
        captainName: 'Lê Văn C',
        captainPhone: '0903333333',
        entryFeePaid: 1000000,
        paymentMethod: PaymentMethod.CASH,
        status: TournamentTeamStatus.CONFIRMED,
        idempotencyKey: 'seed-team-3',
      },
      {
        _id: new Types.ObjectId(),
        tournamentId,
        teamName: 'Đội Delta',
        captainId: new Types.ObjectId(),
        captainName: 'Phạm Văn D',
        captainPhone: '0904444444',
        entryFeePaid: 1000000,
        paymentMethod: PaymentMethod.CASH,
        status: TournamentTeamStatus.CONFIRMED,
        idempotencyKey: 'seed-team-4',
      },
    ];

    inMemoryMatches = [];
    inMemoryStandings = [];

    const mockTournamentModel: any = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryTournaments.find((t) => t._id.toString() === id.toString()) || null,
        ),
      })),
      updateOne: jest.fn().mockImplementation((query, update) => {
        const t = inMemoryTournaments.find((item) => item._id.toString() === query._id.toString());
        if (t && update.$set?.status) {
          t.status = update.$set.status;
        }
        return { exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
      }),
    };

    const mockTeamModel: any = {
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          inMemoryTeams.filter(
            (t) =>
              t.tournamentId.toString() === query.tournamentId.toString() &&
              (!query.status || t.status === query.status),
          ),
        ),
      })),
      updateOne: jest.fn().mockImplementation((query, update) => {
        const t = inMemoryTeams.find((item) => item._id.toString() === query._id.toString());
        if (t && update.$set?.seedNumber) {
          t.seedNumber = update.$set.seedNumber;
        }
        return { exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
      }),
    };

    const mockMatchModel: any = function (data: any) {
      const doc = {
        ...data,
        _id: new Types.ObjectId(),
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryMatches.findIndex((m) => m._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryMatches[idx] = this;
          else inMemoryMatches.push(this);
          return this;
        }),
      };
      return doc;
    };

    mockMatchModel.find = jest.fn().mockImplementation((query) => {
      let results = [...inMemoryMatches];
      if (query.tournamentId) {
        results = results.filter((m) => m.tournamentId.toString() === query.tournamentId.toString());
      }
      if (query.resourceId) {
        results = results.filter((m) => m.resourceId?.toString() === query.resourceId.toString());
      }
      if (query.gamingMachineIds?.$in) {
        const filterIds = query.gamingMachineIds.$in.map((id: any) => id.toString());
        results = results.filter((m) =>
          m.gamingMachineIds?.some((mid: any) => filterIds.includes(mid.toString())),
        );
      }
      if (query.status?.$ne) {
        results = results.filter((m) => m.status !== query.status.$ne);
      }
      if (query._id?.$ne) {
        results = results.filter((m) => m._id.toString() !== query._id.$ne.toString());
      }
      return {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(results),
        }),
        exec: jest.fn().mockResolvedValue(results),
      };
    });

    mockMatchModel.findById = jest.fn().mockImplementation((id) => {
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
    });

    mockMatchModel.countDocuments = jest.fn().mockImplementation((query) => {
      let results = inMemoryMatches.filter(
        (m) => m.tournamentId.toString() === query.tournamentId.toString(),
      );
      if (query.status?.$in) {
        results = results.filter((m) => query.status.$in.includes(m.status));
      }
      return { exec: jest.fn().mockResolvedValue(results.length) };
    });

    const mockStandingModel: any = function (data: any) {
      const doc = {
        ...data,
        _id: new Types.ObjectId(),
        save: jest.fn().mockImplementation(async function (this: any) {
          inMemoryStandings.push(this);
          return this;
        }),
      };
      return doc;
    };

    mockStandingModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          inMemoryStandings.filter((s) => s.tournamentId.toString() === query.tournamentId.toString()),
        ),
      }),
    }));

    mockStandingModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const s = inMemoryStandings.find(
        (item) =>
          item.tournamentId.toString() === query.tournamentId.toString() &&
          item.teamId.toString() === query.teamId.toString(),
      );
      if (s && update.$inc) {
        s.matchesPlayed += update.$inc.matchesPlayed || 0;
        s.won += update.$inc.won || 0;
        s.drawn += update.$inc.drawn || 0;
        s.lost += update.$inc.lost || 0;
        s.points += update.$inc.points || 0;
        s.goalsFor += update.$inc.goalsFor || 0;
        s.goalsAgainst += update.$inc.goalsAgainst || 0;
        s.goalDifference += update.$inc.goalDifference || 0;
      }
      return { exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    });

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
    jest.clearAllMocks();
  });

  describe('generateBracket', () => {
    it('should generate a 4-team single elimination bracket with 3 matches and linked nextMatchId', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), {
        seedType: 'RANDOM',
      });

      // 4 teams -> Round 1 has 2 semi-finals (R1M1, R1M2), Round 2 has 1 final (FINAL)
      expect(matches).toHaveLength(3);

      const r1Matches = matches.filter((m) => m.round === 1);
      const finalMatch = matches.find((m) => m.round === 2);

      expect(r1Matches).toHaveLength(2);
      expect(finalMatch).toBeDefined();
      expect(finalMatch?.matchCode).toBe('FINAL');

      // Both Round 1 matches must point to finalMatch._id
      expect(r1Matches[0]!.nextMatchId?.toString()).toBe(finalMatch!._id.toString());
      expect(r1Matches[1]!.nextMatchId?.toString()).toBe(finalMatch!._id.toString());

      // Round 1 matches have assigned teams
      expect(r1Matches[0]!.team1Id).toBeDefined();
      expect(r1Matches[0]!.team2Id).toBeDefined();
      expect(r1Matches[1]!.team1Id).toBeDefined();
      expect(r1Matches[1]!.team2Id).toBeDefined();

      expect(inMemoryTournaments[0].status).toBe(TournamentStatus.BRACKET_GENERATED);
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('should generate round robin pairings and standings table for ROUND_ROBIN format', async () => {
      inMemoryTournaments[0].format = TournamentFormat.ROUND_ROBIN;

      const matches = await service.generateBracket(tournamentId.toString(), {
        seedType: 'RANDOM',
      });

      // 4 teams in round robin -> 4 * 3 / 2 = 6 matches
      expect(matches).toHaveLength(6);
      expect(inMemoryStandings).toHaveLength(4);
      expect(inMemoryStandings[0].matchesPlayed).toBe(0);
      expect(inMemoryStandings[0].points).toBe(0);
    });

    it('should reject bracket generation if confirmed teams are less than minTeams', async () => {
      inMemoryTeams.splice(2, 2); // Only 2 teams left
      expect(inMemoryTeams).toHaveLength(2);

      await expect(
        service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' }),
      ).rejects.toThrow(/INSUFFICIENT_TEAMS/);
    });
  });

  describe('scheduleMatch', () => {
    it('should successfully schedule a match with court resource and time slot', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const targetMatch = matches[0]!;

      const dto = {
        scheduledDate: new Date('2026-11-01T00:00:00Z'),
        startTime: '08:00',
        endTime: '09:30',
        resourceId: courtId.toString(),
      };

      const scheduled = await service.scheduleMatch(targetMatch._id.toString(), dto, 'admin-1');

      expect(scheduled.status).toBe(TournamentMatchStatus.SCHEDULED);
      expect(scheduled.startTime).toBe('08:00');
      expect(scheduled.endTime).toBe('09:30');
      expect(scheduled.resourceId?.toString()).toBe(courtId.toString());
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('should reject match scheduling when court has overlapping conflict (RESOURCE_CONFLICT)', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const match1 = matches[0]!;
      const match2 = matches[1]!;

      // Match 1 scheduled at 08:00 - 10:00
      await service.scheduleMatch(match1._id.toString(), {
        scheduledDate: new Date('2026-11-01T00:00:00Z'),
        startTime: '08:00',
        endTime: '10:00',
        resourceId: courtId.toString(),
      });

      // Match 2 attempts to schedule at 09:00 - 11:00 on the same court (Overlaps 09:00-10:00)
      await expect(
        service.scheduleMatch(match2._id.toString(), {
          scheduledDate: new Date('2026-11-01T00:00:00Z'),
          startTime: '09:00',
          endTime: '11:00',
          resourceId: courtId.toString(),
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.scheduleMatch(match2._id.toString(), {
          scheduledDate: new Date('2026-11-01T00:00:00Z'),
          startTime: '09:00',
          endTime: '11:00',
          resourceId: courtId.toString(),
        }),
      ).rejects.toThrow(/RESOURCE_CONFLICT/);
    });

    it('should reject esports match scheduling when gaming machines overlap (RESOURCE_CONFLICT)', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const match1 = matches[0]!;
      const match2 = matches[1]!;

      await service.scheduleMatch(match1._id.toString(), {
        scheduledDate: new Date('2026-11-01T00:00:00Z'),
        startTime: '14:00',
        endTime: '16:00',
        gamingMachineIds: [gamingMachine1.toString(), gamingMachine2.toString()],
      });

      // Match 2 attempts to use machine 1 at overlapping 15:00 - 17:00
      await expect(
        service.scheduleMatch(match2._id.toString(), {
          scheduledDate: new Date('2026-11-01T00:00:00Z'),
          startTime: '15:00',
          endTime: '17:00',
          gamingMachineIds: [gamingMachine1.toString()],
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.scheduleMatch(match2._id.toString(), {
          scheduledDate: new Date('2026-11-01T00:00:00Z'),
          startTime: '15:00',
          endTime: '17:00',
          gamingMachineIds: [gamingMachine1.toString()],
        }),
      ).rejects.toThrow(/RESOURCE_CONFLICT/);
    });
  });

  describe('updateMatchResult & Advancement', () => {
    it('should record score, set winner, and auto-advance winner to next round match', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const r1Match1 = matches.find((m) => m.round === 1 && m.matchNumber === 1)!;
      const finalMatch = matches.find((m) => m.round === 2)!;

      expect(finalMatch.team1Id).toBeUndefined();

      const result = await service.updateMatchResult(
        r1Match1._id.toString(),
        {
          scoreTeam1: 3,
          scoreTeam2: 1,
        },
        'referee-1',
        true,
      );

      expect(result.status).toBe(TournamentMatchStatus.COMPLETED);
      expect(result.scoreTeam1).toBe(3);
      expect(result.scoreTeam2).toBe(1);
      expect(result.winnerTeamId?.toString()).toBe(r1Match1.team1Id?.toString());

      // Auto-advanced to Final match
      const updatedFinal = inMemoryMatches.find((m) => m._id.toString() === finalMatch._id.toString());
      expect(updatedFinal.team1Id?.toString()).toBe(r1Match1.team1Id?.toString());
      expect(updatedFinal.team1Name).toBe(r1Match1.team1Name);
    });

    it('should reject draw in single elimination knockout match (KNOCKOUT_MATCH_CANNOT_DRAW)', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const r1Match1 = matches.find((m) => m.round === 1)!;

      await expect(
        service.updateMatchResult(
          r1Match1._id.toString(),
          { scoreTeam1: 2, scoreTeam2: 2 },
          'referee-1',
          true,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateMatchResult(
          r1Match1._id.toString(),
          { scoreTeam1: 2, scoreTeam2: 2 },
          'referee-1',
          true,
        ),
      ).rejects.toThrow(/KNOCKOUT_MATCH_CANNOT_DRAW/);
    });

    it('should handle forfeit properly', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const r1Match = matches[0]!;

      const result = await service.updateMatchResult(
        r1Match._id.toString(),
        {
          scoreTeam1: 0,
          scoreTeam2: 3,
          isForfeit: true,
          forfeitTeamId: r1Match.team1Id?.toString(),
        },
        'referee-1',
        true,
      );

      expect(result.status).toBe(TournamentMatchStatus.FORFEIT);
      expect(result.winnerTeamId?.toString()).toBe(r1Match.team2Id?.toString());
      expect(result.loserTeamId?.toString()).toBe(r1Match.team1Id?.toString());
    });

    it('should reject result modification by non-admin if match is already completed', async () => {
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const r1Match = matches[0]!;

      // Complete the match first as admin
      await service.updateMatchResult(
        r1Match._id.toString(),
        { scoreTeam1: 2, scoreTeam2: 1 },
        'admin-1',
        true,
      );

      // Attempt to modify as non-admin
      await expect(
        service.updateMatchResult(
          r1Match._id.toString(),
          { scoreTeam1: 3, scoreTeam2: 1 },
          'customer-1',
          false,
        ),
      ).rejects.toThrow(/RESULT_MODIFICATION_FORBIDDEN/);
    });

    it('should update standings points and goal differences for Round Robin matches', async () => {
      inMemoryTournaments[0].format = TournamentFormat.ROUND_ROBIN;
      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });
      const match1 = matches[0]!;

      await service.updateMatchResult(
        match1._id.toString(),
        { scoreTeam1: 4, scoreTeam2: 2 },
        'referee-1',
        true,
      );

      const team1Standing = inMemoryStandings.find(
        (s) => s.teamId.toString() === match1.team1Id?.toString(),
      );
      const team2Standing = inMemoryStandings.find(
        (s) => s.teamId.toString() === match1.team2Id?.toString(),
      );

      expect(team1Standing.matchesPlayed).toBe(1);
      expect(team1Standing.won).toBe(1);
      expect(team1Standing.points).toBe(3);
      expect(team1Standing.goalsFor).toBe(4);
      expect(team1Standing.goalsAgainst).toBe(2);
      expect(team1Standing.goalDifference).toBe(2);

      expect(team2Standing.matchesPlayed).toBe(1);
      expect(team2Standing.lost).toBe(1);
      expect(team2Standing.points).toBe(0);
      expect(team2Standing.goalsFor).toBe(2);
      expect(team2Standing.goalsAgainst).toBe(4);
      expect(team2Standing.goalDifference).toBe(-2);
    });
  });

  describe('getTournamentReport', () => {
    it('should calculate accurate financial and match metrics', async () => {
      // 4 teams confirmed, 1 team registered then withdrawn
      inMemoryTeams.push({
        _id: new Types.ObjectId(),
        tournamentId,
        teamName: 'Đội Đã Rút',
        captainId: new Types.ObjectId(),
        captainName: 'Nguyễn Văn Rút',
        captainPhone: '0909998888',
        entryFeePaid: 1000000,
        status: TournamentTeamStatus.WITHDRAWN,
        idempotencyKey: 'withdrawn-report-test',
      });

      const matches = await service.generateBracket(tournamentId.toString(), { seedType: 'RANDOM' });

      // Complete 1 match
      await service.updateMatchResult(
        matches[0]!._id.toString(),
        { scoreTeam1: 2, scoreTeam2: 0 },
        'admin-1',
        true,
      );

      const report = await service.getTournamentReport(tournamentId.toString());

      expect(report.totalTeamsRegistered).toBe(5);
      expect(report.totalTeamsConfirmed).toBe(4);
      expect(report.entryFee).toBe(1000000);
      expect(report.totalEntryFeeCollected).toBe(4000000);
      expect(report.totalEntryFeeRefunded).toBe(1000000);
      expect(report.netEntryFee).toBe(4000000);
      expect(report.prizePool).toBe(6000000);
      expect(report.netOrganizingProfit).toBe(4000000 - 6000000); // -2,000,000
      expect(report.totalMatches).toBe(3);
      expect(report.completedMatches).toBe(1);
    });
  });
});
