import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Facility, FacilitySchema } from './schemas/facility.schema';
import { Venue, VenueSchema } from '../venues/schemas/venue.schema';
import { PriceRule, PriceRuleSchema } from './schemas/price-rule.schema';
import { Closure, ClosureSchema } from './schemas/closure.schema';
import { FacilitiesService } from './facilities.service';
import { PricingService } from './pricing.service';
import { FacilitiesController } from './facilities.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Facility.name, schema: FacilitySchema },
      { name: Venue.name, schema: VenueSchema },
      { name: PriceRule.name, schema: PriceRuleSchema },
      { name: Closure.name, schema: ClosureSchema },
    ]),
  ],
  controllers: [FacilitiesController],
  providers: [FacilitiesService, PricingService],
  exports: [FacilitiesService, PricingService, MongooseModule],
})
export class FacilitiesModule {}
