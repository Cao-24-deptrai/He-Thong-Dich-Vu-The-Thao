import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GymService } from './gym.service';
import { GymMembershipService } from './gym-membership.service';
import { GymAccessService } from './gym-access.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import {
  ScanGymTurnstileDto,
  OverrideGymCapacityDto,
} from './dto/scan-gym-turnstile.dto';
import {
  PurchaseGymPlanDto,
  CalculateUpgradeCreditDto,
} from './dto/purchase-gym-plan.dto';

@ApiTags('Gym & Turnstile Access (Epic E11)')
@Controller('gym')
export class GymController {
  constructor(
    private readonly gymService: GymService,
    private readonly gymMembershipService: GymMembershipService,
    private readonly gymAccessService: GymAccessService,
  ) {}

  // ==========================================
  // 1. GÓI TẬP & MÃ QR ĐỊNH DANH (BR-26, BR-27, BR-28, AC-70)
  // ==========================================

  @Get('plans')
  @ApiOperation({ summary: 'Lấy danh sách 4 gói tập Gym chuẩn BR-27 (1 ngày, 1, 3, 6 tháng - không có gói năm)' })
  @ApiResponse({ status: 200, description: 'Danh sách 4 gói tập' })
  getPlans() {
    return this.gymMembershipService.getPlans();
  }

  @Get('my-qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy mã QR định danh duy nhất của hội viên (BR-26, BR-30a, AC-70)' })
  @ApiResponse({ status: 200, description: 'Mã QR định danh cố định và thời hạn thẻ' })
  async getMyQr(@CurrentUser('userId') userId: string) {
    const credential = await this.gymMembershipService.getQrCredential(userId);
    return {
      hasCredential: !!credential,
      credential,
    };
  }

  @Post('calculate-upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính số tiền khấu trừ từ ngày chưa dùng của gói cũ khi nâng cấp (BR-28)' })
  @ApiResponse({ status: 200, description: 'Chi tiết số tiền khấu trừ và số tiền thực trả' })
  async calculateUpgrade(
    @CurrentUser('userId') userId: string,
    @Body() dto: CalculateUpgradeCreditDto,
  ) {
    return this.gymMembershipService.calculateUpgradeCredit(userId, dto.targetPlanCode);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mua mới, gia hạn cộng dồn hoặc nâng cấp gói tập Gym (BR-26, BR-27, BR-28, AC-70)' })
  @ApiResponse({ status: 200, description: 'Thanh toán và cập nhật thẻ Gym thành công' })
  async purchasePlan(
    @CurrentUser('userId') userId: string,
    @Body() dto: PurchaseGymPlanDto,
  ) {
    return this.gymMembershipService.purchaseOrRenewPlan(userId, dto.planCode, {
      isUpgrade: dto.isUpgrade,
      paymentId: dto.paymentId,
    });
  }

  @Get('my-subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử các gói tập Gym đã mua' })
  @ApiResponse({ status: 200, description: 'Lịch sử gói tập' })
  async getMySubscriptions(@CurrentUser('userId') userId: string) {
    return this.gymMembershipService.getUserSubscriptions(userId);
  }

  // ==========================================
  // 2. CỔNG XOAY & BỘ ĐẾM SỨC CHỨA 100 NGƯỜI (BR-29, BR-30, AC-31, AC-32)
  // ==========================================

  @Get('capacity')
  @ApiOperation({ summary: 'Xem trạng thái số người trong phòng gym thời gian thực (BR-29: 0 - 100 người)' })
  @ApiResponse({ status: 200, description: 'Trạng thái sức chứa hiện tại' })
  async getCapacity() {
    return this.gymAccessService.getCapacityStatus();
  }

  @Post('turnstile/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quét mã QR qua cửa xoay 2 chiều (IN / OUT). Chống quét trùng 5p (BR-30) & Chặn quá 100 người (BR-29, AC-31, AC-32)',
  })
  @ApiResponse({ status: 200, description: 'Mở cổng xoay thành công' })
  @ApiResponse({ status: 400, description: 'Gói hết hạn (PASS_EXPIRED) hoặc vừa quét trong 5 phút (RECENTLY_SCANNED)' })
  @ApiResponse({ status: 409, description: 'Phòng gym đã đạt sức chứa tối đa 100 người (GYM_CAPACITY_FULL)' })
  async scanTurnstile(@Body() dto: ScanGymTurnstileDto) {
    return this.gymAccessService.scanTurnstile(dto);
  }

  @Post('turnstile/override')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ghi đè số người thủ công khi có sự cố lệch số đếm (Admin/Staff)' })
  @ApiResponse({ status: 200, description: 'Ghi đè số đếm thành công' })
  async overrideCapacity(
    @CurrentUser('userId') staffId: string,
    @Body() dto: OverrideGymCapacityDto,
  ) {
    return this.gymAccessService.overrideCapacity(dto, staffId);
  }

  @Post('turnstile/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset bộ đếm phòng Gym về 0 vào giờ đóng cửa 23:00 (BR-29)' })
  @ApiResponse({ status: 200, description: 'Reset thành công' })
  async resetCapacity() {
    return this.gymAccessService.resetDailyCapacity();
  }

  @Get('turnstile/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử quét cửa xoay (Admin/Staff)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách nhật ký qua cổng xoay' })
  async getAccessLogs(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.gymAccessService.getAccessLogs(lim);
  }

  // ==========================================
  // 3. TƯƠNG THÍCH NGƯỢC (LEGACY APIS)
  // ==========================================

  @Get('packages')
  @ApiOperation({ summary: 'Legacy: Danh sách gói tập' })
  async getPackages() {
    return this.gymService.getPackages();
  }

  @Post('face-checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Legacy: Mô phỏng nhận diện Face ID' })
  async faceCheckIn(@Body() dto: any) {
    return this.gymService.faceCheckIn(dto);
  }

  @Post('register-face')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Legacy: Đăng ký Face ID' })
  async registerFace(@Body() dto: any) {
    return this.gymService.registerFace(dto);
  }
}
