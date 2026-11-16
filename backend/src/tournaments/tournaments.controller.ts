import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import {
  CreateTournamentDto,
  RegisterTournamentTeamDto,
  UpdateMatchResultDto,
  ScheduleMatchDto,
} from './dto/tournaments.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Tournaments & Leagues (M16)')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách giải đấu thể thao và esports' })
  async getTournaments(@Query('type') type?: string, @Query('status') status?: string) {
    return this.tournamentsService.getTournaments({ type, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thông tin giải đấu' })
  async getTournamentById(@Param('id') id: string) {
    return this.tournamentsService.getTournamentById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo giải đấu mới (Admin/Owner)' })
  async createTournament(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.createTournament(dto);
  }

  @Get(':id/teams')
  @ApiOperation({ summary: 'Danh sách các đội đã đăng ký tham gia giải' })
  async getTournamentTeams(@Param('id') id: string) {
    return this.tournamentsService.getTournamentTeams(id);
  }

  @Post(':id/register-team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đội trưởng đăng ký đội tham gia giải đấu' })
  async registerTeam(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RegisterTournamentTeamDto,
  ) {
    return this.tournamentsService.registerTeam(id, user._id || user.id || user.sub, dto);
  }

  @Post(':id/generate-bracket')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bốc thăm ngẫu nhiên & Tự động sinh nhánh đấu (F16.4)' })
  async generateBracket(@Param('id') id: string) {
    return this.tournamentsService.generateBracket(id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Xem toàn bộ nhánh đấu và lịch thi đấu trực quan (F16.7)' })
  async getMatches(@Param('id') id: string) {
    return this.tournamentsService.getMatches(id);
  }

  @Patch('matches/:matchId/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật tỷ số trận đấu & Tự động thăng hạng đội thắng (F16.6)' })
  async updateMatchResult(
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchResultDto,
  ) {
    return this.tournamentsService.updateMatchResult(matchId, dto);
  }

  @Patch('matches/:matchId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xếp lịch & gán sân/máy cho trận đấu (F16.5)' })
  async scheduleMatch(
    @Param('matchId') matchId: string,
    @Body() dto: ScheduleMatchDto,
  ) {
    return this.tournamentsService.scheduleMatch(matchId, dto);
  }
}
