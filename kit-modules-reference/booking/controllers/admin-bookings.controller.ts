import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { BookingService } from '../services/booking.service.js';
import { BookingCleanupService } from '../services/booking-cleanup.service.js';

@Controller('admin/bookings')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminBookingsController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly cleanupService: BookingCleanupService,
  ) {}

  @Get()
  async getBookings(
    @Query('date') date?: string,
    @Query('resourceCode') resourceCode?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.bookingService.findAllBookings({
      date,
      resourceCode,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    const result = await this.bookingService.checkIn(id, actorId);
    return { data: result };
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    const result = await this.bookingService.complete(id, actorId);
    return { data: result };
  }

  @Post('cleanup-expired')
  @HttpCode(HttpStatus.OK)
  async cleanupExpired() {
    const result = await this.cleanupService.cleanupExpiredHolds();
    return { data: result };
  }
}
