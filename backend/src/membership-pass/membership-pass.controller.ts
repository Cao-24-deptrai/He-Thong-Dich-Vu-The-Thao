import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { MembershipPassService } from './membership-pass.service';
import { PurchasePassDto, CheckInPassDto } from './dto/membership-pass.dto';

@ApiTags('MembershipPass (Gym)')
@Controller('membership-pass')
export class MembershipPassController {
  constructor(private readonly membershipPassService: MembershipPassService) {}

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mua gói thẻ tập Gym (Customer/Member)' })
  @ApiResponse({ status: 201, description: 'Mua thẻ tập thành công' })
  async purchasePass(@Request() req, @Body() dto: PurchasePassDto) {
    return this.membershipPassService.purchasePass(req.user.userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem danh sách thẻ tập Gym của tôi' })
  async getMyPasses(@Request() req) {
    return this.membershipPassService.getUserPasses(req.user.userId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem tất cả thẻ tập Gym (Dành cho Admin/Staff)' })
  async getAllPassesForAdmin() {
    return this.membershipPassService.getAllPassesForAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết thẻ tập Gym' })
  async getPassById(@Param('id') id: string) {
    return this.membershipPassService.getPassById(id);
  }

  @Post(':id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sinh mã dynamic QR 60s để vào phòng Gym' })
  async generatePassQr(@Param('id') id: string, @Request() req) {
    return this.membershipPassService.generatePassQr(id, req.user.userId);
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nhân viên quét mã check-in trừ 1 lượt thẻ Gym' })
  @ApiResponse({ status: 200, description: 'Check-in thành công và trừ 1 lượt' })
  async checkInPass(@Body() dto: CheckInPassDto) {
    return this.membershipPassService.checkInPass(dto);
  }
}
