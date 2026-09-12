import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Venue, VenueSchema } from './schemas/venue.schema';
import { VenuesService } from './venues.service';
import { VenuesController } from './venues.controller';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Venue.name, schema: VenueSchema }]),
    forwardRef(() => BookingsModule),
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService, MongooseModule],
})
export class VenuesModule {}
