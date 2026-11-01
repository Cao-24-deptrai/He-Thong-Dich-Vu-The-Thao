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
import { RentalsService } from './rentals.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateRentalTicketDto } from './dto/create-rental-ticket.dto';
import { ReturnRentalTicketDto } from './dto/return-rental-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, SportType, RentalTicketStatus } from '../common/enums';

@ApiTags('Rentals')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  // -------------------------------------------------------------
  // EQUIPMENT ENDPOINTS
  // -------------------------------------------------------------

  @Get('equipments')
  @ApiOperation({ summary: 'Xem danh sách thiết bị cho thuê (Có bộ lọc môn, khả dụng, tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Danh sách thiết bị' })
  async getEquipments(
    @Query('sportType') sportType?: SportType,
    @Query('search') search?: string,
    @Query('availableOnly') availableOnly?: string,
  ) {
    return this.rentalsService.findAllEquipments({
      sportType,
      search,
      availableOnly: availableOnly === 'true',
    });
  }

  @Get('equipments/:id')
  @ApiOperation({ summary: 'Xem chi tiết thiết bị theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết thiết bị' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async getEquipmentById(@Param('id') id: string) {
    return this.rentalsService.findEquipmentById(id);
  }

  @Post('equipments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo thiết bị mới trong kho (Admin / Owner)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async createEquipment(@Body() dto: CreateEquipmentDto) {
    return this.rentalsService.createEquipment(dto);
  }

  @Patch('equipments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin/giá/số lượng thiết bị (Admin / Owner)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateEquipment(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.rentalsService.updateEquipment(id, dto);
  }

  // -------------------------------------------------------------
  // RENTAL TICKET ENDPOINTS
  // -------------------------------------------------------------

  @Post('tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiếu thuê dụng cụ tại quầy (Staff / Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo phiếu thuê thành công' })
  @ApiResponse({ status: 409, description: 'Số lượng thiết bị không đủ khả dụng' })
  async createRentalTicket(
    @CurrentUser('userId') cashierId: string,
    @Body() dto: CreateRentalTicketDto,
  ) {
    return this.rentalsService.createRentalTicket(cashierId, dto);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách phiếu thuê dụng cụ' })
  @ApiResponse({ status: 200, description: 'Danh sách phiếu thuê' })
  async getTickets(
    @Query('status') status?: RentalTicketStatus,
    @Query('customerPhone') customerPhone?: string,
    @Query('shiftId') shiftId?: string,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.rentalsService.findAllTickets({
      status,
      customerPhone,
      shiftId,
      bookingId,
    });
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem chi tiết phiếu thuê theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết phiếu thuê' })
  async getTicketById(@Param('id') id: string) {
    return this.rentalsService.findTicketById(id);
  }

  @Post('tickets/:id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trả dụng cụ và quyết toán bồi thường hư hỏng / hoàn cọc (Staff / Admin)' })
  @ApiResponse({ status: 200, description: 'Quyết toán trả đồ thành công' })
  async returnRentalTicket(
    @Param('id') id: string,
    @Body() dto: ReturnRentalTicketDto,
  ) {
    return this.rentalsService.returnRentalTicket(id, dto);
  }

  @Get('shifts/:shiftId/unreturned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra cảnh báo phiếu thuê chưa trả của ca làm việc trước khi chốt ca' })
  @ApiResponse({ status: 200, description: 'Danh sách phiếu chưa trả' })
  async checkShiftUnreturned(@Param('shiftId') shiftId: string) {
    return this.rentalsService.checkUnreturnedRentalsForShift(shiftId);
  }
}
