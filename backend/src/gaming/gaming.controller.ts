import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GamingMachineService } from './gaming-machine.service';
import { GamingSessionService } from './gaming-session.service';
import { GamingGateway } from './gaming.gateway';
import {
  CreateGamingMachineDto,
  StartGamingSessionDto,
  GamingHeartbeatDto,
  EndGamingSessionDto,
  SwitchMachineDto,
  RemoteControlDto,
} from './dto/gaming.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Gaming Zone (M14 - 100 Máy)')
@Controller('gaming')
export class GamingController {
  constructor(
    private readonly machineService: GamingMachineService,
    private readonly sessionService: GamingSessionService,
    private readonly gamingGateway: GamingGateway,
  ) {}

  @Get('machines')
  @ApiOperation({ summary: 'Danh sách máy gaming và sơ đồ trạng thái (F14.1, F14.5)' })
  async getMachines(@Query('zone') zone?: string, @Query('status') status?: string) {
    return this.machineService.getMachines(zone, status);
  }

  @Post('machines/seed-100')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khởi tạo danh mục đủ 100 máy gaming chuẩn theo đặc tả (BR-35)' })
  async seed100Machines() {
    const total = await this.machineService.seed100Machines();
    return { success: true, totalMachines: total };
  }

  @Post('machines')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo máy gaming mới' })
  async createMachine(@Body() dto: CreateGamingMachineDto) {
    return this.machineService.createMachine(dto);
  }

  @Post('sessions/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bắt đầu phiên chơi tại máy gaming (F14.3)' })
  async startSession(@CurrentUser() user: any, @Body() dto: StartGamingSessionDto) {
    return this.sessionService.startSession(user._id || user.id || user.sub, dto);
  }

  @Post('sessions/heartbeat')
  @ApiOperation({ summary: 'Heartbeat định kỳ 30s từ Kiosk Client (F14.9)' })
  async heartbeat(@Body() dto: GamingHeartbeatDto) {
    return this.sessionService.processHeartbeat(dto);
  }

  @Post('sessions/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kết thúc phiên chơi và quyết toán ví (F14.4)' })
  async endSession(@Body() dto: EndGamingSessionDto) {
    return this.sessionService.endSession(dto.sessionCode, dto.reason);
  }

  @Post('sessions/switch-machine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi máy gaming giữ nguyên phiên và tiền tích lũy (F14.6)' })
  async switchMachine(@Body() dto: SwitchMachineDto) {
    return this.sessionService.switchMachine(dto);
  }

  @Get('sessions/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách các phiên chơi đang hoạt động' })
  async getActiveSessions() {
    return this.sessionService.getActiveSessions();
  }

  @Post('remote-control')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gửi lệnh điều khiển từ xa xuống máy gaming (F14.6)' })
  async remoteControl(@Body() dto: RemoteControlDto) {
    return this.gamingGateway.handleRemoteCommand(dto);
  }
}
