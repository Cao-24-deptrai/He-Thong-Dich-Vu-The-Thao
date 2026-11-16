import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { StockTxnType } from '@sports/shared';

export type StockTransactionDocument = HydratedDocument<StockTransaction>;

@Schema({ timestamps: true, collection: 'stock_transactions' })
export class StockTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, enum: StockTxnType, index: true })
  type: StockTxnType;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  beforeStock: number;

  @Prop({ required: true })
  afterStock: number;

  @Prop({ min: 0 })
  unitPrice?: number;

  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  operatorId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const StockTransactionSchema = SchemaFactory.createForClass(StockTransaction);

StockTransactionSchema.index({ productId: 1, createdAt: -1 });
StockTransactionSchema.index({ type: 1, createdAt: -1 });
