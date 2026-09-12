import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
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
  @ApiQuery({ name: 'facilityId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Danh sách sân' })
  async findAll(
    @Query('facilityId') facilityId?: string,
    @Query('includeInactive') includeInactive?: string | boolean,
  ) {
    const shouldInclude = includeInactive === true || includeInactive === 'true';
    return this.venuesService.findAll(facilityId, shouldInclude);
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin sân (ADMIN / OWNER)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi ràng buộc dữ liệu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vô hiệu hóa (Soft delete) sân (ADMIN / OWNER)' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công (isActive = false)' })
  @ApiResponse({ status: 400, description: 'Không thể vô hiệu hóa vì còn booking tương lai' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân' })
  async remove(@Param('id') id: string) {
    return this.venuesService.remove(id);
  }
}
