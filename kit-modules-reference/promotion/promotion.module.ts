import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema.js';
import { VoucherUsage, VoucherUsageSchema } from './schemas/voucher-usage.schema.js';
import { ComboPackage, ComboPackageSchema } from './schemas/combo-package.schema.js';
import { UserPackage, UserPackageSchema } from './schemas/user-package.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { VoucherService } from './services/voucher.service.js';
import { ComboPackageService } from './services/combo-package.service.js';
import { PromotionController } from './controllers/promotion.controller.js';
import { AdminPromotionController } from './controllers/admin-promotion.controller.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: VoucherUsage.name, schema: VoucherUsageSchema },
      { name: ComboPackage.name, schema: ComboPackageSchema },
      { name: UserPackage.name, schema: UserPackageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PromotionController, AdminPromotionController],
  providers: [VoucherService, ComboPackageService],
  exports: [VoucherService, ComboPackageService],
})
export class PromotionModule {}
