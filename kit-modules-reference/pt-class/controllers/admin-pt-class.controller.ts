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
import { StaffManagementService } from '../services/staff-management.service.js';
import { ClassManagementService } from '../services/class-management.service.js';
import { PtBookingService } from '../services/pt-booking.service.js';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  CreateStaffProfileDto,
  UpdateStaffProfileDto,
  CreateStaffShiftDto,
  StaffShiftListQueryDto,
  CreateClassTemplateDto,
  UpdateClassTemplateDto,
  ClassTemplateListQueryDto,
  GenerateClassSessionsDto,
  MonthlyTrainerReportQueryDto,
} from '@sports/contracts';

@Controller('admin/pt-class')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminPtClassController {
  constructor(
    private readonly staffService: StaffManagementService,
    private readonly classService: ClassManagementService,
    private readonly ptBookingService: PtBookingService,
  ) {}

  // ==================== STAFF PROFILES & SHIFTS ====================

  @Post('staff-profiles')
  @HttpCode(HttpStatus.CREATED)
  async createStaffProfile(@Body() dto: CreateStaffProfileDto) {
    return this.staffService.createStaffProfile(dto);
  }

  @Patch('staff-profiles/:id')
  async updateStaffProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    return this.staffService.updateStaffProfile(id, dto);
  }

  @Post('shifts')
  @HttpCode(HttpStatus.CREATED)
  async createStaffShift(@Body() dto: CreateStaffShiftDto) {
    return this.staffService.createStaffShift(dto);
  }

  @Get('shifts')
  async listStaffShifts(@Query() query: StaffShiftListQueryDto) {
    return this.staffService.findStaffShifts(query);
  }

  // ==================== CLASS TEMPLATES & SESSIONS ====================

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() dto: CreateClassTemplateDto) {
    return this.classService.createTemplate(dto);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateClassTemplateDto,
  ) {
    return this.classService.updateTemplate(id, dto);
  }

  @Get('templates')
  async listTemplates(@Query() query: ClassTemplateListQueryDto) {
    return this.classService.findAllTemplates(query);
  }

  @Post('sessions/generate')
  @HttpCode(HttpStatus.OK)
  async generateSessions(@Body() dto: GenerateClassSessionsDto) {
    return this.classService.generateClassSessions(dto);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSession(
    @CurrentUser('id') actorId: string,
    @Param('id') sessionId: string,
    @Body('reason') reason?: string,
  ) {
    return this.classService.cancelClassSession(actorId, sessionId, reason);
  }

  // ==================== MONTHLY REPORT ====================

  @Get('reports/monthly')
  async getMonthlyReport(@Query() query: MonthlyTrainerReportQueryDto) {
    return this.ptBookingService.getMonthlyTrainerReport(query);
  }
}
