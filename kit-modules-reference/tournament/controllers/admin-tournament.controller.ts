import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TournamentService } from '../services/tournament.service.js';
import { TournamentBracketService } from '../services/tournament-bracket.service.js';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  GenerateBracketDto,
  ScheduleMatchDto,
  UpdateMatchResultDto,
} from '@sports/contracts';

@Controller('admin/tournaments')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminTournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly bracketService: TournamentBracketService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTournament(
    @Body() dto: CreateTournamentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tournamentService.createTournament(dto, user.id);
  }

  @Patch(':id')
  async updateTournament(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tournamentService.updateTournament(id, dto, user.id);
  }

  @Post(':id/generate-bracket')
  @HttpCode(HttpStatus.OK)
  async generateBracket(
    @Param('id') id: string,
    @Body() dto: GenerateBracketDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bracketService.generateBracket(id, dto, user.id);
  }

  @Post('matches/:id/schedule')
  @HttpCode(HttpStatus.OK)
  async scheduleMatch(
    @Param('id') id: string,
    @Body() dto: ScheduleMatchDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bracketService.scheduleMatch(id, dto, user.id);
  }

  @Post('matches/:id/result')
  @HttpCode(HttpStatus.OK)
  async updateMatchResult(
    @Param('id') id: string,
    @Body() dto: UpdateMatchResultDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bracketService.updateMatchResult(id, dto, user.id, true);
  }

  @Get(':id/report')
  async getTournamentReport(@Param('id') id: string) {
    return this.bracketService.getTournamentReport(id);
  }
}
