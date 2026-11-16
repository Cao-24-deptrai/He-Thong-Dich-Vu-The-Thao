import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamingMachine, GamingMachineSchema } from './schemas/gaming-machine.schema.js';
import { GamingPriceRule, GamingPriceRuleSchema } from './schemas/gaming-price-rule.schema.js';
import { GamingSession, GamingSessionSchema } from './schemas/gaming-session.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { GamingMachineService } from './services/gaming-machine.service.js';
import { GamingPricingService } from './services/gaming-pricing.service.js';
import { GamingSessionService } from './services/gaming-session.service.js';
import { GamingController } from './controllers/gaming.controller.js';
import { AdminGamingController } from './controllers/admin-gaming.controller.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GamingMachine.name, schema: GamingMachineSchema },
      { name: GamingPriceRule.name, schema: GamingPriceRuleSchema },
      { name: GamingSession.name, schema: GamingSessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GamingController, AdminGamingController],
  providers: [GamingMachineService, GamingPricingService, GamingSessionService],
  exports: [GamingMachineService, GamingPricingService, GamingSessionService],
})
export class GamingModule {}
