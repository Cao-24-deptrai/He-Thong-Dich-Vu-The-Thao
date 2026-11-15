import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
export type CanteenOrderDocument = CanteenOrder & Document;
@Schema({ timestamps: true })
export class CanteenOrder {
  @Prop({ required: true }) cashierId: string;
  @Prop({ required: true }) shiftId: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], required: true }) items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  @Prop({ required: true, min: 0 }) total: number;
  @Prop({ enum: ['CASH', 'TRANSFER'], required: true }) paymentMethod: string;
  @Prop({ default: 'PAID' }) status: string;
}
export const CanteenOrderSchema = SchemaFactory.createForClass(CanteenOrder);
