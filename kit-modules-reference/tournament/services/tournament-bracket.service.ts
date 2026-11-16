import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tournament, TournamentDocument } from '../schemas/tournament.schema.js';
import { TournamentTeam, TournamentTeamDocument } from '../schemas/tournament-team.schema.js';
import { TournamentMatch, TournamentMatchDocument } from '../schemas/tournament-match.schema.js';
import { TournamentStanding, TournamentStandingDocument } from '../schemas/tournament-standing.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  GenerateBracketDto,
  ScheduleMatchDto,
  UpdateMatchResultDto,
  TournamentReportResponse,
} from '@sports/contracts';
import {
  TournamentStatus,
  TournamentTeamStatus,
  TournamentMatchStatus,
  TournamentBracketType,
  TournamentFormat,
} from '@sports/shared';

@Injectable()
export class TournamentBracketService {
  private readonly logger = new Logger(TournamentBracketService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(TournamentTeam.name)
    private readonly teamModel: Model<TournamentTeamDocument>,
    @InjectModel(TournamentMatch.name)
    private readonly matchModel: Model<TournamentMatchDocument>,
    @InjectModel(TournamentStanding.name)
    private readonly standingModel: Model<TournamentStandingDocument>,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  /**
   * F16.4: Bốc thăm & Tự động sinh nhánh đấu
   */
  async generateBracket(
    tournamentId: string,
    dto: GenerateBracketDto,
    actorId?: string,
  ): Promise<TournamentMatchDocument[]> {
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${tournamentId}`);
    }

    // Check if bracket already generated
    const existingMatches = await this.matchModel.find({
      tournamentId: new Types.ObjectId(tournamentId),
    }).exec();

    if (existingMatches.length > 0) {
      throw new BadRequestException('BRACKET_ALREADY_GENERATED: Matches have already been generated for this tournament');
    }

    // Fetch confirmed teams
    const teams = await this.teamModel.find({
      tournamentId: new Types.ObjectId(tournamentId),
      status: TournamentTeamStatus.CONFIRMED,
    }).exec();

    if (teams.length < tournament.minTeams) {
      throw new BadRequestException(
        `INSUFFICIENT_TEAMS: Tournament requires at least ${tournament.minTeams} confirmed teams, but only ${teams.length} registered`,
      );
    }

    // Seed teams
    let orderedTeams = [...teams];
    if (dto.seedType === 'RANDOM') {
      // Fisher-Yates shuffle
      for (let i = orderedTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = orderedTeams[i]!;
        orderedTeams[i] = orderedTeams[j]!;
        orderedTeams[j] = temp;
      }
    } else if (dto.seedType === 'MANUAL' && dto.manualSeeds) {
      orderedTeams.sort((a, b) => {
        const seedA = dto.manualSeeds?.[a._id.toString()] ?? 999;
        const seedB = dto.manualSeeds?.[b._id.toString()] ?? 999;
        return seedA - seedB;
      });
    }

    // Assign seed numbers
    for (let i = 0; i < orderedTeams.length; i++) {
      orderedTeams[i]!.seedNumber = i + 1;
      await this.teamModel.updateOne(
        { _id: orderedTeams[i]!._id },
        { $set: { seedNumber: i + 1 } },
      ).exec();
    }

    let createdMatches: TournamentMatchDocument[] = [];

    if (tournament.format === TournamentFormat.ROUND_ROBIN) {
      // ==================== ROUND ROBIN GENERATION ====================
      // 1. Initialize standings table
      for (const team of orderedTeams) {
        await new this.standingModel({
          tournamentId: new Types.ObjectId(tournamentId),
          groupName: 'MAIN',
          teamId: team._id,
          teamName: team.teamName,
          matchesPlayed: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        }).save();
      }

      // 2. Generate all round robin pairings
      let matchCount = 1;
      for (let i = 0; i < orderedTeams.length; i++) {
        for (let j = i + 1; j < orderedTeams.length; j++) {
          const match = new this.matchModel({
            tournamentId: new Types.ObjectId(tournamentId),
            matchCode: `RR-M${matchCount}`,
            round: 1,
            matchNumber: matchCount,
            bracketType: TournamentBracketType.ROUND_ROBIN,
            team1Id: orderedTeams[i]!._id,
            team1Name: orderedTeams[i]!.teamName,
            team2Id: orderedTeams[j]!._id,
            team2Name: orderedTeams[j]!.teamName,
            status: TournamentMatchStatus.SCHEDULED,
          });
          const savedMatch = await match.save();
          createdMatches.push(savedMatch);
          matchCount++;
        }
      }
    } else {
      // ==================== SINGLE ELIMINATION BRACKET ====================
      // Find power of 2 >= N (e.g., 4, 8, 16...)
      const numTeams = orderedTeams.length;
      let powerOfTwo = 2;
      while (powerOfTwo < numTeams) {
        powerOfTwo *= 2;
      }

      const totalRounds = Math.log2(powerOfTwo);

      // Create tree from Final back to Round 1 to easily link nextMatchId
      // Store matches by round and matchNumber: roundMatches[round][matchNumber]
      const roundMatches: Record<number, Record<number, TournamentMatchDocument>> = {};

      for (let r = totalRounds; r >= 1; r--) {
        roundMatches[r] = {};
        const matchesInRound = 2 ** (totalRounds - r);

        for (let m = 1; m <= matchesInRound; m++) {
          let bracketType = TournamentBracketType.WINNERS;
          let codePrefix = `R${r}`;
          if (r === totalRounds) {
            bracketType = TournamentBracketType.FINALS;
            codePrefix = 'FINAL';
          } else if (r === totalRounds - 1) {
            codePrefix = `SF${m}`;
          } else if (r === totalRounds - 2) {
            codePrefix = `QF${m}`;
          }

          const matchCode = r === totalRounds ? 'FINAL' : `${codePrefix}`;

          // Find parent next match in round r + 1
          let nextMatchId: Types.ObjectId | undefined;
          if (r < totalRounds) {
            const parentMatchNumber = Math.ceil(m / 2);
            const parentMatch = roundMatches[r + 1]?.[parentMatchNumber];
            if (parentMatch) {
              nextMatchId = parentMatch._id;
            }
          }

          const match = new this.matchModel({
            tournamentId: new Types.ObjectId(tournamentId),
            matchCode,
            round: r,
            matchNumber: m,
            bracketType,
            nextMatchId,
            status: TournamentMatchStatus.SCHEDULED,
          });

          // In round 1, assign initial teams
          if (r === 1) {
            const team1Index = (m - 1) * 2;
            const team2Index = team1Index + 1;

            if (team1Index < orderedTeams.length) {
              match.team1Id = orderedTeams[team1Index]!._id;
              match.team1Name = orderedTeams[team1Index]!.teamName;
            }
            if (team2Index < orderedTeams.length) {
              match.team2Id = orderedTeams[team2Index]!._id;
              match.team2Name = orderedTeams[team2Index]!.teamName;
            }
          }

          const savedMatch = await match.save();
          roundMatches[r]![m] = savedMatch;
          createdMatches.push(savedMatch);
        }
      }
    }

    // Sort matches chronologically by round, then matchNumber
    createdMatches.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);

    // Update tournament status
    tournament.status = TournamentStatus.BRACKET_GENERATED;
    await tournament.save();

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_BRACKET_GENERATED',
        actorId: actorId || 'SYSTEM',
        targetType: 'Tournament',
        targetId: tournamentId,
        after: {
          totalMatches: createdMatches.length,
          format: tournament.format,
        },
      });
    }

    this.logger.log(
      `Generated bracket for tournament [${tournament.name}] with ${createdMatches.length} matches`,
    );
    return createdMatches;
  }

  /**
   * F16.5: Xếp lịch thi đấu & Khóa tài nguyên
   * Invariant: Resource Conflict Defense (RESOURCE_CONFLICT)
   * Mỗi trận chỉ được gán duy nhất 1 tài nguyên tại một thời điểm
   */
  async scheduleMatch(
    matchId: string,
    dto: ScheduleMatchDto,
    actorId?: string,
  ): Promise<TournamentMatchDocument> {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException(`Tournament match not found: ${matchId}`);
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be strictly before endTime');
    }

    const scheduledDateObj = new Date(dto.scheduledDate);
    const dayStart = new Date(scheduledDateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDateObj);
    dayEnd.setHours(23, 59, 59, 999);

    // 1. Conflict Check: Physical Resource / Court
    if (dto.resourceId) {
      const conflictingCourtMatches = await this.matchModel.find({
        _id: { $ne: match._id },
        resourceId: new Types.ObjectId(dto.resourceId),
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: TournamentMatchStatus.CANCELLED },
      }).exec();

      const hasCourtConflict = conflictingCourtMatches.some((m) => {
        if (!m.startTime || !m.endTime) return false;
        return dto.startTime < m.endTime && dto.endTime > m.startTime;
      });

      if (hasCourtConflict) {
        throw new ConflictException(
          'RESOURCE_CONFLICT: Court or sports facility resource is already booked for another match during this time window',
        );
      }
    }

    // 2. Conflict Check: Esports Gaming Machines
    if (dto.gamingMachineIds && dto.gamingMachineIds.length > 0) {
      const machineObjectIds = dto.gamingMachineIds.map((id) => new Types.ObjectId(id));
      const conflictingGamingMatches = await this.matchModel.find({
        _id: { $ne: match._id },
        gamingMachineIds: { $in: machineObjectIds },
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: TournamentMatchStatus.CANCELLED },
      }).exec();

      const hasMachineConflict = conflictingGamingMatches.some((m) => {
        if (!m.startTime || !m.endTime) return false;
        return dto.startTime < m.endTime && dto.endTime > m.startTime;
      });

      if (hasMachineConflict) {
        throw new ConflictException(
          'RESOURCE_CONFLICT: One or more gaming stations are already booked for another match during this time window',
        );
      }
    }

    // Update match schedule
    match.scheduledDate = scheduledDateObj;
    match.startTime = dto.startTime;
    match.endTime = dto.endTime;
    match.resourceId = dto.resourceId ? new Types.ObjectId(dto.resourceId) : undefined;
    match.gamingMachineIds = dto.gamingMachineIds?.map((id) => new Types.ObjectId(id)) ?? [];
    match.status = TournamentMatchStatus.SCHEDULED;

    const saved = await match.save();

    if (this.auditLogService) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_MATCH_SCHEDULED',
        actorId: actorId || 'SYSTEM',
        targetType: 'TournamentMatch',
        targetId: match._id.toString(),
        after: {
          scheduledDate: dto.scheduledDate,
          timeWindow: `${dto.startTime}-${dto.endTime}`,
          resourceId: dto.resourceId,
        },
      });
    }

    return saved;
  }

  /**
   * F16.6: Nhập kết quả trận đấu & Cập nhật nhánh đấu
   * Invariant: Chỉ Quản lý (ADMIN/MANAGER) mới được sửa tỉ số đã duyệt, kèm ghi nhận Audit Log
   */
  async updateMatchResult(
    matchId: string,
    dto: UpdateMatchResultDto,
    actorId?: string,
    isAdminOrManager = false,
  ): Promise<TournamentMatchDocument> {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException(`Tournament match not found: ${matchId}`);
    }

    // Invariant: Once completed, modifying results requires Admin/Manager role
    if (
      (match.status === TournamentMatchStatus.COMPLETED || match.status === TournamentMatchStatus.FORFEIT) &&
      !isAdminOrManager
    ) {
      throw new BadRequestException(
        'RESULT_MODIFICATION_FORBIDDEN: Only Admin or Manager can modify confirmed match results',
      );
    }

    if (!match.team1Id || !match.team2Id) {
      throw new BadRequestException('MATCH_TEAMS_INCOMPLETE: Both teams must be set to record result');
    }

    let winnerId: Types.ObjectId | undefined;
    let loserId: Types.ObjectId | undefined;
    let winnerName: string | undefined;

    if (dto.isForfeit) {
      if (dto.forfeitTeamId === match.team1Id.toString()) {
        winnerId = match.team2Id;
        loserId = match.team1Id;
        winnerName = match.team2Name;
      } else {
        winnerId = match.team1Id;
        loserId = match.team2Id;
        winnerName = match.team1Name;
      }
      match.status = TournamentMatchStatus.FORFEIT;
    } else {
      if (dto.scoreTeam1 > dto.scoreTeam2) {
        winnerId = match.team1Id;
        loserId = match.team2Id;
        winnerName = match.team1Name;
      } else if (dto.scoreTeam2 > dto.scoreTeam1) {
        winnerId = match.team2Id;
        loserId = match.team1Id;
        winnerName = match.team2Name;
      } else {
        // Draw
        if (match.bracketType !== TournamentBracketType.ROUND_ROBIN) {
          throw new BadRequestException(
            'KNOCKOUT_MATCH_CANNOT_DRAW: Elimination bracket matches must have a definitive winner',
          );
        }
      }
      match.status = TournamentMatchStatus.COMPLETED;
    }

    match.scoreTeam1 = dto.scoreTeam1;
    match.scoreTeam2 = dto.scoreTeam2;
    match.winnerTeamId = winnerId;
    match.loserTeamId = loserId;

    const savedMatch = await match.save();

    // 1. Advance winner to next match in single elimination bracket
    if (match.nextMatchId && winnerId && winnerName) {
      const nextMatch = await this.matchModel.findById(match.nextMatchId).exec();
      if (nextMatch) {
        if (!nextMatch.team1Id) {
          nextMatch.team1Id = winnerId;
          nextMatch.team1Name = winnerName;
        } else if (!nextMatch.team2Id && nextMatch.team1Id.toString() !== winnerId.toString()) {
          nextMatch.team2Id = winnerId;
          nextMatch.team2Name = winnerName;
        }
        await nextMatch.save();
      }
    }

    // 2. Update standings if Round Robin
    if (match.bracketType === TournamentBracketType.ROUND_ROBIN) {
      const isDraw = dto.scoreTeam1 === dto.scoreTeam2;
      const team1Won = dto.scoreTeam1 > dto.scoreTeam2;

      // Update Team 1 standing
      await this.standingModel.updateOne(
        { tournamentId: match.tournamentId, teamId: match.team1Id },
        {
          $inc: {
            matchesPlayed: 1,
            won: team1Won ? 1 : 0,
            drawn: isDraw ? 1 : 0,
            lost: !team1Won && !isDraw ? 1 : 0,
            points: team1Won ? 3 : isDraw ? 1 : 0,
            goalsFor: dto.scoreTeam1,
            goalsAgainst: dto.scoreTeam2,
            goalDifference: dto.scoreTeam1 - dto.scoreTeam2,
          },
        },
      ).exec();

      // Update Team 2 standing
      const team2Won = dto.scoreTeam2 > dto.scoreTeam1;
      await this.standingModel.updateOne(
        { tournamentId: match.tournamentId, teamId: match.team2Id },
        {
          $inc: {
            matchesPlayed: 1,
            won: team2Won ? 1 : 0,
            drawn: isDraw ? 1 : 0,
            lost: !team2Won && !isDraw ? 1 : 0,
            points: team2Won ? 3 : isDraw ? 1 : 0,
            goalsFor: dto.scoreTeam2,
            goalsAgainst: dto.scoreTeam1,
            goalDifference: dto.scoreTeam2 - dto.scoreTeam1,
          },
        },
      ).exec();
    }

    // 3. Audit Hash Chain Log
    if (this.auditLogService) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_MATCH_RESULT_UPDATED',
        actorId: actorId || 'SYSTEM',
        targetType: 'TournamentMatch',
        targetId: match._id.toString(),
        after: {
          scoreTeam1: dto.scoreTeam1,
          scoreTeam2: dto.scoreTeam2,
          winnerTeamId: winnerId?.toString(),
          isForfeit: dto.isForfeit,
          notes: dto.notes,
        },
      });
    }

    // 4. Check if entire tournament is completed
    const uncompleted = await this.matchModel.countDocuments({
      tournamentId: match.tournamentId,
      status: { $in: [TournamentMatchStatus.SCHEDULED, TournamentMatchStatus.IN_PROGRESS] },
    }).exec();

    if (uncompleted === 0) {
      await this.tournamentModel.updateOne(
        { _id: match.tournamentId },
        { $set: { status: TournamentStatus.COMPLETED } },
      ).exec();
    }

    return savedMatch;
  }

  /**
   * F16.7: Tra cứu sơ đồ nhánh đấu trực quan thời gian thực, bảng xếp hạng và lịch thi đấu
   */
  async getBracket(tournamentId: string): Promise<{
    matches: TournamentMatchDocument[];
    standings: TournamentStandingDocument[];
  }> {
    const [matches, standings] = await Promise.all([
      this.matchModel
        .find({ tournamentId: new Types.ObjectId(tournamentId) })
        .sort({ round: 1, matchNumber: 1 })
        .exec(),
      this.standingModel
        .find({ tournamentId: new Types.ObjectId(tournamentId) })
        .sort({ points: -1, goalDifference: -1, goalsFor: -1 })
        .exec(),
    ]);

    return { matches, standings };
  }

  /**
   * F16.9: Báo cáo tài chính & kết quả giải đấu
   */
  async getTournamentReport(tournamentId: string): Promise<TournamentReportResponse> {
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${tournamentId}`);
    }

