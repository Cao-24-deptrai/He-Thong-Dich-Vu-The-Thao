import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BridgeAgentService } from './bridge-agent.service';
import { DeviceCommandService } from './device-command.service';
import { OfflineSyncService } from './offline-sync.service';
import {
  CreateBridgeAgentDto,
  AgentHandshakeDto,
  AgentHeartbeatDto,
  SubmitDeviceEventDto,
  CreateDeviceCommandDto,
} from './dto/bridge.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Bridge Agent & Hardware (M22)')
@Controller('bridge')
export class BridgeController {
  constructor(
    private readonly agentService: BridgeAgentService,
    private readonly commandService: DeviceCommandService,
    private readonly offlineSyncService: OfflineSyncService,
  ) {}

  @Get('agents')
  @ApiOperation({ summary: 'Danh sách các Bridge Agent và trạng thái ngoại vi' })
  async getAgents() {
    return this.agentService.getAgents();
  }

  @Post('agents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng ký Bridge Agent mới' })
  async createAgent(@Body() dto: CreateBridgeAgentDto) {
    return this.agentService.createAgent(dto);
  }

  @Post('agents/seed-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khởi tạo sẵn 2 Agent chuẩn (Quầy POS và Cửa Xoay Gym)' })
  async seedDefault() {
    const total = await this.agentService.seedDefaultAgents();
    return { success: true, totalAgents: total };
  }

  @Post('agent/handshake')
  @ApiOperation({ summary: 'Bridge Agent kết nối lần đầu (Handshake xác thực)' })
  async handshake(@Body() dto: AgentHandshakeDto) {
    return this.agentService.handshake(dto);
  }

  @Post('agent/heartbeat')
  @ApiOperation({ summary: 'Bridge Agent gửi nhịp tim định kỳ 30s & báo cáo sức khỏe thiết bị' })
  async heartbeat(@Body() dto: AgentHeartbeatDto) {
    return this.agentService.heartbeat(dto);
  }

  @Post('agent/events')
  @ApiOperation({ summary: 'Đẩy sự kiện quét QR/thẻ từ thiết bị lên Cloud (Khử trùng lặp)' })
  async submitEvent(@Body() dto: SubmitDeviceEventDto) {
    return this.offlineSyncService.processDeviceEvent(dto);
  }

  @Get('agent/sync/members')
  @ApiOperation({ summary: 'Tải snapshot bộ nhớ đệm thành viên hợp lệ để vận hành ngoại tuyến (T06)' })
  async getOfflineSnapshot() {
    return this.offlineSyncService.getOfflineSnapshot();
  }

  @Post('commands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo lệnh gửi xuống thiết bị ngoại vi (In phiếu, mở két, mở cửa xoay)' })
  async createCommand(@Body() dto: CreateDeviceCommandDto) {
    return this.commandService.createCommand(dto);
  }

  @Get('agent/:agentId/commands/pending')
  @ApiOperation({ summary: 'Bridge Agent lấy danh sách lệnh đang chờ thực thi' })
  async getPendingCommands(@Param('agentId') agentId: string) {
    return this.commandService.getPendingCommands(agentId);
  }

  @Patch('commands/:commandId/executed')
  @ApiOperation({ summary: 'Báo cáo lệnh đã hoàn thành hoặc thất bại' })
  async markExecuted(@Param('commandId') commandId: string, @Body('error') error?: string) {
    return this.commandService.markCommandExecuted(commandId, error);
  }
}
