import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema.js';
import { RentalTicket, RentalTicketSchema } from './schemas/rental-ticket.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { EquipmentService } from './services/equipment.service.js';
import { RentalService } from './services/rental.service.js';
import { RentalController } from './controllers/rental.controller.js';
import { AdminRentalController } from './controllers/admin-rental.controller.js';
import { CanteenModule } from '../canteen/canteen.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Equipment.name, schema: EquipmentSchema },
      { name: RentalTicket.name, schema: RentalTicketSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CanteenModule,
  ],
  controllers: [RentalController, AdminRentalController],
  providers: [EquipmentService, RentalService],
  exports: [EquipmentService, RentalService],
})
export class RentalModule {}
