import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ApplyVoucherDto, ValidateVoucherDto } from './dto/apply-voucher.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mã khuyến mãi voucher mới (ADMIN / OWNER)' })
  @ApiResponse({ status: 201, description: 'Tạo voucher thành công' })
  @ApiResponse({ status: 409, description: 'Mã voucher đã tồn tại' })
  async createVoucher(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.createVoucher(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Xem danh sách các chương trình khuyến mãi voucher' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Danh sách vouchers' })
  async getVouchers(@Query('onlyActive') onlyActive?: string) {
    const isActive = onlyActive === 'true' || onlyActive === '1';
    return this.vouchersService.findAll(isActive);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Xem chi tiết thông tin và điều kiện áp dụng của một voucher' })
  @ApiResponse({ status: 200, description: 'Chi tiết voucher' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy voucher' })
  async getVoucherByCode(@Param('code') code: string) {
    return this.vouchersService.findByCode(code);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ và tính thử số tiền giảm giá trước khi đặt' })
  @ApiResponse({ status: 200, description: 'Voucher hợp lệ và chi tiết số tiền chiết khấu' })
  @ApiResponse({ status: 400, description: 'Voucher không đủ điều kiện hoặc đã hết hạn' })
  @ApiResponse({ status: 409, description: 'Voucher đã hết số lượt hoặc hết ngân sách' })
  async validateVoucher(@Body() dto: ValidateVoucherDto) {
    return this.vouchersService.validateVoucher(dto);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Áp dụng voucher nguyên tử vào đơn đặt sân / đơn hàng (BR-13, BR-15, AC-13, AC-15, AC-79)',
  })
  @ApiResponse({ status: 200, description: 'Áp dụng thành công, trả về mức giảm và mã usage' })
  @ApiResponse({ status: 409, description: 'Hết ngân sách phát hành, hết lượt dùng hoặc user vượt quá perUserLimit' })
  async applyVoucher(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyVoucherDto,
  ) {
    return this.vouchersService.applyVoucherAtomically(dto, userId);
  }

  @Post(':usageId/rollback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn lại lượt sử dụng voucher và ngân sách khi đơn bị hủy (Rollback)' })
  @ApiResponse({ status: 200, description: 'Hoàn trả lượt thành công' })
  async rollbackUsage(@Param('usageId') usageId: string) {
    return this.vouchersService.rollbackVoucherUsage(usageId);
  }
}
