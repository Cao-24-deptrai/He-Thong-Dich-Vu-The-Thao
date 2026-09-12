import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { AvailabilityQueryDto } from '../bookings/dto/availability-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get(':id/availability')
  @ApiOperation({ summary: 'Xem lịch trống theo ngày (Mục 5 - GET /venues/:id/availability)' })
  @ApiResponse({ status: 200, description: 'Lưới các khung giờ và trạng thái (AVAILABLE, HELD, CONFIRMED)' })
  async getAvailability(
    @Param('id') id: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.bookingsService.getAvailability(id, query.date);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách sân' })
  @ApiResponse({ status: 200, description: 'Danh sách sân' })
  async findAll(@Query('facilityId') facilityId?: string) {
    return this.venuesService.findAll(facilityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sân' })
  @ApiResponse({ status: 200, description: 'Chi tiết sân' })
  async findById(@Param('id') id: string) {
    return this.venuesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo sân mới trong cơ sở (ADMIN / OWNER)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async create(@Body() dto: CreateVenueDto) {
    return this.venuesService.create(dto);
  }
}
