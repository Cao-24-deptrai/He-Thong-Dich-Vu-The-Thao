import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BridgeAgentService } from '../services/bridge-agent.service.js';
import { DeviceCommandService } from '../services/device-command.service.js';
import { DeviceEventService } from '../services/device-event.service.js';
import { RequireRoles } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  CreateBridgeAgentDto,
  RegisterAgentResponse,
  BridgeAgentDetailResponse,
  DispatchDeviceCommandDto,
  DeviceCommandDetailResponse,
} from '@sports/contracts';

@Controller('admin/bridge')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminBridgeController {
  constructor(
    private readonly bridgeAgentService: BridgeAgentService,
    private readonly deviceCommandService: DeviceCommandService,
    private readonly deviceEventService: DeviceEventService,
  ) {}

  /**
   * Danh sách tất cả Bridge Agent và trạng thái kết nối
   */
  @Get('agents')
  async getAllAgents(): Promise<BridgeAgentDetailResponse[]> {
    return this.bridgeAgentService.getAllAgents();
  }

  /**
   * Đăng ký một Bridge Agent mới (Admin only)
   */
  @Post('agents')
  @RequireRoles(Role.ADMIN)
  async registerAgent(@Body() dto: CreateBridgeAgentDto): Promise<RegisterAgentResponse> {
    return this.bridgeAgentService.registerAgent(dto);
  }

  /**
   * Lấy chi tiết thông tin và chẩn đoán thiết bị của 1 Agent
   */
  @Get('agents/:id')
  async getAgentById(@Param('id') id: string): Promise<BridgeAgentDetailResponse> {
    return this.bridgeAgentService.getAgentById(id);
  }

  /**
   * Thu hồi khóa của Agent (Admin only)
   */
  @Patch('agents/:id/revoke')
  @RequireRoles(Role.ADMIN)
  async revokeAgent(@Param('id') id: string): Promise<BridgeAgentDetailResponse> {
    return this.bridgeAgentService.revokeAgent(id);
  }

  /**
   * Phát lệnh điều khiển thủ công xuống thiết bị (mở két tiền, in phiếu, mở cửa xoay...)
   */
  @Post('agents/:id/commands')
  @HttpCode(HttpStatus.CREATED)
  async dispatchCommand(
    @Param('id') id: string,
    @Body() dto: Omit<DispatchDeviceCommandDto, 'agentId'>,
  ): Promise<DeviceCommandDetailResponse> {
    return this.deviceCommandService.createCommand({
      ...dto,
      agentId: id,
    });
  }

  /**
   * Xem các sự kiện gần đây do Agent ghi nhận
   */
  @Get('agents/:id/events')
  async getAgentEvents(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.deviceEventService.getRecentEvents(id, limitNum);
  }
}
