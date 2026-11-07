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
import { StaffManagementService } from '../services/staff-management.service.js';
import { ClassManagementService } from '../services/class-management.service.js';
import { PtBookingService } from '../services/pt-booking.service.js';
import { CurrentUser, Public } from '../../auth/index.js';
import {
  TrainerListQueryDto,
  ClassSessionListQueryDto,
  RegisterClassSessionDto,
  CancelClassRegistrationDto,
  BookPtSessionDto,
} from '@sports/contracts';

@Controller('pt')
export class PtPublicController {
  constructor(
    private readonly staffService: StaffManagementService,
    private readonly classService: ClassManagementService,
    private readonly ptBookingService: PtBookingService,
  ) {}

  @Public()
  @Get('trainers')
  async listTrainers(@Query() query: TrainerListQueryDto) {
    return this.staffService.findAllTrainers(query);
  }

  @Public()
  @Get('trainers/:id')
  async getTrainerDetail(@Param('id') id: string) {
    return this.staffService.findById(id);
  }

  @Public()
  @Get('classes')
  async listClasses(@Query() query: ClassSessionListQueryDto) {
    return this.classService.findAllSessions(query);
  }

  @Public()
  @Get('classes/:id')
  async getClassDetail(@Param('id') id: string) {
    return this.classService.findSessionById(id);
  }

  @Post('classes/register')
  @HttpCode(HttpStatus.OK)
  async registerClass(
    @CurrentUser('id') actorId: string,
    @Body() dto: RegisterClassSessionDto,
  ) {
    return this.classService.registerClassSession(actorId, dto);
  }

  @Post('classes/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelClassRegistration(
    @CurrentUser('id') customerId: string,
    @Body() dto: CancelClassRegistrationDto,
  ) {
    return this.classService.cancelRegistration(customerId, dto);
  }

  @Post('sessions/book')
  @HttpCode(HttpStatus.OK)
  async bookPtSession(
    @CurrentUser('id') actorId: string,
    @Body() dto: BookPtSessionDto,
  ) {
    return this.ptBookingService.bookPtSession(actorId, dto);
  }
}
