import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoices.controller';
import { AdminInvoicesController } from './admin-invoices.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [InvoicesController, AdminInvoicesController],
  providers: [InvoiceService],
  exports: [InvoiceService, MongooseModule],
})
export class InvoiceModule {}
