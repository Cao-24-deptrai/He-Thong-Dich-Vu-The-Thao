import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { VenuesModule } from './venues/venues.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { CheckinModule } from './checkin/checkin.module';
import { AdminModule } from './admin/admin.module';
import { MembershipPassModule } from './membership-pass/membership-pass.module';
import { MatchRequestsModule } from './match-requests/match-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
        autoIndex: true, // Đảm bảo tự động tạo Unique Partial Index
      }),
    }),
    RedisModule,
    EventsModule,
    AuthModule,
    UsersModule,
    FacilitiesModule,
    VenuesModule,
    BookingsModule,
    PaymentsModule,
    CheckinModule,
    AdminModule,
    MembershipPassModule,
    MatchRequestsModule,
  ],
})
export class AppModule {}
