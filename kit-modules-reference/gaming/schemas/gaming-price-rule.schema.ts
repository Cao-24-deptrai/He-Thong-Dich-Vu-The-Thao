import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GamingMachineZone } from '@sports/shared';
import { PriceBand } from '@sports/contracts';

export type GamingPriceRuleDocument = GamingPriceRule & Document;

@Schema({
  timestamps: true,
  collection: 'gaming_price_rules',
})
export class GamingPriceRule {
  @Prop({
    type: String,
    enum: Object.values(GamingMachineZone),
    required: true,
    index: true,
  })
  zone: GamingMachineZone;

  @Prop({
    type: String,
    enum: Object.values(PriceBand),
    default: PriceBand.OFFPEAK,
    index: true,
  })
  band: PriceBand;

  @Prop({ type: String, required: true })
  startTime: string; // "HH:mm"

  @Prop({ type: String, required: true })
  endTime: string; // "HH:mm"

  @Prop({ type: Number, required: true })
  pricePerHour: number; // Integer VND

  @Prop({ type: Number, default: 15 })
  minMinutes: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const GamingPriceRuleSchema = SchemaFactory.createForClass(GamingPriceRule);

GamingPriceRuleSchema.index({ zone: 1, band: 1, isActive: 1 });
