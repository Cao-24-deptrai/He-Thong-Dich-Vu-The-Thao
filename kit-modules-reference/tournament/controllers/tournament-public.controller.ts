import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TournamentService } from '../services/tournament.service.js';
import { TournamentRegistrationService } from '../services/tournament-registration.service.js';
import { TournamentBracketService } from '../services/tournament-bracket.service.js';
import { CurrentUser, JwtAuthGuard } from '../../auth/index.js';
import {
  TournamentListQueryDto,
  RegisterTournamentTeamDto,
  WithdrawTeamDto,
} from '@sports/contracts';

@Controller('tournaments')
export class TournamentPublicController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly registrationService: TournamentRegistrationService,
    private readonly bracketService: TournamentBracketService,
  ) {}

  @Get()
  async listTournaments(@Query() query: TournamentListQueryDto) {
    return this.tournamentService.listTournaments(query);
  }

  @Get(':id')
  async getTournamentDetail(@Param('id') id: string) {
    return this.tournamentService.getTournamentById(id);
  }

  @Get(':id/bracket')
  async getTournamentBracket(@Param('id') id: string) {
    return this.bracketService.getBracket(id);
  }

  @Get(':id/matches')
  async getTournamentMatches(@Param('id') id: string) {
    const { matches } = await this.bracketService.getBracket(id);
    return matches;
  }

  @Get(':id/teams')
  async listTeams(@Param('id') id: string) {
    return this.registrationService.listTeams(id);
  }

  @Post(':id/teams/register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async registerTeam(
    @Param('id') id: string,
    @Body() dto: RegisterTournamentTeamDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.registrationService.registerTeam(id, user.id, dto);
  }

  @Post('teams/:teamId/withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawTeam(
    @Param('teamId') teamId: string,
    @Body() dto: WithdrawTeamDto,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    return this.registrationService.withdrawTeam(teamId, user.id, dto, isAdminOrManager);
  }
}
