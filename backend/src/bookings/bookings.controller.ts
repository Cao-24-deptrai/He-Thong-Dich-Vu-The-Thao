import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { WalkInBookingDto } from './dto/walk-in-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('slots')
  @ApiOperation({ summary: 'Ma trận khung giờ 30 phút theo ngày thi đấu (Mục 2.1)' })
  @ApiQuery({ name: 'venueId', required: true, description: 'ID của sân' })
  @ApiQuery({ name: 'date', required: true, description: 'Ngày thi đấu (YYYY-MM-DD)' })
  @ApiQuery({ name: 'granularity', required: false, description: 'Bước nhảy phút (mặc định 30, hoặc 60)' })
  @ApiResponse({ status: 200, description: 'Ma trận khung giờ với 3 trạng thái: AVAILABLE (TRỐNG), HELD (ĐANG GIỮ CHỖ), CONFIRMED (ĐÃ ĐẶT)' })
  async getSlotsMatrix(
    @Query('venueId') venueId: string,
    @Query('date') date: string,
    @Query('granularity') granularity?: number,
  ) {
    return this.bookingsService.getSlotsMatrix(venueId, date, granularity ? Number(granularity) : 30);
  }

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
  @Roles(
    UserRole.STAFF,
    UserRole.CASHIER,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đặt nhanh tại quầy (Mục 5 - POST /bookings/walk-in) - Staff/Cashier/Admin' })
  @ApiResponse({ status: 201, description: 'Đặt tại quầy thành công (status = CONFIRMED)' })
  @ApiResponse({ status: 409, description: 'Trùng slot đã đặt online (SLOT_ALREADY_TAKEN_ONLINE)' })
  async createWalkIn(@Body() dto: WalkInBookingDto) {
    return this.bookingsService.createWalkInBooking(dto);
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
  @ApiOperation({ summary: 'Hủy đơn giữ chỗ/đặt chỗ (Mục 5 - POST /bookings/:id/cancel)' })
  @ApiResponse({ status: 200, description: 'Hủy đơn thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn' })
  @ApiResponse({ status: 409, description: 'Không có quyền hủy' })
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.bookingsService.cancelBooking(id, userId);
  }
}
