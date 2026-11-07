import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GymPackage, GymPackageSchema } from './schemas/gym-package.schema.js';
import {
  GymMembership,
  GymMembershipSchema,
} from './schemas/gym-membership.schema.js';
import {
  GymAccessEvent,
  GymAccessEventSchema,
} from './schemas/gym-access-event.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { GymService } from './services/gym.service.js';
import { GymController } from './controllers/gym.controller.js';
import { AdminGymController } from './controllers/admin-gym.controller.js';
import { RedisModule } from '../../redis/redis.module.js';
import { FacilityModule } from '../facility/facility.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GymPackage.name, schema: GymPackageSchema },
      { name: GymMembership.name, schema: GymMembershipSchema },
      { name: GymAccessEvent.name, schema: GymAccessEventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RedisModule,
    FacilityModule,
    OutboxModule,
    AuthModule,
  ],
  controllers: [GymController, AdminGymController],
  providers: [GymService],
  exports: [GymService, MongooseModule],
})
export class GymModule {}
