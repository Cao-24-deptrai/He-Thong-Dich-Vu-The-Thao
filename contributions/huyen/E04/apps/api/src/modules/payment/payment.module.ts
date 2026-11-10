import { Module, Global, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema.js';
import {
  PaymentEvent,
  PaymentEventSchema,
} from './schemas/payment-event.schema.js';
import { PaymentService } from './services/payment.service.js';
import { PaymentWebhookService } from './services/payment-webhook.service.js';
import { VietQrService } from './services/vietqr.service.js';
import { PaymentsController } from './controllers/payments.controller.js';
import { AdminPaymentsController } from './controllers/admin-payments.controller.js';
import { BookingModule } from '../booking/booking.module.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentEvent.name, schema: PaymentEventSchema },
    ]),
    forwardRef(() => BookingModule),
  ],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentService, PaymentWebhookService, VietQrService],
  exports: [PaymentService, PaymentWebhookService, VietQrService, MongooseModule],
})
export class PaymentModule {}
