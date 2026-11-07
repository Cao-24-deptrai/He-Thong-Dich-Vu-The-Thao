import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';

@ApiTags('Phanta Pay Wallet & Immutable Ledger')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Xem số dư ví Phanta Pay, điểm thưởng và hạng hội viên' })
  @ApiResponse({ status: 200, description: 'Số dư ví và thông tin hội viên' })
  async getBalance(@Query('phone') phone?: string, @Query('userId') userId?: string): Promise<any> {
    return this.walletService.getBalance(phone, userId);
  }

  @Post('topup')
  @ApiOperation({ summary: 'Nạp tiền vào ví Phanta Pay qua VietQR / Chuyển khoản (Ghi sổ cái bất biến)' })
  @ApiResponse({ status: 201, description: 'Nạp tiền ví thành công' })
  async topup(@Body() dto: any): Promise<any> {
    return this.walletService.topup(dto);
  }

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thanh toán dịch vụ (sân, căng tin, đồ thuê) bằng số dư ví trong 1 chạm' })
  @ApiResponse({ status: 200, description: 'Thanh toán thành công' })
  async pay(@Body() dto: any): Promise<any> {
    return this.walletService.pay(dto);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn tiền tức thì trong 3 giây khi hủy đặt sân hợp lệ' })
  @ApiResponse({ status: 200, description: 'Hoàn tiền thành công trong 3 giây' })
  async refund(@Body() dto: any): Promise<any> {
    return this.walletService.refund(dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử biến động số dư và sổ cái bất biến (Phân trang, STT liên tục)' })
  @ApiResponse({ status: 200, description: 'Lịch sử giao dịch ví' })
  async getHistory(
    @Query('phone') phone?: string,
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<any> {
    return this.walletService.getHistory(phone, userId, page, limit);
  }
}
