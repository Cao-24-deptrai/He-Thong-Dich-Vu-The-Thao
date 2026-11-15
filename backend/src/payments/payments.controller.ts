import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sinh link/QR thanh toán (Mục 5 - POST /payments/create-link)' })
  @ApiResponse({ status: 201, description: 'Tạo link thanh toán thành công' })
  @ApiResponse({ status: 400, description: 'Đơn hết hạn hoặc không hợp lệ' })
  async createPaymentLink(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentLinkDto,
  ) {
    return this.paymentsService.createPaymentLink(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận callback webhook từ cổng thanh toán (Mục 5 & Mục 4.2)' })
  @ApiResponse({ status: 200, description: 'Webhook đã được xử lý (hoặc bỏ qua do Idempotent)' })
  async handleWebhook(@Body() payload: WebhookPayloadDto) {
    return this.paymentsService.processWebhook(payload);
  }
}
