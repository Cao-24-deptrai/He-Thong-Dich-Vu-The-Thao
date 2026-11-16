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
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { InvoiceService } from '../services/invoice.service.js';
import {
  createInvoiceSchema,
  CreateInvoiceDto,
  InvoiceStatus,
  InvoiceProvider,
} from '@sports/contracts';

@Controller('admin/invoices')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminInvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async getInvoices(
    @Query('status') status?: InvoiceStatus,
    @Query('provider') provider?: InvoiceProvider,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.invoiceService.findAllInvoices({
      status,
      provider,
      date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @CurrentUser('sub') actorId: string,
    @Body() body: CreateInvoiceDto,
  ) {
    const validated = createInvoiceSchema.parse(body);
    const result = await this.invoiceService.createInvoice(validated, actorId);
    return { data: result };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryInvoice(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    const result = await this.invoiceService.issueInvoiceWithRetry(id, actorId);
    return { data: result };
  }

  @Post(':id/cancel')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  async cancelInvoice(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.invoiceService.cancelInvoice(
      id,
      reason || 'Hủy theo yêu cầu kế toán',
      actorId,
    );
    return { data: result };
  }

  @Get('uninvoiced-report')
  async getUninvoicedReport() {
    const result = await this.invoiceService.findUninvoicedPayments();
    return { data: result };
  }
}
