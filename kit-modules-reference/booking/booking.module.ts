import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './schemas/booking.schema.js';
import { BookingSlot, BookingSlotSchema } from './schemas/booking-slot.schema.js';

import { RedisLockService } from './services/redis-lock.service.js';
import { AvailabilityService } from './services/availability.service.js';
import { BookingService } from './services/booking.service.js';
import { BookingCleanupService } from './services/booking-cleanup.service.js';

import { BookingsController } from './controllers/bookings.controller.js';
import { AdminBookingsController } from './controllers/admin-bookings.controller.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: BookingSlot.name, schema: BookingSlotSchema },
    ]),
  ],
  controllers: [BookingsController, AdminBookingsController],
  providers: [
    RedisLockService,
    AvailabilityService,
    BookingService,
    BookingCleanupService,
  ],
  exports: [
    BookingService,
    AvailabilityService,
    RedisLockService,
    MongooseModule,
  ],
})
export class BookingModule {}
