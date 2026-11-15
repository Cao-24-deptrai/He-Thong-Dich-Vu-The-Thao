import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Venue, VenueSchema } from '../venues/schemas/venue.schema';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsCronService } from './bookings-cron.service';
import { RedisModule } from '../redis/redis.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Venue.name, schema: VenueSchema },
    ]),
    RedisModule,
    EventsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsCronService],
  exports: [BookingsService, MongooseModule],
})
export class BookingsModule {}
