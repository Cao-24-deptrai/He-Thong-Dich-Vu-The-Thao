import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type CanteenProductDocument = CanteenProduct & Document;
@Schema({ timestamps: true })
export class CanteenProduct {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, min: 0 }) price: number;
  @Prop({ required: true, min: 0, default: 0 }) stock: number;
  @Prop({ default: 'OTHER' }) category: string;
  @Prop({ default: true }) active: boolean;
}
export const CanteenProductSchema = SchemaFactory.createForClass(CanteenProduct);
