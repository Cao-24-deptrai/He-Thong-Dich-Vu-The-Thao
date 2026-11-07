import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GamingMachineService } from '../services/gaming-machine.service.js';
import { GamingSessionService } from '../services/gaming-session.service.js';
import { CurrentUser, Public } from '../../auth/index.js';
import {
  GamingMachineListQueryDto,
  RegisterMachineDto,
  StartGamingSessionDto,
  GamingHeartbeatDto,
  EndGamingSessionDto,
  SwitchMachineDto,
} from '@sports/contracts';

@Controller('gaming')
export class GamingController {
  constructor(
    private readonly machineService: GamingMachineService,
    private readonly sessionService: GamingSessionService,
  ) {}

  @Public()
  @Get('machines')
  async listMachines(@Query() query: GamingMachineListQueryDto) {
    return this.machineService.findAll(query);
  }

  @Public()
  @Get('machines/:id')
  async getMachineDetail(@Param('id') id: string) {
    return this.machineService.findById(id);
  }

  @Public()
  @Post('machines/register')
  @HttpCode(HttpStatus.OK)
  async registerMachine(@Body() dto: RegisterMachineDto) {
    return this.machineService.registerMachine(dto);
  }

  @Post('sessions/start')
  @HttpCode(HttpStatus.OK)
  async startSession(
    @CurrentUser('id') userId: string,
    @Body() dto: StartGamingSessionDto,
  ) {
    return this.sessionService.startSession(userId, dto);
  }

  @Public()
  @Post('sessions/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() dto: GamingHeartbeatDto) {
    return this.sessionService.processHeartbeat(dto);
  }

  @Post('sessions/end')
  @HttpCode(HttpStatus.OK)
  async endSession(
    @CurrentUser('id') userId: string,
    @Body() dto: EndGamingSessionDto,
  ) {
    return this.sessionService.endSession(userId, dto);
  }

  @Post('sessions/switch-machine')
  @HttpCode(HttpStatus.OK)
  async switchMachine(
    @CurrentUser('id') userId: string,
    @Body() dto: SwitchMachineDto,
  ) {
    return this.sessionService.switchMachine(userId, dto);
  }

  @Public()
  @Get('map')
  async getFloorMap(@Query('floor') floor?: string) {
    const floorNum = floor ? parseInt(floor, 10) : 1;
    return this.machineService.getFloorMap(isNaN(floorNum) ? 1 : floorNum);
  }
}
