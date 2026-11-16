import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PriceBand } from '@sports/contracts';

export type PriceRuleDocument = HydratedDocument<PriceRule>;

@Schema({ collection: 'price_rules', timestamps: true })
export class PriceRule {
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  appliesTo: string;

  @Prop({ required: true, enum: Object.values(PriceBand), index: true })
  band: PriceBand;

  @Prop({ type: [Number], default: [] })
  dayOfWeek: number[]; // 0-6. Empty array means applies to all days

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  startTime: string; // HH:mm

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  endTime: string; // HH:mm

  @Prop({ required: true, type: Number })
  pricePerHour: number; // Integer VND

  @Prop({ required: true, type: Date, index: true })
  effectiveFrom: Date;

  @Prop({ type: Date })
  effectiveTo?: Date;

  @Prop({ required: true, type: Number, default: 1 })
  version: number;

  @Prop({ required: true, default: true, index: true })
  isActive: boolean;

  @Prop()
  createdBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PriceRuleSchema = SchemaFactory.createForClass(PriceRule);
PriceRuleSchema.index({ appliesTo: 1, band: 1, effectiveFrom: -1 });
PriceRuleSchema.index({ isActive: 1, effectiveFrom: -1 });
