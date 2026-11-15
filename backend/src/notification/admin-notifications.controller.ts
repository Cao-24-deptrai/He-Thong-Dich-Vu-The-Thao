import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendBroadcastNotificationDto, SendDirectNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Quản Trị Trung Tâm Thông Báo (E10 - Admin Notifications)')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Bắn thông báo hàng loạt (Push FCM, SMS, ZNS)' })
  async sendBroadcast(@Body() dto: SendBroadcastNotificationDto) {
    return this.notificationService.sendBroadcast(dto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Gửi thông báo trực tiếp tới 1 tài khoản' })
  async sendDirect(@Body() dto: SendDirectNotificationDto) {
    return this.notificationService.sendDirect(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Nhật ký gửi tin đa kênh (Outbox Logs)' })
  async getLogs() {
    return this.notificationService.getRecentLogs(50);
  }
}
