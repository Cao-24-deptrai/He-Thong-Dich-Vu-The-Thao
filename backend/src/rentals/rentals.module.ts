import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { RentalItem, RentalItemSchema } from './schemas/rental-item.schema';
import { RentalTicket, RentalTicketSchema } from './schemas/rental-ticket.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RentalItem.name, schema: RentalItemSchema },
      { name: RentalTicket.name, schema: RentalTicketSchema },
    ]),
  ],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
