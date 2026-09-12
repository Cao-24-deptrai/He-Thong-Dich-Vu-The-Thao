import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilityDto } from './dto/query-facility.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Facilities')
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tổ hợp sân, hỗ trợ lọc theo vị trí/môn (Mục 5 - GET /facilities)' })
  @ApiResponse({ status: 200, description: 'Danh sách các tổ hợp thể thao' })
  async findAll(@Query() query: QueryFacilityDto) {
    return this.facilitiesService.findAll(query);
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
