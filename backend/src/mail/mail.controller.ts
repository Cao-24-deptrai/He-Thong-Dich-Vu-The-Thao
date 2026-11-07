import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { SendInvoiceDto } from './dto/send-invoice.dto';

@ApiTags('Mail & Invoices')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi hóa đơn điện tử VAT đặt sân qua email' })
  @ApiResponse({ status: 200, description: 'Đã gửi hóa đơn điện tử thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn đặt sân' })
  async sendInvoice(@Body() dto: SendInvoiceDto) {
    return this.mailService.sendBookingInvoiceByBookingId(dto.bookingId, dto.email);
  }

  @Post('test-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi hóa đơn điện tử mẫu để kiểm thử dịch vụ email' })
  @ApiResponse({ status: 200, description: 'Đã gửi email hóa đơn thử nghiệm thành công' })
  async sendTestInvoice(@Body('email') email: string) {
    return this.mailService.sendBookingInvoiceEmail({
      toEmail: email || 'customer@phanta.vn',
      customerName: 'Nguyễn Văn A',
      checkInCode: 'PHANTA-TEST99',
      venueName: 'Sân Bóng Đá F1',
      courtCode: 'F1 (Sân 7 người cỏ nhân tạo)',
      bookingDate: '2026-10-26',
      timeSlot: '17:30 - 19:00',
      courtPrice: 350000,
      rentalsTotal: 50000,
      discountAmount: 0,
      vatRate: 8,
      vatAmount: 32000,
      finalTotal: 432000,
      paymentMethod: 'Chuyển khoản VietQR',
    });
  }
}
