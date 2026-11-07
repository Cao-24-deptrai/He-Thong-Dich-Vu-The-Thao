import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, RequireRoles, Public } from '../../auth/index.js';
import { Role } from '@sports/shared';
import { EquipmentService } from '../services/equipment.service.js';
import { RentalService } from '../services/rental.service.js';
import { CashierShiftService } from '../../canteen/services/cashier-shift.service.js';
import {
  createRentalTicketSchema,
  CreateRentalTicketDto,
  returnRentalTicketSchema,
  ReturnRentalTicketDto,
  SportType,
} from '@sports/contracts';

@Controller('rentals')
export class RentalController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly rentalService: RentalService,
    private readonly cashierShiftService: CashierShiftService,
  ) {}

  @Public()
  @Get('equipments')
  async getEquipments(
    @Query('sportType') sportType?: SportType,
    @Query('search') search?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.equipmentService.findAll({
      sportType,
      search,
      availableOnly: availableOnly === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { data: result };
  }

  @Public()
  @Get('equipments/:id')
  async getEquipment(@Param('id') id: string) {
    const result = await this.equipmentService.findById(id);
    return { data: result };
  }

  @Post('tickets')
  @RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @CurrentUser('sub') cashierId: string,
    @Body() body: CreateRentalTicketDto,
  ) {
    const validated = createRentalTicketSchema.parse(body);
    const result = await this.rentalService.createRentalTicket(cashierId, validated);
    return { data: result };
  }

  @Get('tickets/:id')
  @RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  async getTicket(@Param('id') id: string) {
    const result = await this.rentalService.findById(id);
    return { data: result };
  }

  @Post('tickets/:id/return')
  @RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @HttpCode(HttpStatus.OK)
  async returnTicket(
    @Param('id') ticketId: string,
    @CurrentUser('sub') cashierId: string,
    @Body() body: ReturnRentalTicketDto,
  ) {
    const validated = returnRentalTicketSchema.parse(body);
    const result = await this.rentalService.returnRentalTicket(ticketId, cashierId, validated);
    return { data: result };
  }

  /**
   * Cảnh báo đồ chưa trả trước khi chốt ca thu ngân
   */
  @Get('shifts/unreturned')
  @RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  async getUnreturnedForShift(@CurrentUser('sub') cashierId: string) {
    const activeShift = await this.cashierShiftService.getActiveShift(cashierId);
    if (!activeShift) {
      return { data: [] };
    }
    const result = await this.rentalService.getUnreturnedRentalsForShift(activeShift._id.toString());
    return { data: result };
  }
}
