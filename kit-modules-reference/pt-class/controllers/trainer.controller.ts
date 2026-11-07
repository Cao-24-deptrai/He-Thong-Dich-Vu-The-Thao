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
import { PtBookingService } from '../services/pt-booking.service.js';
import { ClassManagementService } from '../services/class-management.service.js';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  CompletePtSessionDto,
  CheckInClassAttendeeDto,
} from '@sports/contracts';

@Controller('trainer')
@RequireRoles(Role.TRAINER, Role.ADMIN, Role.MANAGER)
export class TrainerController {
  constructor(
    private readonly ptBookingService: PtBookingService,
    private readonly classService: ClassManagementService,
  ) {}

  @Get('my-schedule')
  async getMySchedule(
    @CurrentUser('id') trainerUserId: string,
    @Query('date') dateStr?: string,
  ) {
    const targetDate = dateStr ? new Date(dateStr) : undefined;
    return this.ptBookingService.findTrainerSchedule(trainerUserId, targetDate);
  }

  @Get('students/:id/history')
  async getStudentHistory(
    @CurrentUser('id') trainerUserId: string,
    @Param('id') customerId: string,
  ) {
    return this.ptBookingService.getTrainerStudentHistory(trainerUserId, customerId);
  }

  @Post('classes/check-in')
  @HttpCode(HttpStatus.OK)
  async checkInClassAttendee(@Body() dto: CheckInClassAttendeeDto) {
    return this.classService.checkInAttendee(dto);
  }

  @Post('pt-sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completePtSession(
    @CurrentUser('id') trainerUserId: string,
    @Param('id') sessionId: string,
    @Body() dto: CompletePtSessionDto,
  ) {
    return this.ptBookingService.completePtSession(trainerUserId, sessionId, dto);
  }
}
