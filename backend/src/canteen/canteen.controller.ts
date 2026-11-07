import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CanteenService } from './canteen.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Canteen F&B Operations')
@Controller('canteen')
export class CanteenController {
  constructor(private readonly canteenService: CanteenService) {}

  @Get('products')
  @ApiOperation({ summary: 'Lấy danh mục sản phẩm F&B căng tin (Đồ uống, Đồ ăn nhẹ, Combo)' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm căng tin' })
  async getProducts(@Query('category') category?: string): Promise<any> {
    return this.canteenService.getProducts(category);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Tạo đơn mua hàng F&B căng tin tại quầy POS hoặc từ App (Tính VAT 8%)' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công và lưu doanh thu' })
  async createOrder(@Body() dto: any, @Request() req: any): Promise<any> {
    return this.canteenService.createOrder(dto, req?.user);
  }
}
