import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamingMachine, GamingMachineSchema } from './schemas/gaming-machine.schema';
import { GamingPriceRule, GamingPriceRuleSchema } from './schemas/gaming-price-rule.schema';
import { GamingSession, GamingSessionSchema } from './schemas/gaming-session.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { GamingMachineService } from './gaming-machine.service';
import { GamingPricingService } from './gaming-pricing.service';
import { GamingSessionService } from './gaming-session.service';
import { GamingGateway } from './gaming.gateway';
import { GamingController } from './gaming.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GamingMachine.name, schema: GamingMachineSchema },
      { name: GamingPriceRule.name, schema: GamingPriceRuleSchema },
      { name: GamingSession.name, schema: GamingSessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GamingController],
  providers: [
    GamingMachineService,
    GamingPricingService,
    GamingSessionService,
    GamingGateway,
  ],
  exports: [
    GamingMachineService,
    GamingPricingService,
    GamingSessionService,
  ],
})
export class GamingModule {}
