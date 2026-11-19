import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { BookingSlot, BookingSlotSchema } from '../bookings/schemas/booking-slot.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: BookingSlot.name, schema: BookingSlotSchema },
    ]),
    EventsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'super_secret_jwt_sports_booking_key_2026',
        signOptions: {
          expiresIn: '60s',
        },
      }),
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, MongooseModule],
})
export class PaymentsModule {}
