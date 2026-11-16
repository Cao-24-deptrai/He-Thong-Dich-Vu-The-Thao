import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tournament, TournamentDocument } from './schemas/tournament.schema';
import { TournamentTeam, TournamentTeamDocument } from './schemas/tournament-team.schema';
import { TournamentMatch, TournamentMatchDocument } from './schemas/tournament-match.schema';
import { TournamentStanding, TournamentStandingDocument } from './schemas/tournament-standing.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  CreateTournamentDto,
  RegisterTournamentTeamDto,
  UpdateMatchResultDto,
  ScheduleMatchDto,
} from './dto/tournaments.dto';
import {
  TournamentStatus,
  TournamentTeamStatus,
  TournamentMatchStatus,
  TournamentBracketType,
  PaymentProvider,
} from '../common/enums';

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(TournamentTeam.name)
    private readonly teamModel: Model<TournamentTeamDocument>,
    @InjectModel(TournamentMatch.name)
    private readonly matchModel: Model<TournamentMatchDocument>,
    @InjectModel(TournamentStanding.name)
    private readonly standingModel: Model<TournamentStandingDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ==================== 1. TOURNAMENT CRUD ====================

  async createTournament(dto: CreateTournamentDto): Promise<Tournament> {
    const existing = await this.tournamentModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException(`Mã giải đấu ${dto.code} đã tồn tại`);
    }

    const tournament = new this.tournamentModel({
      ...dto,
      code: dto.code.toUpperCase(),
      registrationStartDate: new Date(dto.registrationStartDate),
      registrationEndDate: new Date(dto.registrationEndDate),
      tournamentStartDate: new Date(dto.tournamentStartDate),
      tournamentEndDate: new Date(dto.tournamentEndDate),
      status: TournamentStatus.REGISTRATION_OPEN,
    });
    return tournament.save();
  }

  async getTournaments(query?: { type?: string; status?: string }): Promise<Tournament[]> {
    const filter: any = {};
    if (query?.type) filter.type = query.type;
    if (query?.status) filter.status = query.status;
    return this.tournamentModel.find(filter).sort({ tournamentStartDate: 1 }).lean();
  }

  async getTournamentById(id: string): Promise<Tournament> {
    const tournament = await this.tournamentModel.findById(id).lean();
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }
    return tournament;
  }

  // ==================== 2. TEAM REGISTRATION ====================

  async registerTeam(
    tournamentId: string,
    captainId: string,
    dto: RegisterTournamentTeamDto,
  ): Promise<TournamentTeam> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Giải đấu hiện không mở đăng ký');
    }

    // Bất biến F16.2: Tuyệt đối không thanh toán lệ phí giải bằng ví nội bộ
    if (dto.paymentMethod === PaymentProvider.INTERNAL_WALLET) {
      throw new BadRequestException('WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT: Không thể thanh toán lệ phí giải bằng ví nội bộ');
    }

    const teamCount = await this.teamModel.countDocuments({
      tournamentId: new Types.ObjectId(tournamentId),
      status: TournamentTeamStatus.CONFIRMED,
    });

    if (teamCount >= tournament.maxTeams) {
      throw new ConflictException('Giải đấu đã đủ số lượng đội tham gia');
    }

    const captain = await this.userModel.findById(captainId);
    if (!captain) {
      throw new NotFoundException('Không tìm thấy thông tin đội trưởng');
    }

    const existingTeamName = await this.teamModel.findOne({
      tournamentId: new Types.ObjectId(tournamentId),
      teamName: dto.teamName,
    });
    if (existingTeamName) {
      throw new ConflictException('Tên đội đã được đăng ký trong giải đấu này');
    }

    const team = new this.teamModel({
      tournamentId: new Types.ObjectId(tournamentId),
      teamName: dto.teamName,
      captainId: new Types.ObjectId(captainId),
      captainName: captain.fullName,
      captainPhone: captain.phone,
      logoUrl: dto.logoUrl,
      members: dto.members || [],
      entryFeePaid: tournament.entryFee,
      paymentMethod: dto.paymentMethod || PaymentProvider.VIETQR,
      status: TournamentTeamStatus.CONFIRMED,
    });

    return team.save();
  }

  async getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
    return this.teamModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .sort({ createdAt: 1 })
      .lean();
  }

  // ==================== 3. BRACKET GENERATION (F16.4) ====================

  async generateBracket(tournamentId: string): Promise<TournamentMatch[]> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Không tìm thấy giải đấu');
    }

    const existingMatches = await this.matchModel.find({
      tournamentId: new Types.ObjectId(tournamentId),
    });
    if (existingMatches.length > 0) {
      throw new BadRequestException('BRACKET_ALREADY_GENERATED: Sơ đồ nhánh đấu đã được tạo');
    }

    const teams = await this.teamModel.find({
      tournamentId: new Types.ObjectId(tournamentId),
      status: TournamentTeamStatus.CONFIRMED,
    });

    if (teams.length < tournament.minTeams) {
      throw new BadRequestException(
        `INSUFFICIENT_TEAMS: Giải đấu cần tối thiểu ${tournament.minTeams} đội tham gia, hiện có ${teams.length} đội`,
      );
    }

    // 1. Xáo trộn ngẫu nhiên hạt giống (Fisher-Yates shuffle)
    const orderedTeams = [...teams];
    for (let i = orderedTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = orderedTeams[i];
      orderedTeams[i] = orderedTeams[j];
      orderedTeams[j] = temp;
    }

    for (let i = 0; i < orderedTeams.length; i++) {
      orderedTeams[i].seed = i + 1;
      await this.teamModel.updateOne({ _id: orderedTeams[i]._id }, { $set: { seed: i + 1 } });
    }

    // 2. Tính số lượng vòng đấu (lũy thừa 2 lớn hơn hoặc bằng số đội)
    let powerOfTwo = 2;
    while (powerOfTwo < orderedTeams.length) {
      powerOfTwo *= 2;
    }
    const totalRounds = Math.log2(powerOfTwo);

    // 3. Sinh từ Vòng Chung kết ngược về Vòng 1 để gán nextMatchId
    const roundMatches: Record<number, Record<number, TournamentMatchDocument>> = {};
    const createdMatches: TournamentMatchDocument[] = [];

    for (let r = totalRounds; r >= 1; r--) {
      roundMatches[r] = {};
      const matchesInRound = 2 ** (totalRounds - r);

      for (let m = 1; m <= matchesInRound; m++) {
        let bracketType = TournamentBracketType.WINNERS;
        let matchCode = `R${r}M${m}`;
        if (r === totalRounds) {
          bracketType = TournamentBracketType.FINALS;
          matchCode = 'FINAL';
        } else if (r === totalRounds - 1) {
          matchCode = `SF${m}`;
        } else if (r === totalRounds - 2) {
          matchCode = `QF${m}`;
        }

        let nextMatchId: Types.ObjectId | undefined;
        if (r < totalRounds) {
          const parentMatchNumber = Math.ceil(m / 2);
          const parentMatch = roundMatches[r + 1]?.[parentMatchNumber];
          if (parentMatch) {
            nextMatchId = parentMatch._id as Types.ObjectId;
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

        const saved = await match.save();
        roundMatches[r][m] = saved;
        createdMatches.push(saved);
      }
    }

    // 4. Gán các đội ở Round 1 vào các trận đấu
    const round1MatchesCount = 2 ** (totalRounds - 1);
    for (let m = 1; m <= round1MatchesCount; m++) {
      const match = roundMatches[1][m];
      const team1Index = (m - 1) * 2;
      const team2Index = team1Index + 1;

      if (team1Index < orderedTeams.length) {
        match.team1Id = orderedTeams[team1Index]._id as Types.ObjectId;
        match.team1Name = orderedTeams[team1Index].teamName;
      }
      if (team2Index < orderedTeams.length) {
        match.team2Id = orderedTeams[team2Index]._id as Types.ObjectId;
        match.team2Name = orderedTeams[team2Index].teamName;
      }
      await match.save();
    }

    tournament.status = TournamentStatus.BRACKET_GENERATED;
    await tournament.save();

    return this.matchModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .sort({ round: 1, matchNumber: 1 })
      .lean();
  }

  async getMatches(tournamentId: string): Promise<TournamentMatch[]> {
    return this.matchModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .sort({ round: 1, matchNumber: 1 })
      .lean();
  }

  // ==================== 4. MATCH RESULTS & PROGRESSION (F16.6) ====================

  async updateMatchResult(matchId: string, dto: UpdateMatchResultDto): Promise<TournamentMatch> {
    const match = await this.matchModel.findById(matchId);
    if (!match) {
      throw new NotFoundException('Không tìm thấy trận đấu');
    }

    if (!match.team1Id || !match.team2Id) {
      throw new BadRequestException('Trận đấu chưa đủ 2 đội tham gia');
    }

    if (dto.score1 === dto.score2 && !dto.isForfeit) {
      throw new BadRequestException('Trận đấu loại trực tiếp không được có tỷ số hòa');
    }

    match.score1 = dto.score1;
    match.score2 = dto.score2;

    const winnerId = dto.score1 > dto.score2 ? match.team1Id : match.team2Id;
    const winnerName = dto.score1 > dto.score2 ? match.team1Name : match.team2Name;

    match.winnerId = winnerId;
    match.status = dto.isForfeit ? TournamentMatchStatus.FORFEIT : TournamentMatchStatus.COMPLETED;
    const saved = await match.save();

    // Tự động thăng hạng đội thắng lên nhánh đấu kế tiếp
    if (match.nextMatchId) {
      const nextMatch = await this.matchModel.findById(match.nextMatchId);
      if (nextMatch) {
        // Trận đấu lẻ đi vào slot Team 1, trận chẵn đi vào slot Team 2
        if (match.matchNumber % 2 !== 0) {
          nextMatch.team1Id = winnerId;
          nextMatch.team1Name = winnerName;
        } else {
          nextMatch.team2Id = winnerId;
          nextMatch.team2Name = winnerName;
        }
        await nextMatch.save();
      }
    }

    return saved;
  }

  async scheduleMatch(matchId: string, dto: ScheduleMatchDto): Promise<TournamentMatch> {
    const match = await this.matchModel.findById(matchId);
    if (!match) {
      throw new NotFoundException('Không tìm thấy trận đấu');
    }

    match.scheduledStartTime = new Date(dto.scheduledStartTime);
    if (dto.resourceId) {
      match.resourceId = new Types.ObjectId(dto.resourceId);
    }
    return match.save();
  }
}
