import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type CanteenShiftDocument = CanteenShift & Document;
@Schema({ timestamps: true })
export class CanteenShift {
  @Prop({ required: true, index: true }) cashierId: string;
  @Prop({ enum: ['OPEN', 'CLOSED'], default: 'OPEN' }) status: string;
  @Prop({ required: true, min: 0 }) openingCash: number;
  @Prop({ min: 0 }) closingCash?: number;
  @Prop({ type: Date, default: Date.now }) openedAt: Date;
  @Prop({ type: Date }) closedAt?: Date;
}
export const CanteenShiftSchema = SchemaFactory.createForClass(CanteenShift);
CanteenShiftSchema.index({ cashierId: 1, status: 1 });
