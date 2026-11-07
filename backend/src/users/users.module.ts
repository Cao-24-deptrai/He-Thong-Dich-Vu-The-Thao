import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { UsersService } from './users.service';
import { CustomerTierService } from './customer-tier.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, CustomerTierService],
  exports: [UsersService, CustomerTierService, MongooseModule],
})
export class UsersModule {}
