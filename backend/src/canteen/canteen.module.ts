import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [CanteenController],
  providers: [CanteenService],
  exports: [CanteenService],
})
export class CanteenModule {}
