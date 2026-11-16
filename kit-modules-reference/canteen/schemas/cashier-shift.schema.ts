import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CashierShiftStatus } from '@sports/shared';

export type CashierShiftDocument = HydratedDocument<CashierShift>;

@Schema({ timestamps: true, collection: 'cashier_shifts' })
export class CashierShift {
  @Prop({ required: true, unique: true, trim: true })
  shiftCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  cashierId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  cashierName: string;

  @Prop({ required: true, default: Date.now })
  openedAt: Date;

  @Prop({ required: true, min: 0 })
  openingCash: number;

  @Prop({ required: true, enum: CashierShiftStatus, default: CashierShiftStatus.OPEN, index: true })
  status: CashierShiftStatus;

  @Prop()
  closedAt?: Date;

  @Prop({ min: 0 })
  closingCashExpected?: number;

  @Prop({ min: 0 })
  closingCashActual?: number;

  @Prop()
  difference?: number;

  @Prop({ default: 0, min: 0 })
  totalOrders: number;

  @Prop({ default: 0, min: 0 })
  totalCashSales: number;

  @Prop({ default: 0, min: 0 })
  totalQrSales: number;

  @Prop({ default: 0, min: 0 })
  totalWalletSales: number;

  @Prop({ default: 0, min: 0 })
  totalSales: number;

  @Prop()
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CashierShiftSchema = SchemaFactory.createForClass(CashierShift);

CashierShiftSchema.index({ cashierId: 1, status: 1 });
