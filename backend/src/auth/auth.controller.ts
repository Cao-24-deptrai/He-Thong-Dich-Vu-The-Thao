import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (F02.1 - POST /auth/register)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về access token & refresh token' })
  @ApiResponse({ status: 409, description: 'Số điện thoại đã tồn tại' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập tài khoản (F02.2 - POST /auth/login)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về access token & refresh token' })
  @ApiResponse({ status: 401, description: 'Sai số điện thoại hoặc mật khẩu' })
  @ApiResponse({ status: 403, description: 'Tài khoản bị tạm khóa 15 phút do nhập sai 5 lần' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xoay vòng Refresh Token để lấy Access Token mới (F02.2)' })
  @ApiResponse({ status: 200, description: 'Cấp cặp token mới thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã xác thực OTP 6 số (F02.1)' })
  @ApiResponse({ status: 200, description: 'Gửi mã OTP thành công' })
  @ApiResponse({ status: 429, description: 'Chưa đủ 60 giây giữa 2 lần gửi' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone, dto.purpose);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác minh mã OTP 6 số (F02.1)' })
  @ApiResponse({ status: 200, description: 'Xác minh OTP thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP sai hoặc hết hạn hoặc vượt quá 5 lần thử' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.code, dto.purpose);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất phiên làm việc hiện tại' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(@CurrentUser() user: any, @Body('deviceId') deviceId?: string) {
    return this.authService.logout(user.id || user.userId || user.sub, deviceId);
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
