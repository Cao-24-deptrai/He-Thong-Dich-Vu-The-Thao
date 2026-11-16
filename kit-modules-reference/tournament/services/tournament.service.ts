import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament, TournamentDocument } from '../schemas/tournament.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  TournamentListQueryDto,
} from '@sports/contracts';
import { TournamentStatus } from '@sports/shared';

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async createTournament(dto: CreateTournamentDto, actorId?: string): Promise<TournamentDocument> {
    const entryFee = dto.entryFee ?? 0;
    const prizePool = dto.prizePool ?? 0;

    // 1. Validate Integer VND
    if (!Number.isSafeInteger(entryFee) || entryFee < 0) {
      throw new BadRequestException('entryFee must be a non-negative safe integer VND');
    }
    if (!Number.isSafeInteger(prizePool) || prizePool < 0) {
      throw new BadRequestException('prizePool must be a non-negative safe integer VND');
    }

    // 2. Validate dates
    const regStart = new Date(dto.registrationStartDate).getTime();
    const regEnd = new Date(dto.registrationEndDate).getTime();
    const tmtStart = new Date(dto.tournamentStartDate).getTime();
    const tmtEnd = new Date(dto.tournamentEndDate).getTime();

    if (regStart >= regEnd) {
      throw new BadRequestException('registrationStartDate must be before registrationEndDate');
    }
    if (regEnd > tmtStart) {
      throw new BadRequestException('registrationEndDate cannot be after tournamentStartDate');
    }
    if (tmtStart > tmtEnd) {
      throw new BadRequestException('tournamentStartDate cannot be after tournamentEndDate');
    }

    // 3. Check duplicate code
    const existing = await this.tournamentModel.findOne({ code: dto.code.toUpperCase() }).exec();
    if (existing) {
      throw new BadRequestException(`Tournament with code ${dto.code} already exists`);
    }

    const tournament = new this.tournamentModel({
      ...dto,
      entryFee,
      prizePool,
      code: dto.code.toUpperCase(),
      currentTeamCount: 0,
      status: TournamentStatus.REGISTRATION_OPEN,
    });

    const saved = await tournament.save();

    if (this.auditLogService && actorId) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_CREATED',
        actorId,
        targetType: 'Tournament',
        targetId: saved._id.toString(),
        after: {
          code: saved.code,
          name: saved.name,
          entryFee: saved.entryFee,
          prizePool: saved.prizePool,
        },
      });
    }

    this.logger.log(`Created tournament [${saved.code}] ${saved.name}`);
    return saved;
  }

  async updateTournament(
    id: string,
    dto: UpdateTournamentDto,
    actorId?: string,
  ): Promise<TournamentDocument> {
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${id}`);
    }

    // Invariant: Cannot change format or rules if registration is closed or bracket generated
    if (
      dto.format &&
      dto.format !== tournament.format &&
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN
    ) {
      throw new BadRequestException(
        'Cannot change tournament format once registration has closed or matches have been generated',
      );
    }

    if (dto.entryFee !== undefined) {
      if (!Number.isSafeInteger(dto.entryFee) || dto.entryFee < 0) {
        throw new BadRequestException('entryFee must be a non-negative safe integer VND');
      }
    }
    if (dto.prizePool !== undefined) {
      if (!Number.isSafeInteger(dto.prizePool) || dto.prizePool < 0) {
        throw new BadRequestException('prizePool must be a non-negative safe integer VND');
      }
    }

    Object.assign(tournament, dto);
    if (dto.code) {
      tournament.code = dto.code.toUpperCase();
    }

    const saved = await tournament.save();

    if (this.auditLogService && actorId) {
      await this.auditLogService.record({
        action: 'TOURNAMENT_UPDATED',
        actorId,
        targetType: 'Tournament',
        targetId: saved._id.toString(),
        after: {
          updatedFields: Object.keys(dto),
        },
      });
    }

    return saved;
  }

  async listTournaments(query: TournamentListQueryDto): Promise<{ items: TournamentDocument[]; total: number }> {
    const filter: Record<string, any> = {};

    if (query.type) {
      filter.type = query.type;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
        { sportOrGame: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.tournamentModel.find(filter).sort({ tournamentStartDate: -1 }).skip(skip).limit(limit).exec(),
      this.tournamentModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async getTournamentById(id: string): Promise<TournamentDocument> {
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament not found: ${id}`);
    }
    return tournament;
  }
}
