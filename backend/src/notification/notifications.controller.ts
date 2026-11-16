import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Thông Báo Đa Kênh (E10 - Notifications)')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách thông báo của tôi' })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.notificationService.findMyNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch('me/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đánh dấu đã đọc một thông báo' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.notificationService.markAsRead(userId, id);
  }

  @Post('me/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  async markAllAsRead(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.notificationService.markAllAsRead(userId);
  }
}
