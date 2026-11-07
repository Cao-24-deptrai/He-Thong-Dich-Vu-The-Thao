import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GymController } from './gym.controller';
import { GymService } from './gym.service';
import { GymMembershipService } from './gym-membership.service';
import { GymAccessService } from './gym-access.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  GymQrCredential,
  GymQrCredentialSchema,
} from './schemas/gym-qr-credential.schema';
import {
  GymSubscription,
  GymSubscriptionSchema,
} from './schemas/gym-subscription.schema';
import {
  GymAccessLog,
  GymAccessLogSchema,
} from './schemas/gym-access-log.schema';
import { EventsModule } from '../events/events.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GymQrCredential.name, schema: GymQrCredentialSchema },
      { name: GymSubscription.name, schema: GymSubscriptionSchema },
      { name: GymAccessLog.name, schema: GymAccessLogSchema },
    ]),
    EventsModule,
    RedisModule,
  ],
  controllers: [GymController],
  providers: [GymService, GymMembershipService, GymAccessService],
  exports: [GymService, GymMembershipService, GymAccessService],
})
export class GymModule {}
