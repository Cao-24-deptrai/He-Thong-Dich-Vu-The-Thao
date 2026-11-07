import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Venue, VenueSchema } from '../venues/schemas/venue.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Venue.name, schema: VenueSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CashierController],
  providers: [CashierService],
  exports: [CashierService],
})
export class CashierModule {}
