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
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  RegisterTournamentTeamDto,
  WithdrawTeamDto,
} from '@sports/contracts';
import {
  TournamentStatus,
  TournamentTeamStatus,
  PaymentMethod,
} from '@sports/shared';

@Injectable()
export class TournamentRegistrationService {
  private readonly logger = new Logger(TournamentRegistrationService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(TournamentTeam.name)
    private readonly teamModel: Model<TournamentTeamDocument>,
    @Optional() private readonly cashierShiftService?: CashierShiftService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  /**
   * F16.2: Đăng ký đội & Thu lệ phí tham gia giải đấu
   */
  async registerTeam(
    tournamentId: string,
    captainId: string,
    dto: RegisterTournamentTeamDto,
  ): Promise<TournamentTeamDocument> {
    // 1. Idempotency Check (SPEC Rule: Replay existing result on identical idempotencyKey)
    const existingByIdempotency = await this.teamModel.findOne({
      idempotencyKey: dto.idempotencyKey,
    }).exec();
    if (existingByIdempotency) {
      this.logger.log(`Idempotent replay for team registration key: ${dto.idempotencyKey}`);
      return existingByIdempotency;
    }

    // 2. Fetch Tournament & Validate Status
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${tournamentId}`);
    }

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException(
        `Tournament registration is not open (status: ${tournament.status})`,
      );
    }

    if (new Date() > tournament.registrationEndDate) {
      throw new BadRequestException(
        `Tournament registration deadline has passed (${tournament.registrationEndDate.toISOString()})`,
      );
    }

    // 3. Invariant: WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT
    // Lệ phí thi đấu giải thể thao/esports bắt buộc thanh toán bằng Tiền mặt hoặc VietQR.
    // Tuyệt đối cấm thanh toán bằng ví nội bộ.
    const paymentMethodUpper = (dto.paymentMethod as string).toUpperCase();
    if (
      dto.paymentMethod === PaymentMethod.INTERNAL_WALLET ||
      paymentMethodUpper === 'WALLET' ||
      paymentMethodUpper === 'INTERNAL_WALLET'
    ) {
      throw new BadRequestException(
        'WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT: Tournament entry fees cannot be paid using internal wallet. Must use CASH or VIETQR.',
      );
    }

    // 4. Duplicate Team Name Check within Tournament
    const duplicateTeamName = await this.teamModel.findOne({
      tournamentId: new Types.ObjectId(tournamentId),
      teamName: dto.teamName,
      status: { $ne: TournamentTeamStatus.WITHDRAWN },
    }).exec();

    if (duplicateTeamName) {
      throw new ConflictException(
        `TEAM_NAME_ALREADY_EXISTS: Team name "${dto.teamName}" is already registered in this tournament`,
      );
    }

    // 5. Atomic Slot Increment with Concurrency Protection
    // Ensures currentTeamCount < maxTeams under high concurrency race conditions
    const updatedTournament = await this.tournamentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(tournamentId),
        status: TournamentStatus.REGISTRATION_OPEN,
        currentTeamCount: { $lt: tournament.maxTeams },
      },
      {
        $inc: { currentTeamCount: 1 },
      },
      { new: true },
    ).exec();

    if (!updatedTournament) {
      throw new BadRequestException(
        'TOURNAMENT_TEAMS_FULL: Tournament has reached the maximum number of teams',
      );
    }

    // 6. Record Cashier Shift Sales if Paid in Cash
    if (dto.cashierShiftId && this.cashierShiftService && tournament.entryFee > 0) {
      try {
        await this.cashierShiftService.recordOrderSales(
          dto.cashierShiftId,
          tournament.entryFee,
          dto.paymentMethod,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to record cashier shift sales: ${err.message}`);
      }
    }

    // 7. Create & Save Team
    const team = new this.teamModel({
      tournamentId: new Types.ObjectId(tournamentId),
      teamName: dto.teamName,
      captainId: new Types.ObjectId(captainId),
      captainName: dto.captainName,
      captainPhone: dto.captainPhone,
      logoUrl: dto.logoUrl,
      members: dto.members.map((m) => ({
        userId: m.userId ? new Types.ObjectId(m.userId) : undefined,
        fullName: m.fullName,
        phone: m.phone,
        inGameNameOrJerseyNumber: m.inGameNameOrJerseyNumber,
        isCaptain: m.isCaptain,
      })),
      entryFeePaid: tournament.entryFee,
      paymentMethod: dto.paymentMethod,
      cashierShiftId: dto.cashierShiftId ? new Types.ObjectId(dto.cashierShiftId) : undefined,
      status: TournamentTeamStatus.CONFIRMED,
      idempotencyKey: dto.idempotencyKey,
    });

    const savedTeam = await team.save();

    // 8. Audit Log
    if (this.auditLogService) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_TEAM_REGISTERED',
        actorId: captainId,
        targetType: 'TournamentTeam',
        targetId: savedTeam._id.toString(),
        after: {
          tournamentId,
          teamName: savedTeam.teamName,
          entryFeePaid: savedTeam.entryFeePaid,
          paymentMethod: savedTeam.paymentMethod,
        },
      });
    }

    this.logger.log(`Team [${savedTeam.teamName}] registered for tournament [${tournament.name}]`);
    return savedTeam;
  }

  /**
   * F16.3: Rút lui khỏi giải đấu và hoàn lệ phí trước khi đóng đăng ký
   */
  async withdrawTeam(
    teamId: string,
    actorId: string,
    dto: WithdrawTeamDto,
    isAdminOrManager = false,
  ): Promise<TournamentTeamDocument> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException(`Tournament team not found: ${teamId}`);
    }

    if (team.status === TournamentTeamStatus.WITHDRAWN) {
      throw new BadRequestException('TEAM_ALREADY_WITHDRAWN: This team has already withdrawn');
    }

    // Permission check: Captain or Admin/Manager
    if (!isAdminOrManager && team.captainId.toString() !== actorId) {
      throw new BadRequestException('FORBIDDEN_WITHDRAWAL: Only the team captain or manager can withdraw');
    }

    // Check tournament status
    const tournament = await this.tournamentModel.findById(team.tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${team.tournamentId}`);
    }

    if (
      tournament.status === TournamentStatus.BRACKET_GENERATED ||
      tournament.status === TournamentStatus.ONGOING ||
      tournament.status === TournamentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'CANNOT_WITHDRAW_AFTER_BRACKET_GENERATION: Cannot withdraw once the bracket has been generated or tournament is ongoing',
      );
    }

    if (!isAdminOrManager && new Date() > tournament.registrationEndDate) {
      throw new BadRequestException(
        'REGISTRATION_CLOSED_CANNOT_WITHDRAW: Cannot withdraw after the registration deadline',
      );
    }

    // Mark as withdrawn
    team.status = TournamentTeamStatus.WITHDRAWN;
    const updatedTeam = await team.save();

    // Decrement tournament currentTeamCount atomically
    await this.tournamentModel.updateOne(
      { _id: team.tournamentId, currentTeamCount: { $gt: 0 } },
      { $inc: { currentTeamCount: -1 } },
    ).exec();

    // If shift was recorded and fee was paid, record refund in cashier shift
    if (team.cashierShiftId && this.cashierShiftService && team.entryFeePaid > 0) {
      try {
        await this.cashierShiftService.recordOrderRefund(
          team.cashierShiftId.toString(),
          team.entryFeePaid,
          team.paymentMethod,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to record shift refund: ${err.message}`);
      }
    }

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_TEAM_WITHDRAWN',
        actorId,
        targetType: 'TournamentTeam',
        targetId: team._id.toString(),
        after: {
          tournamentId: tournament._id.toString(),
          teamName: team.teamName,
          refundedAmount: team.entryFeePaid,
          reason: dto.reason,
        },
      });
    }

    this.logger.log(`Team [${team.teamName}] withdrew from tournament [${tournament.name}]`);
    return updatedTeam;
  }

  async listTeams(tournamentId: string): Promise<TournamentTeamDocument[]> {
    return this.teamModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async getTeamById(teamId: string): Promise<TournamentTeamDocument> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException(`Team not found: ${teamId}`);
    }
    return team;
  }
}
