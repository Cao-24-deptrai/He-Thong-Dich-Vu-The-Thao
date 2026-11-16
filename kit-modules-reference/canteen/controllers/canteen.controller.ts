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
import { CurrentUser, RequireRoles } from '../../auth/index.js';
import { Role, ProductCategory } from '@sports/shared';
import { InventoryService } from '../services/inventory.service.js';
import { CashierShiftService } from '../services/cashier-shift.service.js';
import { CanteenOrderService } from '../services/canteen-order.service.js';
import {
  createPosOrderSchema,
  CreatePosOrderDto,
  openCashierShiftSchema,
  OpenCashierShiftDto,
  closeCashierShiftSchema,
  CloseCashierShiftDto,
} from '@sports/contracts';

@Controller('canteen')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class CanteenController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly cashierShiftService: CashierShiftService,
    private readonly canteenOrderService: CanteenOrderService,
  ) {}

  @Get('products')
  async getProducts(
    @Query('category') category?: ProductCategory,
    @Query('search') search?: string,
    @Query('barcode') barcode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.inventoryService.findAll({
      category,
      search,
      barcode,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { data: result };
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const result = await this.inventoryService.findById(id);
    return { data: result };
  }

  @Get('shifts/current')
  async getCurrentShift(@CurrentUser('sub') cashierId: string) {
    const result = await this.cashierShiftService.getActiveShift(cashierId);
    return { data: result };
  }

  @Post('shifts/open')
  @HttpCode(HttpStatus.CREATED)
  async openShift(
    @CurrentUser('sub') cashierId: string,
    @CurrentUser('name') cashierName: string,
    @Body() body: OpenCashierShiftDto,
  ) {
    const validated = openCashierShiftSchema.parse(body);
    const result = await this.cashierShiftService.openShift(cashierId, cashierName || 'Thu ngân', validated);
    return { data: result };
  }

  @Post('shifts/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @Param('id') shiftId: string,
    @CurrentUser('sub') cashierId: string,
    @Body() body: CloseCashierShiftDto,
  ) {
    const validated = closeCashierShiftSchema.parse(body);
    const result = await this.cashierShiftService.closeShift(shiftId, cashierId, validated);
    return { data: result };
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createPosOrder(
    @CurrentUser('sub') cashierId: string,
    @Body() body: CreatePosOrderDto,
  ) {
    const validated = createPosOrderSchema.parse(body);
    const result = await this.canteenOrderService.createPosOrder(cashierId, validated);
    return { data: result };
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    const result = await this.canteenOrderService.findById(id);
    return { data: result };
  }
}
