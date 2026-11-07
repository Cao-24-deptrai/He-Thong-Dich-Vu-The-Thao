import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Auth & Verification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

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

  // =========================================================================
  // XÁC THỰC MÃ OTP (SMS / REDIS)
  // =========================================================================
  @Post('otp/send')
  @ApiOperation({ summary: 'Gửi mã xác thực OTP 6 số (Hiệu lực 5 phút)' })
  @ApiResponse({ status: 201, description: 'Đã gửi mã OTP thành công' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.generateOtp(dto.phone, dto.purpose);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP 6 số (Tự động khóa sau 5 lần nhập sai)' })
  @ApiResponse({ status: 200, description: 'Xác thực OTP thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không đúng hoặc đã hết hạn' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.code, dto.purpose);
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

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đồng bộ và xác thực phiên làm việc đa giao diện (Session Synchronization)' })
  @ApiResponse({ status: 200, description: 'Phiên làm việc hợp lệ và thông tin người dùng' })
  @ApiResponse({ status: 401, description: 'Phiên làm việc hết hạn hoặc không hợp lệ' })
  async getSession(@CurrentUser() user: any) {
    return this.authService.getSession(user);
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
