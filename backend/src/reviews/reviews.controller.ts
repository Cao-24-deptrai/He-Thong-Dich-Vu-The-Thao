import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, QueryReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng gửi đánh giá đa tiêu chí sau khi hoàn tất đơn (Mục 7 - POST /reviews)' })
  @ApiResponse({ status: 201, description: 'Gửi đánh giá thành công' })
  @ApiResponse({ status: 400, description: 'Quá thời hạn 7 ngày hoặc đơn chưa hoàn thành' })
  @ApiResponse({ status: 409, description: 'Đã gửi đánh giá trước đó' })
  async createReview(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Xem điểm đánh giá trung bình tổng và theo 4 tiêu chí (Mục 7 - GET /reviews/summary)' })
  @ApiResponse({ status: 200, description: 'Thống kê điểm đánh giá' })
  async getReviewSummary(@Query('facilityId') facilityId?: string) {
    return this.reviewsService.getReviewSummary(facilityId);
  }

  @Get('reports/facility-breakdown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Báo cáo xếp hạng điểm chất lượng các cơ sở theo đánh giá (Epic E16)' })
  @ApiResponse({ status: 200, description: 'Báo cáo xếp hạng' })
  async getFacilityBreakdown() {
    return this.reviewsService.getFacilityRatingBreakdown();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đánh giá (hỗ trợ lọc theo cơ sở, số sao, cờ cảnh báo <= 2 sao)' })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá' })
  async findAll(@Query() query: QueryReviewDto) {
    return this.reviewsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết đánh giá' })
  async findById(@Param('id') id: string) {
    return this.reviewsService.findById(id);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nhân viên quầy / Quản trị viên phản hồi nhận xét của khách (Mục 7 - POST /reviews/:id/respond)' })
  @ApiResponse({ status: 200, description: 'Phản hồi thành công' })
  async respondToReview(
    @Param('id') id: string,
    @CurrentUser() staffUser: any,
    @Body() dto: RespondReviewDto,
  ) {
    return this.reviewsService.respondToReview(id, staffUser, dto);
  }

  @Patch(':id/dismiss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bỏ cờ cảnh báo khẩn cấp sau khi đã xử lý xong khiếu nại (Admin / Owner)' })
  @ApiResponse({ status: 200, description: 'Đã bỏ cờ cảnh báo' })
  async dismissAttention(@Param('id') id: string) {
    return this.reviewsService.dismissAttention(id);
  }
}
