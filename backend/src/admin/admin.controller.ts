import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Admin Operations')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('refund-pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Danh sách đơn chờ hoàn tiền do thanh toán muộn (Mục 5 - GET /admin/refund-pending)' })
  @ApiResponse({ status: 200, description: 'Danh sách các đơn REFUND_PENDING kèm thông tin đối soát' })
  async getRefundPending() {
    return this.adminService.getRefundPendingList();
  }

  @Patch('refund/:bookingId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xác nhận đã hoàn tiền thủ công cho khách (Mục 5 - PATCH /admin/refund/:bookingId)' })
  @ApiResponse({ status: 200, description: 'Xác nhận hoàn tiền thành công, chuyển sang REFUNDED' })
  @ApiResponse({ status: 400, description: 'Đơn không ở trạng thái REFUND_PENDING' })
  async confirmRefund(
    @Param('bookingId') bookingId: string,
    @Body('refundNote') refundNote?: string,
  ) {
    return this.adminService.confirmManualRefund(bookingId, refundNote);
  }

  @Post('refund/:bookingId/auto')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hoàn tiền tự động qua cổng thanh toán (Mục 6.5 - POST /admin/refund/:bookingId/auto)' })
  @ApiResponse({ status: 200, description: 'Hoàn tiền tự động thành công' })
  async autoRefund(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.autoRefund(bookingId, reason);
  }

  @Get('shifts/:shiftId/unreturned-rentals')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Kiểm tra đồ mượn chưa trả của ca thu ngân trước khi chốt ca (Epic E06 & E07)' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra phiếu thuê chưa trả' })
  async checkShiftRentals(@Param('shiftId') shiftId: string) {
    return this.adminService.checkShiftRentalsBeforeClose(shiftId);
  }
}