    const [allTeams, allMatches] = await Promise.all([
      this.teamModel.find({ tournamentId: new Types.ObjectId(tournamentId) }).exec(),
      this.matchModel.find({ tournamentId: new Types.ObjectId(tournamentId) }).exec(),
    ]);

    const totalTeamsRegistered = allTeams.length;
    const confirmedTeams = allTeams.filter((t) => t.status === TournamentTeamStatus.CONFIRMED);
    const withdrawnTeams = allTeams.filter((t) => t.status === TournamentTeamStatus.WITHDRAWN);

    const totalEntryFeeCollected = confirmedTeams.reduce((sum, t) => sum + t.entryFeePaid, 0);
    const totalEntryFeeRefunded = withdrawnTeams.reduce((sum, t) => sum + t.entryFeePaid, 0);
    const netEntryFee = totalEntryFeeCollected;
    const netOrganizingProfit = netEntryFee - tournament.prizePool;

    const totalMatches = allMatches.length;
    const completedMatches = allMatches.filter(
      (m) => m.status === TournamentMatchStatus.COMPLETED || m.status === TournamentMatchStatus.FORFEIT,
    ).length;

    return {
      tournamentId: tournament._id.toString(),
      code: tournament.code,
      name: tournament.name,
      status: tournament.status,
      totalTeamsRegistered,
      totalTeamsConfirmed: confirmedTeams.length,
      entryFee: tournament.entryFee,
      totalEntryFeeCollected,
      totalEntryFeeRefunded,
      netEntryFee,
      prizePool: tournament.prizePool,
      netOrganizingProfit,
      totalMatches,
      completedMatches,
    };
  }
}
