import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, RequireRoles } from '../../auth/index.js';
import { Role } from '@sports/shared';
import { InventoryService } from '../services/inventory.service.js';
import { CanteenOrderService } from '../services/canteen-order.service.js';
import {
  createProductSchema,
  CreateProductDto,
  updateProductSchema,
  UpdateProductDto,
  stockInSchema,
  StockInDto,
  stockOutSchema,
  StockOutDto,
  stockAuditSchema,
  StockAuditDto,
  cancelPosOrderSchema,
  CancelPosOrderDto,
} from '@sports/contracts';

@Controller('admin/canteen')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminCanteenController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly canteenOrderService: CanteenOrderService,
  ) {}

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() body: CreateProductDto) {
    const validated = createProductSchema.parse(body);
    const result = await this.inventoryService.createProduct(validated);
    return { data: result };
  }

  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    const validated = updateProductSchema.parse(body);
    const result = await this.inventoryService.updateProduct(id, validated);
    return { data: result };
  }

  @Post('stock/in')
  @HttpCode(HttpStatus.CREATED)
  async stockIn(
    @CurrentUser('sub') operatorId: string,
    @Body() body: StockInDto,
  ) {
    const validated = stockInSchema.parse(body);
    const result = await this.inventoryService.createStockIn(validated, operatorId);
    return { data: result };
  }

  @Post('stock/out')
  @HttpCode(HttpStatus.CREATED)
  async stockOut(
    @CurrentUser('sub') operatorId: string,
    @Body() body: StockOutDto,
  ) {
    const validated = stockOutSchema.parse(body);
    const result = await this.inventoryService.createStockOut(validated, operatorId);
    return { data: result };
  }

  @Post('stock/audit')
  @HttpCode(HttpStatus.OK)
  async stockAudit(
    @CurrentUser('sub') operatorId: string,
    @Body() body: StockAuditDto,
  ) {
    const validated = stockAuditSchema.parse(body);
    const result = await this.inventoryService.auditStock(validated, operatorId);
    return { data: result };
  }

  @Get('stock/low-stock')
  async getLowStock() {
    const result = await this.inventoryService.getLowStockProducts();
    return { data: result };
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id') orderId: string,
    @CurrentUser('sub') operatorId: string,
    @Body() body: CancelPosOrderDto,
  ) {
    const validated = cancelPosOrderSchema.parse(body);
    const result = await this.canteenOrderService.cancelOrder(orderId, operatorId, validated);
    return { data: result };
  }

  @Get('reports/profit')
  async getProfitReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const result = await this.canteenOrderService.getProfitReport(from, to);
    return { data: result };
  }
}
