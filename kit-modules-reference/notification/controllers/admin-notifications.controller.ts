import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { NotificationService } from '../services/notification.service.js';
import {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  updateNotificationTemplateSchema,
  UpdateNotificationTemplateDto,
} from '@sports/contracts';

@Controller('admin/notifications')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('templates')
  async getTemplates() {
    const result = await this.notificationService.findAllTemplates();
    return { data: result };
  }

  @Put('templates/:code')
  async updateTemplate(
    @Param('code') code: NotificationEventType,
    @Body() body: UpdateNotificationTemplateDto,
    @CurrentUser('sub') actorId: string,
  ) {
    const validated = updateNotificationTemplateSchema.parse(body);
    const result = await this.notificationService.updateTemplate(
      code,
      validated,
      actorId,
    );
    return { data: result };
  }

  @Get('logs')
  async getLogs(
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.notificationService.findAllLogs({
      channel,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Get('cost-report')
  async getCostReport(@Query('date') date?: string) {
    const result = await this.notificationService.getDailyCostReport(date);
    return { data: result };
  }
}
