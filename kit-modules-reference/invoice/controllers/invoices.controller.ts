import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/index.js';
import { InvoiceService } from '../services/invoice.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('me')
  async getMyInvoices(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.invoiceService.findMyInvoices(
      userId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { data: result };
  }

  @Get(':id')
  async getInvoice(@Param('id') id: string) {
    const invoice = await this.invoiceService.getInvoice(id);
    return { data: invoice };
  }

  @Get(':id/pdf')
  async getInvoicePdf(@Param('id') id: string) {
    const pdfUrl = await this.invoiceService.getInvoicePdf(id);
    return { data: { pdfUrl } };
  }
}
