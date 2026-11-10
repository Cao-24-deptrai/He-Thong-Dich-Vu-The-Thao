import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema.js';
import { StockTransaction, StockTransactionSchema } from './schemas/stock-transaction.schema.js';
import { CashierShift, CashierShiftSchema } from './schemas/cashier-shift.schema.js';
import { CanteenOrder, CanteenOrderSchema } from './schemas/canteen-order.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { InventoryService } from './services/inventory.service.js';
import { CashierShiftService } from './services/cashier-shift.service.js';
import { CanteenOrderService } from './services/canteen-order.service.js';
import { CanteenController } from './controllers/canteen.controller.js';
import { AdminCanteenController } from './controllers/admin-canteen.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: StockTransaction.name, schema: StockTransactionSchema },
      { name: CashierShift.name, schema: CashierShiftSchema },
      { name: CanteenOrder.name, schema: CanteenOrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CanteenController, AdminCanteenController],
  providers: [InventoryService, CashierShiftService, CanteenOrderService],
  exports: [InventoryService, CashierShiftService, CanteenOrderService],
})
export class CanteenModule {}
