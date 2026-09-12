import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CheckinService } from './checkin.service';
import { ScanCheckinDto } from './dto/scan-checkin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Check-in & QR Tickets')
@Controller()
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('bookings/:id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy / làm mới qrToken hiển thị vé QR động (Mục 5 - GET /bookings/:id/qr)' })
  @ApiResponse({ status: 200, description: 'Trả về chuỗi JWT QR động có hạn 60 giây' })
  @ApiResponse({ status: 400, description: 'Đơn chưa thanh toán thành công (PAYMENT_NOT_CONFIRMED)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập vé của người khác (FORBIDDEN)' })
  @ApiResponse({ status: 409, description: 'Vé đã được check-in trước đó (ALREADY_CHECKED_IN)' })
  async getQrToken(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.checkinService.getOrRefreshQrToken(id, userId);
  }

  @Post('checkin/scan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quét mã QR check-in tại quầy (Mục 5 - POST /checkin/scan) - Staff/Admin' })
  @ApiResponse({ status: 200, description: 'Check-in thành công, đánh dấu isCheckedIn = true' })
  @ApiResponse({ status: 400, description: 'QR hết hạn hoặc không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Vé đã được check-in trước đó (chống quét trùng)' })
  async scanCheckin(@Body() dto: ScanCheckinDto) {
    return this.checkinService.scanCheckin(dto.qrToken);
  }
}
