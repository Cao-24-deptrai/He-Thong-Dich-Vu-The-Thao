import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopupWalletDto, WalletPayDto, WalletHoldDto, WalletReleaseDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Ví Khách Hàng (E08 - Phanta Pay)')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin ví và số dư khả dụng của tôi' })
  async getMyWallet(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.getMyWallet(userId);
  }

  @Get('me/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử biến động số dư / sổ cái cá nhân' })
  async getMyTransactions(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.getTransactions(userId, {
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('topup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nạp tiền vào ví qua VietQR / Chuyển khoản' })
  async topup(@CurrentUser() user: any, @Body() dto: TopupWalletDto) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.topup(userId, dto, userId);
  }

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thanh toán dịch vụ bằng số dư ví' })
  async pay(@CurrentUser() user: any, @Body() dto: WalletPayDto) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.pay(userId, dto, userId);
  }

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạm giữ tiền cọc ví (Gaming, Thuê dụng cụ)' })
  async hold(@CurrentUser() user: any, @Body() dto: WalletHoldDto) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.hold(userId, dto, userId);
  }

  @Post('release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giải tỏa tiền tạm giữ cọc' })
  async release(@CurrentUser() user: any, @Body() dto: WalletReleaseDto) {
    const userId = user.userId || user._id || user.id || user.sub;
    return this.walletService.release(userId, dto, userId);
  }
}
