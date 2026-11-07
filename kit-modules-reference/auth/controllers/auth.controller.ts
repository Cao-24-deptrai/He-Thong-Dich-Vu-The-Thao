import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { OtpService } from '../services/otp.service.js';
import { Public } from '../decorators/auth.decorators.js';
import {
  RegisterRequestSchema,
  VerifyOtpRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  SendOtpRequestSchema,
} from '@sports/contracts';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() rawBody: unknown) {
    const dto = RegisterRequestSchema.parse(rawBody);
    return await this.authService.register(dto);
  }

  @Public()
  @Post('verify-registration')
  async verifyRegistration(
    @Body() rawBody: unknown,
    @Headers('x-device-id') deviceId = 'web-browser',
    @Headers('user-agent') userAgent = 'Web Browser',
  ) {
    const dto = VerifyOtpRequestSchema.parse(rawBody);
    return await this.authService.verifyRegistration(dto.challengeId, dto.code, deviceId, userAgent);
  }

  @Public()
  @Post('send-otp')
  async sendOtp(@Body() rawBody: unknown) {
    const dto = SendOtpRequestSchema.parse(rawBody);
    return await this.otpService.createOtpChallenge(dto.phone, dto.purpose);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() rawBody: unknown,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const dto = LoginRequestSchema.parse(rawBody);
    return await this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('verify-login-otp')
  @HttpCode(HttpStatus.OK)
  async verifyLoginOtp(
    @Body() rawBody: unknown,
    @Headers('x-device-id') deviceId = 'web-browser',
    @Headers('user-agent') userAgent = 'Web Browser',
  ) {
    const dto = VerifyOtpRequestSchema.parse(rawBody);
    return await this.authService.verifyLoginOtp(dto.challengeId, dto.code, deviceId, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() rawBody: unknown) {
    const dto = RefreshTokenRequestSchema.parse(rawBody);
    return await this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() rawBody: unknown) {
    const dto = RefreshTokenRequestSchema.parse(rawBody);
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }
}
