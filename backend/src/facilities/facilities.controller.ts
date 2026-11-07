import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { PricingService } from './pricing.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilityDto } from './dto/query-facility.dto';
import { CreatePriceRuleDto, CalculatePriceDto } from './dto/price-rule.dto';
import { CreateClosureDto } from './dto/create-closure.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Facilities')
@Controller('facilities')
export class FacilitiesController {
  constructor(
    private readonly facilitiesService: FacilitiesService,
    private readonly pricingService: PricingService,
  ) {}

  @Get('info')
  @ApiOperation({ summary: 'Xem thông tin cơ sở duy nhất (SRS v2.0 - GET /api/facility)' })
  @ApiResponse({ status: 200, description: 'Thông tin cơ sở thể thao Phanta' })
  async getSingleFacility() {
    return this.facilitiesService.getSingleFacility();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tổ hợp sân (Mục 5 - GET /facilities)' })
  @ApiResponse({ status: 200, description: 'Danh sách các tổ hợp thể thao' })
  async findAll(@Query() query: QueryFacilityDto) {
    return this.facilitiesService.findAll(query);
  }

  // --- BR-04: Tính giá động theo khung giờ (Pricing Engine) ---
  @Post('calculate-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính giá sân động theo block 30 phút và khung giờ cao điểm (BR-04)' })
  @ApiResponse({ status: 200, description: 'Chi tiết tính giá từng block và tổng tiền' })
  async calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.pricingService.calculatePrice(dto);
  }

  // --- Price Rules CRUD ---
  @Get('price-rules')
  @ApiOperation({ summary: 'Xem danh sách quy tắc giá động (Price Rules)' })
  @ApiQuery({ name: 'appliesTo', required: false })
  async getPriceRules(@Query('appliesTo') appliesTo?: string) {
    return this.pricingService.getPriceRules(appliesTo);
  }

  @Post('price-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo quy tắc giá mới (ADMIN / OWNER / MANAGER)' })
  async createPriceRule(@Body() dto: CreatePriceRuleDto) {
    return this.pricingService.createPriceRule(dto);
  }

  // --- Closures (Lịch đóng sân bảo trì / sự kiện) ---
  @Get('closures')
  @ApiOperation({ summary: 'Danh sách các khoảng thời gian đóng sân bảo trì/sự kiện' })
  @ApiQuery({ name: 'facilityId', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  async getClosures(
    @Query('facilityId') facilityId?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.pricingService.getClosures(facilityId, resourceId);
  }

  @Post('closures')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm lịch đóng sân bảo trì hoặc sự kiện (ADMIN / OWNER / MANAGER)' })
  async createClosure(
    @Body() dto: CreateClosureDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pricingService.createClosure(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một tổ hợp thể thao' })
  @ApiResponse({ status: 200, description: 'Chi tiết tổ hợp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async findById(@Param('id') id: string) {
    return this.facilitiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo tổ hợp thể thao mới (Dành cho ADMIN / OWNER)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async create(
    @Body() dto: CreateFacilityDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.facilitiesService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin tổ hợp thể thao (ADMIN / OWNER)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi ràng buộc dữ liệu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ hợp' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vô hiệu hóa (Soft delete) tổ hợp thể thao (ADMIN / OWNER)' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công (isActive = false)' })
  @ApiResponse({ status: 400, description: 'Không thể vô hiệu hóa vì còn sân con đang hoạt động' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ hợp' })
  async remove(@Param('id') id: string) {
    return this.facilitiesService.remove(id);
  }
}
