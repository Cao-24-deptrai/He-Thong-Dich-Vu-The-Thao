import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyStats, DailyStatsSchema } from './schemas/daily-stats.schema.js';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema.js';
import { Booking, BookingSchema } from '../booking/schemas/booking.schema.js';
import { Resource, ResourceSchema } from '../facility/schemas/resource.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { GymAccessEvent, GymAccessEventSchema } from '../gym/schemas/gym-access-event.schema.js';
import { GymMembership, GymMembershipSchema } from '../gym/schemas/gym-membership.schema.js';
import { GamingSession, GamingSessionSchema } from '../gaming/schemas/gaming-session.schema.js';
import { GamingMachine, GamingMachineSchema } from '../gaming/schemas/gaming-machine.schema.js';
import { CashierShift, CashierShiftSchema } from '../canteen/schemas/cashier-shift.schema.js';
import { Product, ProductSchema } from '../canteen/schemas/product.schema.js';
import { RentalTicket, RentalTicketSchema } from '../rental/schemas/rental-ticket.schema.js';
import { CanteenOrder, CanteenOrderSchema } from '../canteen/schemas/canteen-order.schema.js';
import { Invoice, InvoiceSchema } from '../invoice/schemas/invoice.schema.js';
import { DailyStatsService } from './services/daily-stats.service.js';
import { AnalyticsReportService } from './services/analytics-report.service.js';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyStats.name, schema: DailyStatsSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: User.name, schema: UserSchema },
      { name: GymAccessEvent.name, schema: GymAccessEventSchema },
      { name: GymMembership.name, schema: GymMembershipSchema },
      { name: GamingSession.name, schema: GamingSessionSchema },
      { name: GamingMachine.name, schema: GamingMachineSchema },
      { name: CashierShift.name, schema: CashierShiftSchema },
      { name: Product.name, schema: ProductSchema },
      { name: RentalTicket.name, schema: RentalTicketSchema },
      { name: CanteenOrder.name, schema: CanteenOrderSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    AuthModule,
  ],
  controllers: [AdminAnalyticsController],
  providers: [DailyStatsService, AnalyticsReportService],
  exports: [DailyStatsService, AnalyticsReportService],
})
export class AnalyticsModule {}
