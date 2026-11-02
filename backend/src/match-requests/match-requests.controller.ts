import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MatchRequestsService } from './match-requests.service';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
import { MatchRequestStatus, MatchLevel, UserRole } from '../common/enums';

@ApiTags('MatchRequests (Cáp Kèo Thể Thao)')
@Controller('match-requests')
export class MatchRequestsController {
  constructor(private readonly matchRequestsService: MatchRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo bài đăng cáp kèo / tìm đồng đội (Mục 5)' })
  @ApiResponse({ status: 201, description: 'Tạo bài đăng thành công' })
  async create(@Request() req, @Body() dto: CreateMatchRequestDto) {
    return this.matchRequestsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Xem danh sách các bài đăng cáp kèo' })
  @ApiQuery({ name: 'sportType', required: false, description: 'Lọc theo môn (FOOTBALL, BADMINTON, TENNIS, ESPORTS...)' })
  @ApiQuery({ name: 'status', required: false, enum: MatchRequestStatus })
  @ApiQuery({ name: 'level', required: false, enum: MatchLevel, description: 'Lọc theo trình độ (VUI_VE, TRUNG_BINH, BAN_CHUYEN)' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Từ ngày (ISO 8601)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Đến ngày (ISO 8601)' })
  async findAll(
    @Query('sportType') sportType?: string,
    @Query('status') status?: MatchRequestStatus,
    @Query('level') level?: MatchLevel,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.matchRequestsService.findAll(sportType, status, level, fromDate, toDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bài đăng cáp kèo' })
  async findOne(@Param('id') id: string) {
    return this.matchRequestsService.findOne(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tham gia cáp kèo (Mục 5)' })
  @ApiResponse({ status: 200, description: 'Tham gia kèo thành công' })
  async joinMatch(@Param('id') id: string, @Request() req) {
    return this.matchRequestsService.joinMatch(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy / đóng bài đăng cáp kèo' })
  async cancelMatch(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.matchRequestsService.cancelMatch(id, req.user.userId, isAdmin);
  }
}
