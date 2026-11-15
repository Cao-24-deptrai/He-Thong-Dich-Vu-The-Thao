import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Quản Trị Thuế & HĐĐT VAT (E09 - Admin Invoices)')
@Controller('admin/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
@ApiBearerAuth()
export class AdminInvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'Bảng kê danh sách hóa đơn điện tử VAT' })
  async getAllInvoices(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoiceService.getAllInvoices({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('issue')
  @ApiOperation({ summary: 'Ký số và phát hành hóa đơn GTGT điện tử' })
  async issueInvoice(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    const adminId = user.userId || user._id || user.id || user.sub;
    return this.invoiceService.createInvoice(adminId, dto);
  }
}
