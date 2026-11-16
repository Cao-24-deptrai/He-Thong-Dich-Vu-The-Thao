import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Query,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BridgeAgentService } from '../services/bridge-agent.service.js';
import { DeviceCommandService } from '../services/device-command.service.js';
import { DeviceEventService } from '../services/device-event.service.js';
import { OfflineSyncService } from '../services/offline-sync.service.js';
import {
  AgentHandshakeDto,
  AgentHandshakeResponse,
  AgentHeartbeatDto,
  AgentHeartbeatResponse,
  CompleteDeviceCommandDto,
  DeviceCommandDetailResponse,
  IngestDeviceEventsDto,
  IngestDeviceEventsResponse,
  OfflineMemberSyncResponse,
} from '@sports/contracts';

@Controller('api/v1/bridge/agent')
export class BridgeAgentPublicController {
  constructor(
    private readonly bridgeAgentService: BridgeAgentService,
    private readonly deviceCommandService: DeviceCommandService,
    private readonly deviceEventService: DeviceEventService,
    private readonly offlineSyncService: OfflineSyncService,
  ) {}

  /**
   * Khởi động phiên làm việc Agent (Bắt tay ban đầu)
   */
  @Post('handshake')
  @HttpCode(HttpStatus.OK)
  async handshake(@Body() dto: AgentHandshakeDto): Promise<AgentHandshakeResponse> {
    return this.bridgeAgentService.handshake(dto);
  }

  /**
   * Gửi nhịp tim định kỳ (Heartbeat & Diagnostics)
   */
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
    @Body() dto: AgentHeartbeatDto,
  ): Promise<AgentHeartbeatResponse> {
    const agent = await this.validateAgent(agentCode, sessionToken);
    return this.bridgeAgentService.heartbeat(agent, dto);
  }

  /**
   * Agent lấy danh sách lệnh đang chờ thực thi (Polling hoặc khi nhận được tín hiệu)
   */
  @Get('commands')
  async getPendingCommands(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
    @Query('limit') limit?: string,
  ): Promise<DeviceCommandDetailResponse[]> {
    const agent = await this.validateAgent(agentCode, sessionToken);
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.deviceCommandService.getPendingCommandsForAgent(agent._id, limitNum);
  }

  /**
   * Báo cáo kết quả thực thi lệnh điều khiển thiết bị
   */
  @Post('commands/:commandId/complete')
  @HttpCode(HttpStatus.OK)
  async completeCommand(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
    @Param('commandId') commandId: string,
    @Body() dto: CompleteDeviceCommandDto,
  ): Promise<DeviceCommandDetailResponse> {
    const agent = await this.validateAgent(agentCode, sessionToken);
    return this.deviceCommandService.completeCommand(agent._id, commandId, dto);
  }

  /**
   * Đẩy sự kiện thiết bị thời gian thực lên Cloud (RFID, QR, cửa xoay, mở két...)
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async ingestEvents(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
    @Body() dto: IngestDeviceEventsDto,
  ): Promise<IngestDeviceEventsResponse> {
    const agent = await this.validateAgent(agentCode, sessionToken);
    return this.deviceEventService.ingestEvents(agent, dto);
  }

  /**
   * Tải snapshot danh sách hội viên/vé hợp lệ về lưu trữ offline tại Agent
   */
  @Get('sync/members')
  async getOfflineMemberSnapshot(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
  ): Promise<OfflineMemberSyncResponse> {
    await this.validateAgent(agentCode, sessionToken);
    return this.offlineSyncService.getOfflineMemberSnapshot();
  }

  /**
   * Đồng bộ hàng đợi sự kiện ngoại tuyến sau khi phục hồi kết nối mạng
   */
  @Post('sync/offline-events')
  @HttpCode(HttpStatus.OK)
  async syncOfflineEvents(
    @Headers('x-bridge-agent-code') agentCode: string,
    @Headers('x-bridge-session-token') sessionToken: string,
    @Body() dto: IngestDeviceEventsDto,
  ): Promise<IngestDeviceEventsResponse> {
    const agent = await this.validateAgent(agentCode, sessionToken);
    return this.offlineSyncService.syncOfflineEvents(agent, dto.events);
  }

  private async validateAgent(agentCode?: string, sessionToken?: string) {
    if (!agentCode || !sessionToken) {
      throw new UnauthorizedException('MISSING_BRIDGE_CREDENTIALS');
    }
    return this.bridgeAgentService.validateSessionToken(agentCode, sessionToken);
  }
}
