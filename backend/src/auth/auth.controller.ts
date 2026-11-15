import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (Mục 5 - POST /auth/register)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về JWT access token' })
  @ApiResponse({ status: 409, description: 'Số điện thoại đã tồn tại' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập tài khoản (Mục 5 - POST /auth/login)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT access token' })
  @ApiResponse({ status: 401, description: 'Sai số điện thoại hoặc mật khẩu' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực hoặc token hết hạn' })
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint kiểm thử phân quyền RBAC (Chỉ dành cho ADMIN)' })
  @ApiResponse({ status: 200, description: 'Quyền hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async adminTest(@CurrentUser() user: any) {
    return {
      message: 'Xin chào Admin! Bạn có toàn quyền trên hệ thống.',
      user,
    };
  }
}
