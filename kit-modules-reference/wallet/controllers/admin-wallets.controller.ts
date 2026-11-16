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
import { WalletService } from '../services/wallet.service.js';
import {
  adjustWalletSchema,
  AdjustWalletDto,
  WalletTxnType,
} from '@sports/contracts';

@Controller('admin/wallets')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminWalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userId')
  async getWallet(@Param('userId') userId: string) {
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

  @Get(':userId/transactions')
  async getTransactions(
    @Param('userId') userId: string,
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

  @Post(':userId/adjust')
  @RequireRoles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adjust(
    @Param('userId') userId: string,
    @CurrentUser('sub') actorId: string,
    @Body() body: AdjustWalletDto,
  ) {
    const validated = adjustWalletSchema.parse(body);
    const result = await this.walletService.adjust(userId, validated, actorId);
    return { data: result };
  }

  @Get(':userId/reconcile')
  async reconcile(@Param('userId') userId: string) {
    const result = await this.walletService.reconcile(userId);
    return { data: result };
  }
}
