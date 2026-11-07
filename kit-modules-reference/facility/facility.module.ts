import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource, ResourceSchema } from './schemas/resource.schema.js';
import { OperatingHours, OperatingHoursSchema } from './schemas/operating-hours.schema.js';
import { PriceRule, PriceRuleSchema } from './schemas/price-rule.schema.js';
import { Closure, ClosureSchema } from './schemas/closure.schema.js';
import { Setting, SettingSchema } from './schemas/setting.schema.js';

import { ResourceService } from './services/resource.service.js';
import { OperatingHoursService } from './services/operating-hours.service.js';
import { PricingService } from './services/pricing.service.js';
import { ClosureService } from './services/closure.service.js';
import { SettingsService } from './services/settings.service.js';
import { FacilitySeedService } from './services/facility-seed.service.js';

import { FacilitiesController } from './controllers/facilities.controller.js';
import { AdminFacilitiesController } from './controllers/admin-facilities.controller.js';
import { SettingsController } from './controllers/settings.controller.js';
import { AdminSettingsController } from './controllers/admin-settings.controller.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
      { name: OperatingHours.name, schema: OperatingHoursSchema },
      { name: PriceRule.name, schema: PriceRuleSchema },
      { name: Closure.name, schema: ClosureSchema },
      { name: Setting.name, schema: SettingSchema },
    ]),
  ],
  controllers: [
    FacilitiesController,
    AdminFacilitiesController,
    SettingsController,
    AdminSettingsController,
  ],
  providers: [
    ResourceService,
    OperatingHoursService,
    PricingService,
    ClosureService,
    SettingsService,
    FacilitySeedService,
  ],
  exports: [
    ResourceService,
    OperatingHoursService,
    PricingService,
    ClosureService,
    SettingsService,
    MongooseModule,
  ],
})
export class FacilityModule {}
