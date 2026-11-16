import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CanteenProduct, CanteenProductSchema } from './schemas/canteen-product.schema';
import { CanteenShift, CanteenShiftSchema } from './schemas/canteen-shift.schema';
import { CanteenOrder, CanteenOrderSchema } from './schemas/canteen-order.schema';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';
@Module({ imports: [MongooseModule.forFeature([
  { name: CanteenProduct.name, schema: CanteenProductSchema },
  { name: CanteenShift.name, schema: CanteenShiftSchema },
  { name: CanteenOrder.name, schema: CanteenOrderSchema },
])], controllers: [CanteenController], providers: [CanteenService], exports: [MongooseModule] })
export class CanteenModule {}
