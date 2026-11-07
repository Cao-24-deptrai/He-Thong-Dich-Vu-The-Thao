import { Controller, Get, Post, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CustomerTierService } from './customer-tier.service';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly customerTierService: CustomerTierService,
  ) {}

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Cập nhật FCM Token cho push notifications' })
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
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
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

  // --- Hạng Thành Viên & Điểm Thưởng (BR-16, BR-17, BR-18) ---
  @Get('tier-info')
  @ApiOperation({ summary: 'Xem hạng thành viên, quyền lợi, chi tiêu 12 tháng trượt và điểm thưởng (BR-16, BR-17)' })
  @ApiResponse({ status: 200, description: 'Thông tin phân hạng khách hàng' })
  async getTierInfo(@CurrentUser('userId') userId: string) {
    return this.customerTierService.getUserTierInfo(userId);
  }

  @Post('recalculate-tier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính toán và cập nhật lại hạng thành viên theo chi tiêu 12 tháng trượt (BR-18, AC-16, AC-17)' })
  @ApiResponse({ status: 200, description: 'Kết quả đánh giá lại phân hạng' })
  async recalculateTier(@CurrentUser('userId') userId: string) {
    return this.customerTierService.recalculateUserTier(userId);
  }

  @Post('redeem-points')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quy đổi điểm thưởng trừ tiền trực tiếp vào đơn đặt sân (1 điểm = 100 VND)' })
  @ApiResponse({ status: 200, description: 'Chi tiết số điểm đã đổi và số tiền được giảm' })
  async redeemPoints(
    @CurrentUser('userId') userId: string,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.customerTierService.redeemLoyaltyPoints(
      userId,
      dto.pointsToRedeem,
      dto.orderAmount,
    );
  }
}
