import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/index.js';
import { NotificationService } from '../services/notification.service.js';
import {
  notificationPreferencesSchema,
  NotificationPreferencesDto,
} from '@sports/contracts';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('me')
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.notificationService.findMyNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Get('me/unread-count')
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { data: { count } };
  }

  @Patch('me/:id/read')
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const result = await this.notificationService.markAsRead(userId, id);
    return { data: result };
  }

  @Post('me/read-all')
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    const result = await this.notificationService.markAllAsRead(userId);
    return { data: result };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser('sub') userId: string) {
    const result = await this.notificationService.getPreferences(userId);
    return { data: result };
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() body: NotificationPreferencesDto,
  ) {
    const validated = notificationPreferencesSchema.parse(body);
    const result = await this.notificationService.updatePreferences(
      userId,
      validated,
    );
    return { data: result };
  }
}
