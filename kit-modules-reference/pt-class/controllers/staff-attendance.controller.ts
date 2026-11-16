import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StaffManagementService } from '../services/staff-management.service.js';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  RecordAttendanceDto,
  StaffShiftListQueryDto,
} from '@sports/contracts';

@Controller('staff')
@RequireRoles(Role.TRAINER, Role.CASHIER, Role.ADMIN, Role.MANAGER)
export class StaffAttendanceController {
  constructor(private readonly staffService: StaffManagementService) {}

  @Post('attendance/check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @CurrentUser('id') staffUserId: string,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.staffService.recordCheckIn(staffUserId, dto);
  }

  @Post('attendance/check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @CurrentUser('id') staffUserId: string,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.staffService.recordCheckOut(staffUserId, dto);
  }

  @Get('attendance/history')
  async getMyAttendanceHistory(
    @CurrentUser('id') staffUserId: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 30;
    return this.staffService.getStaffAttendanceHistory(staffUserId, limit);
  }

  @Get('my-shifts')
  async getMyShifts(
    @CurrentUser('id') staffUserId: string,
    @Query() query: StaffShiftListQueryDto,
  ) {
    const staff = await this.staffService.findByUserId(staffUserId);
    if (!staff) return [];
    return this.staffService.findStaffShifts({ ...query, staffId: staff._id.toString() });
  }
}
