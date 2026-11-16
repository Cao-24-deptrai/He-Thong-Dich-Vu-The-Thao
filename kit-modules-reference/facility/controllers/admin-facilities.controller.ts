import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { ResourceService } from '../services/resource.service.js';
import { OperatingHoursService } from '../services/operating-hours.service.js';
import { PricingService } from '../services/pricing.service.js';
import { ClosureService } from '../services/closure.service.js';
import {
  createResourceSchema,
  updateResourceSchema,
  createPriceRuleSchema,
  createClosureSchema,
  specialDateItemSchema,
  CreateResourceDto,
  UpdateResourceDto,
  CreatePriceRuleDto,
  CreateClosureDto,
  WeeklyScheduleItemDto,
  SpecialDateItemDto,
} from '@sports/contracts';
import { z } from 'zod';

const updateWeeklySchedulesSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    isOpen: z.boolean(),
  }),
);

@Controller('admin/facilities')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminFacilitiesController {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly operatingHoursService: OperatingHoursService,
    private readonly pricingService: PricingService,
    private readonly closureService: ClosureService,
  ) {}

  // --- Tài nguyên sân / phòng ---

  @Post('resources')
  async createResource(@Body() body: CreateResourceDto, @CurrentUser('sub') actorId?: string) {
    const validated = createResourceSchema.parse(body);
    const result = await this.resourceService.create(validated, actorId);
    return { data: result };
  }

  @Patch('resources/:id')
  async updateResource(
    @Param('id') id: string,
    @Body() body: UpdateResourceDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    const validated = updateResourceSchema.parse(body);
    const result = await this.resourceService.update(id, validated, actorId);
    return { data: result };
  }

  // --- Giờ hoạt động & Ngày lễ ---

  @Put('operating-hours/weekly')
  async updateWeeklyHours(
    @Body() body: WeeklyScheduleItemDto[],
    @CurrentUser('sub') actorId?: string,
  ) {
    const validated = updateWeeklySchedulesSchema.parse(body);
    const result = await this.operatingHoursService.updateWeeklySchedules(validated, actorId);
    return { data: result };
  }

  @Post('operating-hours/special-dates')
  async setSpecialDate(
    @Body() body: SpecialDateItemDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    const validated = specialDateItemSchema.parse(body);
    const result = await this.operatingHoursService.setSpecialDate(validated, actorId);
    return { data: result };
  }

  @Delete('operating-hours/special-dates/:date')
  async removeSpecialDate(
    @Param('date') date: string,
    @CurrentUser('sub') actorId?: string,
  ) {
    const result = await this.operatingHoursService.removeSpecialDate(date, actorId);
    return { data: result };
  }

  // --- Bảng giá ---

  @Post('pricing')
  async createPriceRule(@Body() body: CreatePriceRuleDto, @CurrentUser('sub') actorId?: string) {
    const validated = createPriceRuleSchema.parse(body);
    const result = await this.pricingService.createRule(validated, actorId);
    return { data: result };
  }

  @Patch('pricing/:id')
  async updatePriceRule(
    @Param('id') id: string,
    @Body() body: Partial<CreatePriceRuleDto> & { isActive?: boolean },
    @CurrentUser('sub') actorId?: string,
  ) {
    const result = await this.pricingService.updateRule(id, body, actorId);
    return { data: result };
  }

  // --- Đóng sân / Bảo trì ---

  @Get('closures')
  async getClosures(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    const list = await this.closureService.findAll({
      fromAt: from ? new Date(from) : undefined,
      toAt: to ? new Date(to) : undefined,
      resourceId,
    });
    return { data: list };
  }

  @Post('closures')
  async createClosure(@Body() body: CreateClosureDto, @CurrentUser('sub') actorId?: string) {
    const validated = createClosureSchema.parse(body);
    const result = await this.closureService.create(validated, actorId);
    return { data: result };
  }

  @Delete('closures/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClosure(@Param('id') id: string, @CurrentUser('sub') actorId?: string) {
    await this.closureService.delete(id, actorId);
  }
}
