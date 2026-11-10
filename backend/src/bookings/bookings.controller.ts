import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { RecurringBookingDto } from './dto/recurring-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Giữ chỗ khung giờ (Mục 5 - POST /bookings/hold)' })
  @ApiResponse({ status: 201, description: 'Giữ chỗ thành công (status = HELD)' })
  @ApiResponse({ status: 409, description: 'Khung giờ đang có người giữ hoặc đã được đặt' })
  async holdBooking(
    @CurrentUser('userId') userId: string,
    @Body() dto: HoldBookingDto,
  ) {
    return this.bookingsService.holdBooking(userId, dto);
  }

  @Post('walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt nhanh tại quầy (Mục 5 - POST /bookings/walk-in) - Staff/Admin' })
  @ApiResponse({ status: 201, description: 'Đặt tại quầy thành công (status = CONFIRMED)' })
  @ApiResponse({ status: 409, description: 'Trùng slot đã đặt online (SLOT_ALREADY_TAKEN_ONLINE)' })
  async createWalkIn(@Body() dto: WalkInBookingDto) {
    return this.bookingsService.createWalkInBooking(dto);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Xem ma trận tình trạng trống 48 slot (Mục US-004)' })
  @ApiResponse({ status: 200, description: 'Ma trận 48 slot 30 phút theo ngày' })
  async getAvailability(
    @Query('venueId') venueId: string,
    @Query('date') date: string,
  ) {
    return this.bookingsService.getAvailability(venueId, date);
  }

  @Post('recurring/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra xung đột chuỗi đặt sân định kỳ (Dry-run) - Mục FR-04, US-027' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra tính khả dụng của chuỗi' })
  async checkRecurring(@Body() dto: RecurringBookingDto) {
    return this.bookingsService.checkRecurringAvailability(dto);
  }

  @Post('recurring')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt sân định kỳ nhiều tuần (Mục FR-04, US-027)' })
  @ApiResponse({ status: 201, description: 'Khởi tạo chuỗi định kỳ thành công' })
  @ApiResponse({ status: 409, description: 'Phát hiện xung đột lịch trong chuỗi (RECURRING_DATES_CONFLICT)' })
  async createRecurring(
    @CurrentUser('userId') userId: string,
    @Body() dto: RecurringBookingDto,
  ) {
    return this.bookingsService.createRecurringBooking(userId, dto, false);
  }

  @Post('recurring/walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt sân định kỳ tại quầy cho khách vãng lai - Staff/Admin' })
  @ApiResponse({ status: 201, description: 'Khởi tạo chuỗi định kỳ tại quầy thành công (status = CONFIRMED)' })
  async createRecurringWalkIn(@Body() dto: RecurringBookingDto) {
    return this.bookingsService.createRecurringBooking(null, dto, true);
  }

  @Get('recurring/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem danh sách các buổi trong chuỗi định kỳ theo recurringGroupId' })
  @ApiResponse({ status: 200, description: 'Danh sách các buổi của chuỗi' })
  async getRecurringGroup(@Param('groupId') groupId: string) {
    return this.bookingsService.getRecurringGroupBookings(groupId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử đặt chỗ của khách (Mục 5 - GET /bookings/me)' })
  @ApiResponse({ status: 200, description: 'Danh sách các đơn đặt' })
  async getMyBookings(@CurrentUser('userId') userId: string) {
    return this.bookingsService.getMyBookings(userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy đơn giữ chỗ/đặt chỗ (Mục 5 - POST /bookings/:id/cancel) - US-046' })
  @ApiResponse({ status: 200, description: 'Hủy đơn thành công kèm chi tiết tỷ lệ hoàn tiền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn' })
  @ApiResponse({ status: 403, description: 'Không có quyền hủy' })
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    return this.bookingsService.cancelBooking(id, user, body?.reason);
  }

  @Post(':id/restore-late-payment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cứu đơn thanh toán trễ / khôi phục hold hết hạn (US-013)' })
  @ApiResponse({ status: 200, description: 'Xử lý cứu đơn thành công (CONFIRMED hoặc REFUND_PENDING)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn' })
  @ApiResponse({ status: 403, description: 'Không có quyền cứu đơn' })
  async restoreLatePayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { paymentDetails?: any },
  ) {
    return this.bookingsService.restoreExpiredHoldForLatePayment(id, user, body?.paymentDetails);
  }
}
