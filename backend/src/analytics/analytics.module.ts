import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking,BookingSchema } from '../bookings/schemas/booking.schema';
import { Payment,PaymentSchema } from '../payments/schemas/payment.schema';
import { CanteenOrder,CanteenOrderSchema } from '../canteen/schemas/canteen-order.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
@Module({imports:[MongooseModule.forFeature([
 {name:Booking.name,schema:BookingSchema},{name:Payment.name,schema:PaymentSchema},{name:CanteenOrder.name,schema:CanteenOrderSchema}
])],controllers:[AnalyticsController],providers:[AnalyticsService]})
export class AnalyticsModule{}
