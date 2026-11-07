import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/index.js';
import { WalletService } from '../services/wallet.service.js';
import {
  topupWalletSchema,
  walletPaySchema,
  walletHoldSchema,
  walletReleaseSchema,
  TopupWalletDto,
  WalletPayDto,
  WalletHoldDto,
  WalletReleaseDto,
  WalletTxnType,
} from '@sports/contracts';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  async getMyWallet(@CurrentUser('sub') userId: string) {
    const wallet = await this.walletService.getWallet(userId);
    return {
      data: {
        id: wallet.id,
        userId: wallet.userId.toString(),
        balance: wallet.balance,
        held: wallet.held,
        total: wallet.balance + wallet.held,
        version: wallet.version,
        updatedAt: wallet.updatedAt.toISOString(),
      },
    };
  }

  @Get('me/transactions')
  async getMyTransactions(
    @CurrentUser('sub') userId: string,
    @Query('type') type?: WalletTxnType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getTransactions(userId, {
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  async topup(
    @CurrentUser('sub') userId: string,
    @Body() body: TopupWalletDto,
  ) {
    const validated = topupWalletSchema.parse(body);
    const result = await this.walletService.topup(userId, validated, userId);
    return { data: result };
  }

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  async pay(
    @CurrentUser('sub') userId: string,
    @Body() body: WalletPayDto,
  ) {
    const validated = walletPaySchema.parse(body);
    const result = await this.walletService.pay(userId, validated, userId);
    return { data: result };
  }

  @Post('hold')
  @HttpCode(HttpStatus.OK)
  async hold(
    @CurrentUser('sub') userId: string,
    @Body() body: WalletHoldDto,
  ) {
    const validated = walletHoldSchema.parse(body);
    const result = await this.walletService.hold(userId, validated, userId);
    return { data: result };
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  async release(
    @CurrentUser('sub') userId: string,
    @Body() body: WalletReleaseDto,
  ) {
    const validated = walletReleaseSchema.parse(body);
    const result = await this.walletService.release(userId, validated, userId);
    return { data: result };
  }
}
