import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Public, CurrentUser } from '../../auth/index.js';
import { AvailabilityService } from '../services/availability.service.js';
import { BookingService } from '../services/booking.service.js';
import {
  availabilityQuerySchema,
  holdBookingSchema,
  confirmBookingSchema,
  cancelBookingSchema,
  recurringBookingSchema,
  AvailabilityQueryDto,
  HoldBookingDto,
  ConfirmBookingDto,
  CancelBookingDto,
  RecurringBookingDto,
} from '@sports/contracts';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  @Public()
  @Get('availability')
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    const validated = availabilityQuerySchema.parse(query);
    const result = await this.availabilityService.getAvailability(validated);
    return { data: result };
  }

  @Public()
  @Get('matchmaking')
  async getMatchmaking(@Query('sport') sport?: string, @Query('date') date?: string) {
    const list = await this.bookingService.findMatchmakingList({ sport, date });
    return { data: list };
  }

  @Post('hold')
  @HttpCode(HttpStatus.CREATED)
  async holdBooking(
    @Body() body: HoldBookingDto,
    @CurrentUser('sub') userId: string,
  ) {
    const validated = holdBookingSchema.parse(body);
    const result = await this.bookingService.holdBooking(validated, userId);
    return { data: result };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmBooking(
    @Param('id') id: string,
    @Body() body: ConfirmBookingDto,
    @CurrentUser('sub') actorId: string,
  ) {
    const validated = confirmBookingSchema.parse(body);
    const result = await this.bookingService.confirmBooking(id, validated, actorId);
    return { data: result };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
    @CurrentUser('sub') actorId: string,
  ) {
    const validated = cancelBookingSchema.parse(body);
    const result = await this.bookingService.cancelBooking(id, validated, actorId);
    return { data: result };
  }

  @Get('my')
  async getMyBookings(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.bookingService.findMyBookings(userId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Get(':id')
  async getBookingDetail(@Param('id') id: string) {
    const booking = await this.bookingService.findById(id);
    return { data: booking };
  }

  @Post('recurring')
  @HttpCode(HttpStatus.CREATED)
  async createRecurring(
    @Body() body: RecurringBookingDto,
    @CurrentUser('sub') userId: string,
  ) {
    const validated = recurringBookingSchema.parse(body);
    const result = await this.bookingService.createRecurring(validated, userId);
    return { data: result };
  }
}
