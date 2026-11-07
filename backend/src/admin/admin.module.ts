import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { WalletLedger, WalletLedgerSchema } from '../payments/schemas/wallet-ledger.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Venue, VenueSchema } from '../venues/schemas/venue.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RentalItem, RentalItemSchema } from '../rentals/schemas/rental-item.schema';
import { Voucher, VoucherSchema } from '../vouchers/schemas/voucher.schema';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: WalletLedger.name, schema: WalletLedgerSchema },
      { name: User.name, schema: UserSchema },
      { name: Venue.name, schema: VenueSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Order.name, schema: OrderSchema },
      { name: RentalItem.name, schema: RentalItemSchema },
      { name: Voucher.name, schema: VoucherSchema },
    ]),
    RedisModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService, MongooseModule],
})
export class AdminModule {}
