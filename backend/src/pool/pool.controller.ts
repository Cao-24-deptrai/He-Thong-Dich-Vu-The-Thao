import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PoolService } from './pool.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { PoolCode } from './enums/pool.enum';
import {
  PurchasePoolTicketDto,
  ScanPoolTicketDto,
  EmergencyClosePoolDto,
  PoolCheckOutDto,
} from './dto/pool.dto';

@ApiTags('Pool Services & Tickets (Epic E11)')
@Controller('pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get('status')
  @ApiOperation({ summary: 'Giám sát sức chứa thời gian thực 2 hồ bơi (Olympic 50m và Khởi động 25m)' })
  @ApiResponse({ status: 200, description: 'Trạng thái sức chứa và tỷ lệ lấp đầy an toàn' })
  async getStatus() {
    return this.poolService.getPoolsStatus();
  }

  @Post('tickets/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mua vé bơi theo lượt trong ngày: Người lớn 25.000đ, Trẻ em 20.000đ (BR-31)' })
  @ApiResponse({ status: 201, description: 'Mua vé thành công, trả về danh sách mã QR vé bơi' })
  async purchaseTickets(
    @Body() dto: PurchasePoolTicketDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.poolService.purchaseTickets(userId, dto);
  }

  @Post('tickets/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quét vé bơi qua cổng hồ bơi (BR-31): Gán vào hồ đó và tăng bộ đếm sức chứa an toàn',
  })
  @ApiResponse({ status: 200, description: 'Mở cổng hồ bơi thành công' })
  @ApiResponse({ status: 400, description: 'Vé đã dùng, vé hết hạn hoặc hồ bơi đang đóng' })
  @ApiResponse({ status: 409, description: 'Hồ bơi đã đầy sức chứa an toàn (POOL_CAPACITY_FULL)' })
  async scanTicket(@Body() dto: ScanPoolTicketDto) {
    return this.poolService.scanPoolTicket(dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Khách rời hồ bơi, giải phóng sức chứa an toàn' })
  @ApiResponse({ status: 200, description: 'Check-out hoàn tất' })
  async checkOut(@Body() dto: PoolCheckOutDto) {
    return this.poolService.checkOutSwimmer(dto);
  }

  @Post('emergency-close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đóng hồ bơi đột xuất: Tự động hủy và hoàn 100% tiền cho các vé chưa quét trong ngày (AC-87)',
  })
  @ApiResponse({ status: 200, description: 'Đóng hồ và hoàn tiền vé thành công' })
  async emergencyClose(@Body() dto: EmergencyClosePoolDto) {
    return this.poolService.emergencyClosePool(dto);
  }

  @Post('reopen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mở lại hồ bơi sau khi khắc phục sự cố' })
  @ApiResponse({ status: 200, description: 'Mở lại hồ bơi thành công' })
  async reopenPool(@Body('poolCode') poolCode: PoolCode) {
    return this.poolService.reopenPool(poolCode);
  }

  @Get('tickets/me')
  @ApiQuery({ name: 'phone', required: false })
  @ApiOperation({ summary: 'Xem danh sách vé bơi của tôi' })
  async getMyTickets(
    @CurrentUser('userId') userId?: string,
    @Query('phone') phone?: string,
  ) {
    return this.poolService.getMyTickets(userId, phone);
  }

  // ==========================================
  // TƯƠNG THÍCH NGƯỢC (LEGACY APIS)
  // ==========================================
  @Post('ticket')
  @ApiOperation({ summary: 'Legacy: Xuất vé bơi' })
  async createTicket(@Body() dto: any) {
    return this.poolService.createTicket(dto);
  }
}
