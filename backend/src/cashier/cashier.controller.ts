import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CashierService } from './cashier.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CashierWalkInDto } from './dto/cashier-walk-in.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Cashier Operations & Shifts')
@Controller('cashier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.CASHIER,
  UserRole.STAFF,
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.OWNER,
  UserRole.MANAGER,
)
@ApiBearerAuth()
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  // =========================================================================
  // 1. LẤY THÔNG TIN CA HIỆN TẠI
  // =========================================================================
  @Get('shift/current')
  @ApiOperation({ summary: 'Lấy thông tin ca làm việc hiện tại đang mở & đối soát doanh thu thời gian thực' })
  @ApiResponse({ status: 200, description: 'Thông tin ca làm việc, tiền đầu ca, doanh thu tiền mặt và VietQR' })
  async getCurrentShift(@CurrentUser() user: any) {
    return this.cashierService.getCurrentShift(user?.userId || user?._id);
  }

  // =========================================================================
  // 2. MỞ CA THU NGÂN MỚI
  // =========================================================================
  @Post('shift/open')
  @ApiOperation({ summary: 'Mở ca thu ngân mới (Khai báo tiền mặt quỹ đầu ca)' })
  @ApiResponse({ status: 201, description: 'Mở ca thành công, cấp mã ca CA-YYYYMMDD-S#' })
  async openShift(@CurrentUser() user: any, @Body() dto: OpenShiftDto) {
    const cashier = {
      _id: user?.userId || user?._id,
      fullName: user?.fullName || 'Thu Ngân Phanta',
    };
    return this.cashierService.openShift(cashier, dto);
  }

  // =========================================================================
  // 3. CHỐT CA THU NGÂN & BÀN GIAO KÉT TIỀN
  // =========================================================================
  @Post('shift/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chốt ca thu ngân (Kiểm đếm 9 mệnh giá tiền mặt, đối soát két và tính tiền chênh lệch)' })
  @ApiResponse({ status: 200, description: 'Chốt ca thành công, trả về biên bản tổng kết' })
  async closeShift(@CurrentUser() user: any, @Body() dto: CloseShiftDto) {
    const cashierId = user?.userId || user?._id;
    return this.cashierService.closeShift(cashierId, dto);
  }

  // =========================================================================
  // 4. LỊCH SỬ CÁC CA LÀM VIỆC
  // =========================================================================
  @Get('shift/history')
  @ApiOperation({ summary: 'Lịch sử các ca làm việc (Phân trang, tìm kiếm)' })
  async getShiftHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<any> {
    return this.cashierService.getShiftHistory(page, limit);
  }

  // =========================================================================
  // 5. DỮ LIỆU IN BIÊN BẢN CHỐT CA KHỔ 80MM
  // =========================================================================
  @Get('shift/:id/report-data')
  @ApiOperation({ summary: 'Lấy dữ liệu biên bản bàn giao ca phục vụ in nhiệt 80mm' })
  async getShiftReportData(@Param('id') id: string) {
    return this.cashierService.getShiftReportData(id);
  }

  // =========================================================================
  // 6. ĐẶT SÂN WALK-IN NHANH TẠI QUẦY THU NGÂN
  // =========================================================================
  @Post('walk-in')
  @ApiOperation({ summary: 'Đặt sân Walk-in nhanh tại quầy thu ngân (Tự sinh mã vé, tính thuế VAT & lưu doanh thu)' })
  @ApiResponse({ status: 201, description: 'Đặt sân thành công, trả về phiếu hóa đơn và mã vé check-in' })
  async createWalkIn(@CurrentUser() user: any, @Body() dto: CashierWalkInDto) {
    return this.cashierService.createWalkIn(user, dto);
  }

  // =========================================================================
  // 7. CHỨC NĂNG IN 1: HÓA ĐƠN THANH TOÁN BÁN LẺ POS (KHỔ 80MM)
  // =========================================================================
  @Get('receipt/:orderId/print-data')
  @ApiOperation({ summary: 'Lấy dữ liệu hóa đơn bán lẻ POS / Căng tin / Thuê đồ để in nhiệt 80mm' })
  @ApiResponse({ status: 200, description: 'Dữ liệu in hóa đơn 80mm ESC/POS' })
  async getReceiptPrintData(@Param('orderId') orderId: string): Promise<any> {
    return this.cashierService.getReceiptPrintData(orderId);
  }

  // =========================================================================
  // 8. CHỨC NĂNG IN 2: PHIẾU VÉ CỨNG CÓ MÃ QR VÀO SÂN CỔNG XOAY (KHỔ 80MM)
  // =========================================================================
  @Get('ticket/:bookingId/print-data')
  @ApiOperation({ summary: 'Lấy dữ liệu phiếu vé cứng vào sân có mã QR cổng xoay Turnstile để in 80mm' })
  @ApiResponse({ status: 200, description: 'Dữ liệu in thẻ vé cứng 80mm có mã QR' })
  async getTicketPrintData(@Param('bookingId') bookingId: string): Promise<any> {
    return this.cashierService.getTicketPrintData(bookingId);
  }
}
