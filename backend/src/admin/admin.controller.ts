import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Admin Operations & Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OWNER, UserRole.MANAGER)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // =========================================================================
  // 1. DASHBOARD TỔNG HỢP (KPIs, SỨC CHỨA & DOANH THU)
  // =========================================================================
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Thống kê tổng hợp Dashboard (Doanh thu, Đơn đặt, Sức chứa thời gian thực)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu KPIs tổng hợp tải siêu tốc < 50ms qua Redis' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // =========================================================================
  // 2. BỐN BÁO CÁO BIỂU ĐỒ PIE & BAR CHUYÊN SÂU (KÈM DRILL-DOWN & EXCEL)
  // =========================================================================
  @Get('reports/revenue-7days')
  @ApiOperation({ summary: 'Doanh thu 7 ngày gần nhất (Bar) & Cơ cấu theo môn (Pie)' })
  async getRevenue7Days() {
    return this.adminService.getRevenueBySportReport();
  }

  @Get('reports/revenue-by-sport')
  @ApiOperation({ summary: 'Báo cáo 1: Cơ cấu doanh thu theo bộ môn thể thao (Biểu đồ Pie & Bar 7 ngày)' })
  async getRevenueBySportReport() {
    return this.adminService.getRevenueBySportReport();
  }

  @Get('reports/drilldown')
  @ApiOperation({ summary: 'Drill-down: Danh sách chi tiết hóa đơn khi bấm vào biểu đồ' })
  async getDrilldown(@Query('sport') sport: string) {
    return this.adminService.getRevenueBySportDrilldown(sport || 'SOCCER');
  }

  @Get('reports/revenue-by-sport/drilldown')
  @ApiOperation({ summary: 'Drill-down: Danh sách chi tiết hóa đơn khi bấm vào biểu đồ' })
  async getRevenueBySportDrilldown(@Query('sport') sport: string) {
    return this.adminService.getRevenueBySportDrilldown(sport || 'SOCCER');
  }

  @Get('reports/occupancy-by-hour')
  @ApiOperation({ summary: 'Tỷ lệ lấp đầy theo 7 khung giờ (Bar) & Phân bổ lượng khách (Pie)' })
  async getOccupancyByHour() {
    return this.adminService.getSlotUtilizationReport();
  }

  @Get('reports/slot-utilization')
  @ApiOperation({ summary: 'Báo cáo 2: Tỷ lệ lấp đầy khung giờ & phân tích giờ cao điểm' })
  async getSlotUtilizationReport() {
    return this.adminService.getSlotUtilizationReport();
  }

  @Get('reports/wallet-reconciliation')
  @ApiOperation({ summary: 'Báo cáo 3: Đối soát ví Phanta Pay & đối chiếu dòng tiền nạp/chi' })
  async getWalletReconciliationReport() {
    return this.adminService.getWalletReconciliationReport();
  }

  @Get('reports/canteen-equipment-revenue')
  @ApiOperation({ summary: 'Doanh thu F&B Căng tin & Thuê dụng cụ POS (Bar) & Phương thức thu ngân (Pie)' })
  async getCanteenEquipmentRevenue() {
    return this.adminService.getShiftsSummaryReport();
  }

  @Get('reports/shifts-summary')
  @ApiOperation({ summary: 'Báo cáo 4: Tổng kết ca thu ngân, quỹ tiền mặt & doanh thu căng tin' })
  async getShiftsSummaryReport() {
    return this.adminService.getShiftsSummaryReport();
  }

  @Get('reports/export-excel')
  @ApiOperation({ summary: 'Xuất dữ liệu báo cáo thống kê và danh sách drill-down ra file Excel (.xlsx)' })
  async exportReportsExcel(
    @Query() query: any,
    @Res() res: Response,
  ) {
    return this.adminService.exportReportsToExcel(query, res);
  }

  // =========================================================================
  // 3. XUẤT TOÀN BỘ DANH SÁCH RA FILE EXCEL (KHÔNG BỊ GIỚI HẠN BỞI PHÂN TRANG)
  // =========================================================================
  // 3. SỔ CÁI DANH SÁCH ĐẶT SÂN & XUẤT EXCEL (TOÀN BỘ DANH SÁCH THEO BỘ LỌC)
  // =========================================================================
  @Get('bookings')
  @ApiOperation({ summary: 'Bảng sổ cái danh sách đặt sân (Phân trang, tìm kiếm, STT liên tục, lọc bộ môn & trạng thái)' })
  async getBookings(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sportCategory') sportCategory?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<any> {
    return this.adminService.getBookingsLedger({ search, status, sportCategory, page, limit });
  }

  @Get('export/:entity')
  @ApiOperation({ summary: 'Xuất toàn bộ danh sách ra file Excel (.xlsx) theo bộ lọc' })
  async exportExcel(
    @Param('entity') entity: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    return this.adminService.exportEntityToExcel(entity, query, res);
  }

  // =========================================================================
  // 4. QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN RBAC (CRUD)
  // =========================================================================
  @Get('users')
  @ApiOperation({ summary: 'Danh sách người dùng (Tìm kiếm, phân trang, STT liên tục, lọc vai trò, lọc trạng thái)' })
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<any> {
    return this.adminService.getUsers({ search, role, status, page, limit });
  }

  @Get('users/export-excel')
  @ApiOperation({ summary: 'Xuất toàn bộ danh sách người dùng theo bộ lọc ra file Excel (.xlsx)' })
  async exportUsersExcel(
    @Query() query: any,
    @Res() res: Response,
  ) {
    return this.adminService.exportEntityToExcel('users', query, res);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Xem chi tiết tài khoản người dùng' })
  async getUserById(@Param('id') id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Tạo tài khoản người dùng / nhân viên mới' })
  async createUser(@Body() dto: any): Promise<any> {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin / vai trò người dùng' })
  async updateUser(@Param('id') id: string, @Body() dto: any): Promise<any> {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản (Yêu cầu xác nhận xóa)' })
  async deleteUser(@Param('id') id: string): Promise<any> {
    return this.adminService.deleteUser(id);
  }

  // =========================================================================
  // 5. QUẢN LÝ CỤM SÂN & TỌA ĐỘ 3D (CRUD)
  // =========================================================================
  @Get('venues')
  @Roles(
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Danh sách 16 cụm sân với đầy đủ tọa độ không gian 3D' })
  async getVenues(
    @Query('sportCategory') sportCategory?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.adminService.getVenues({ sportCategory, status, search });
  }

  @Patch('venues/:id')
  @ApiOperation({ summary: 'Cập nhật trạng thái sân hoặc sức chứa' })
  async updateVenue(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateVenue(id, dto);
  }

  // =========================================================================
  // 6. LƯU TRỮ HÌNH ẢNH (IMAGE UPLOAD)
  // =========================================================================
  @Post('upload/image')
  @ApiOperation({ summary: 'Tải lên hình ảnh sân / sản phẩm / đại diện' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh định dạng JPG, PNG, WEBP!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh để tải lên');
    return {
      success: true,
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }

  // =========================================================================
  // 7. CÁC HÀM HOÀN TIỀN CŨ
  // =========================================================================
  @Get('refund-pending')
  @ApiOperation({ summary: 'Danh sách đơn chờ hoàn tiền' })
  async getRefundPending() {
    return this.adminService.getRefundPendingList();
  }

  @Patch('refund/:bookingId')
  @ApiOperation({ summary: 'Xác nhận hoàn tiền thủ công' })
  async confirmRefund(
    @Param('bookingId') bookingId: string,
    @Body('refundNote') refundNote?: string,
  ) {
    return this.adminService.confirmManualRefund(bookingId, refundNote);
  }

  @Post('refund/:bookingId/auto')
  @ApiOperation({ summary: 'Hoàn tiền tự động qua cổng thanh toán' })
  async autoRefund(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.autoRefund(bookingId, reason);
  }
}
