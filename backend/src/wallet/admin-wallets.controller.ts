import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AdjustWalletDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Quản Trị Ví & Sổ Cái (E08 - Admin Ledger)')
@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
@ApiBearerAuth()
export class AdminWalletsController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ví hội viên và số dư' })
  async getWallets(@Query('status') status?: string) {
    return this.walletService.getAllWallets({ status });
  }

  @Get('ledgers')
  @ApiOperation({ summary: 'Truy vấn sổ cái đối soát bất biến toàn hệ thống (Ledger Audit)' })
  async getLedgers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.walletService.getAllLedgers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('adjust')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Điều chỉnh số dư ví kiểm toán (Chỉ Admin/Owner)' })
  async adjustWallet(@CurrentUser() admin: any, @Body() dto: AdjustWalletDto) {
    const adminId = admin.userId || admin._id || admin.id || admin.sub;
    return this.walletService.adjustWallet(dto, adminId);
  }

  @Patch(':id/toggle-lock')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Khóa hoặc mở khóa ví khách hàng' })
  async toggleLock(@Param('id') walletId: string) {
    return this.walletService.toggleLock(walletId);
  }
}
