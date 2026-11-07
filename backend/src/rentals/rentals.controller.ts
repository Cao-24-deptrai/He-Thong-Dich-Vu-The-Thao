import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RentalsService } from './rentals.service';

@ApiTags('Rentals & Equipment Inventory')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get('items')
  @ApiOperation({ summary: 'Lấy danh mục dụng cụ cho thuê (Bóng, Áo bib, Vợt) kèm số lượng khả dụng' })
  @ApiResponse({ status: 200, description: 'Danh sách dụng cụ thuê' })
  async getItems(@Query('sport') sport?: string): Promise<any> {
    return this.rentalsService.getItems(sport);
  }

  @Post('rent')
  @ApiOperation({ summary: 'Lập phiếu thuê dụng cụ, thu tiền cọc và tiền thuê' })
  @ApiResponse({ status: 201, description: 'Lập phiếu thuê thành công' })
  async rent(@Body() dto: any): Promise<any> {
    return this.rentalsService.rent(dto);
  }

  @Post('return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn trả dụng cụ, hoàn cọc và cập nhật số lượng tồn kho' })
  @ApiResponse({ status: 200, description: 'Hoàn trả và hoàn cọc thành công' })
  async returnRental(@Body() dto: any): Promise<any> {
    return this.rentalsService.returnRental(dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Danh sách phiếu thuê dụng cụ (Đang thuê / Đã trả)' })
  async getTickets(@Query('status') status?: string): Promise<any> {
    return this.rentalsService.getTickets(status);
  }
}
