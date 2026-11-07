import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GamingMachineService } from '../services/gaming-machine.service.js';
import { GamingSessionService } from '../services/gaming-session.service.js';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import {
  CreateGamingMachineDto,
  UpdateGamingMachineDto,
  RemoteControlDto,
} from '@sports/contracts';
import { Role } from '@sports/shared';

@Controller('admin/gaming')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminGamingController {
  constructor(
    private readonly machineService: GamingMachineService,
    private readonly sessionService: GamingSessionService,
  ) {}

  @Post('machines')
  @HttpCode(HttpStatus.CREATED)
  async createMachine(@Body() dto: CreateGamingMachineDto) {
    return this.machineService.createMachine(dto);
  }

  @Patch('machines/:id')
  async updateMachine(
    @Param('id') id: string,
    @Body() dto: UpdateGamingMachineDto,
  ) {
    return this.machineService.updateMachine(id, dto);
  }

  @Post('machines/:code/registration-code')
  @HttpCode(HttpStatus.OK)
  async generateRegistrationCode(@Param('code') code: string) {
    const oneTimeCode = await this.machineService.generateRegistrationCode(code);
    return { machineCode: code, oneTimeCode };
  }

  @Post('remote-control')
  @HttpCode(HttpStatus.OK)
  async executeRemoteControl(
    @CurrentUser('id') actorId: string,
    @Body() dto: RemoteControlDto,
  ) {
    return this.sessionService.executeRemoteControl(actorId, dto);
  }

  @Get('reports/usage')
  async getUsageReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    return this.sessionService.getUsageReport(from, to);
  }
}
