import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Hóa Đơn Điện Tử VAT (E09 - Invoices)')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử hóa đơn điện tử của khách hàng' })
  async getMyInvoices(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.invoiceService.getMyInvoices(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yêu cầu xuất hóa đơn GTGT điện tử' })
  async requestInvoice(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.invoiceService.createInvoice(userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết hóa đơn điện tử và mã CQT' })
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoiceById(id);
  }
}
