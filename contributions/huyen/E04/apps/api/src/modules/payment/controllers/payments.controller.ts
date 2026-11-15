import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, Public } from '../../auth/index.js';
import { PaymentService } from '../services/payment.service.js';
import { PaymentWebhookService } from '../services/payment-webhook.service.js';
import {
  createPaymentSchema,
  webhookPayloadSchema,
  CreatePaymentDto,
  WebhookPayloadDto,
  PaymentProvider,
} from '@sports/contracts';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly webhookService: PaymentWebhookService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePaymentDto,
  ) {
    const validated = createPaymentSchema.parse(body);
    const payment = await this.paymentService.createPayment(userId, validated);
    return { data: payment };
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    const payment = await this.paymentService.getPayment(id);
    return { data: payment };
  }

  @Post(':id/wallet-pay')
  @HttpCode(HttpStatus.OK)
  async payWithWallet(
    @CurrentUser('sub') userId: string,
    @Param('id') paymentId: string,
    @Body('idempotencyKey') idempotencyKey: string,
  ) {
    const payment = await this.paymentService.processWalletPayment(
      userId,
      paymentId,
      idempotencyKey,
    );
    return { data: payment };
  }

  /**
   * Endpoint công khai tiếp nhận Webhook/IPN từ các cổng thanh toán
   */
  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: PaymentProvider,
    @Body() body: WebhookPayloadDto,
  ) {
    const validated = webhookPayloadSchema.parse({
      ...body,
      provider: provider || body.provider,
    });
    const result = await this.webhookService.processWebhook(validated);
    return result;
  }
}
