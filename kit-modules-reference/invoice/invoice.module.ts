import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema.js';
import { InvoiceService } from './services/invoice.service.js';
import { INVOICE_ADAPTER } from './services/invoice-adapter.interface.js';
import { MockInvoiceAdapterService } from './services/mock-invoice-adapter.service.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { AdminInvoicesController } from './controllers/admin-invoices.controller.js';
import { PaymentModule } from '../payment/payment.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    PaymentModule,
    AuthModule,
  ],
  controllers: [InvoicesController, AdminInvoicesController],
  providers: [
    InvoiceService,
    MockInvoiceAdapterService,
    {
      provide: INVOICE_ADAPTER,
      useClass: MockInvoiceAdapterService,
    },
  ],
  exports: [InvoiceService, INVOICE_ADAPTER, MongooseModule],
})
export class InvoiceModule {}
