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
import { PaymentService } from '../services/payment.service.js';
import {
  cashPaymentSchema,
  splitPaymentSchema,
  CashPaymentDto,
  SplitPaymentDto,
  PaymentStatus,
  PaymentProvider,
} from '@sports/contracts';

@Controller('admin/payments')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminPaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('pos/cash')
  @HttpCode(HttpStatus.OK)
  async processCash(
    @CurrentUser('sub') actorId: string,
    @Body() body: CashPaymentDto,
  ) {
    const validated = cashPaymentSchema.parse(body);
    const result = await this.paymentService.processCashPayment(actorId, validated);
    return { data: result };
  }

  @Post('pos/split')
  @HttpCode(HttpStatus.OK)
  async processSplit(
    @CurrentUser('sub') actorId: string,
    @Body() body: SplitPaymentDto,
  ) {
    const validated = splitPaymentSchema.parse(body);
    const results = await this.paymentService.processSplitPayment(actorId, validated);
    return { data: results };
  }

  @Post(':id/refund')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') paymentId: string,
    @CurrentUser('sub') actorId: string,
    @Body('amount') amount: number,
    @Body('reason') reason?: string,
  ) {
    const result = await this.paymentService.refundPayment(
      paymentId,
      amount,
      reason,
      actorId,
    );
    return { data: result };
  }

  @Get()
  async getPayments(
    @Query('status') status?: PaymentStatus,
    @Query('provider') provider?: PaymentProvider,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.paymentService.findAllPayments({
      status,
      provider,
      date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Get('mismatches')
  async getMismatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.paymentService.findMismatches(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { data: result };
  }

  @Get('reconcile')
  async reconcile(
    @Query('date') date: string,
    @Query('provider') provider?: PaymentProvider,
  ) {
    const today = date || new Date().toISOString().slice(0, 10);
    const result = await this.paymentService.reconcileDaily(today, provider);
    return { data: result };
  }
}
