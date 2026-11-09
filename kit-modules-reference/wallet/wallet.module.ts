import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema.js';
import { WalletLedger, WalletLedgerSchema } from './schemas/wallet-ledger.schema.js';
import { WalletService } from './services/wallet.service.js';
import { WalletsController } from './controllers/wallets.controller.js';
import { AdminWalletsController } from './controllers/admin-wallets.controller.js';

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
