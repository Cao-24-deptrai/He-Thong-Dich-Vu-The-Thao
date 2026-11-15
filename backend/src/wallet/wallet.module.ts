import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletLedger, WalletLedgerSchema } from './schemas/wallet-ledger.schema';
import { WalletService } from './wallet.service';
import { WalletsController } from './wallets.controller';
import { AdminWalletsController } from './admin-wallets.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletLedger.name, schema: WalletLedgerSchema },
    ]),
  ],
  controllers: [WalletsController, AdminWalletsController],
  providers: [WalletService],
  exports: [WalletService, MongooseModule],
})
export class WalletModule {}
