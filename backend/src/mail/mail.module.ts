import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Venue, VenueSchema } from '../venues/schemas/venue.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Venue.name, schema: VenueSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
