import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Xem hồ sơ tài khoản cá nhân hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản chi tiết' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    return {
      id: user._id,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isPhoneVerified: user.isPhoneVerified,
      invoiceInfo: user.invoiceInfo,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân & xuất hóa đơn (PATCH /users/me)' })
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
      permissions: user.permissions,
      invoiceInfo: user.invoiceInfo,
    };
  }

  @Patch('fcm-token')
  @ApiOperation({ summary: 'Cập nhật FCM Token cho push notifications (PATCH /users/fcm-token)' })
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

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Tra cứu danh sách người dùng phân trang & tìm kiếm (Quản trị)' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Cập nhật vai trò & quyền hạn tài khoản (Chỉ ADMIN & OWNER)' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thay đổi vai trò' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const user = await this.usersService.updateRole(id, dto.role, dto.permissions);
    return {
      message: 'Cập nhật vai trò thành công',
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
      },
    };
  }

  @Post(':id/lock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạm khóa tài khoản người dùng thủ công (Chỉ ADMIN & OWNER)' })
  @ApiResponse({ status: 200, description: 'Khóa tài khoản thành công' })
  async lockUser(
    @Param('id') id: string,
    @Body() dto: LockUserDto,
  ) {
    const user = await this.usersService.lockUser(id, dto.minutes, dto.reason);
    return {
      message: `Đã tạm khóa tài khoản trong ${dto.minutes || 15} phút`,
      lockedUntil: user.lockedUntil,
    };
  }

  @Post(':id/unlock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mở khóa tài khoản người dùng (Chỉ ADMIN & OWNER)' })
  @ApiResponse({ status: 200, description: 'Mở khóa thành công' })
  async unlockUser(@Param('id') id: string) {
    await this.usersService.unlockUser(id);
    return {
      message: 'Mở khóa tài khoản thành công',
    };
  }
}
