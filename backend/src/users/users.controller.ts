import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Cập nhật FCM Token cho push notifications (Changelog Item 3 - PATCH /users/fcm-token)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateFcmToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const user = await this.usersService.updateFcmToken(userId, dto.fcmToken);
    return {
      message: 'Cập nhật FCM token thành công',
      fcmToken: user.fcmToken,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (Changelog Item 3 - PATCH /users/me)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);
    return {
      id: user._id,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  }
}
