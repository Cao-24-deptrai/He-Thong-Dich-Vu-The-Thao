import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { GamingMachineZone } from '../../common/enums';

export type GamingPriceRuleDocument = GamingPriceRule & Document;

@Schema({ timestamps: true, collection: 'gaming_price_rules' })
export class GamingPriceRule {
  @ApiProperty({ enum: GamingMachineZone, example: GamingMachineZone.STANDARD })
  @Prop({
    type: String,
    enum: Object.values(GamingMachineZone),
    required: true,
    index: true,
  })
  zone: GamingMachineZone;

  @ApiProperty({ description: 'Off-peak hourly rate (VND)', example: 10000 })
  @Prop({ type: Number, required: true, default: 10000 })
  offpeakPricePerHour: number;

  @ApiProperty({ description: 'Peak hourly rate (VND)', example: 15000 })
  @Prop({ type: Number, required: true, default: 15000 })
  peakPricePerHour: number;

  @ApiProperty({ description: 'Peak start time (HH:mm)', example: '17:00' })
  @Prop({ type: String, default: '17:00' })
  peakStartTime: string;

  @ApiProperty({ description: 'Peak end time (HH:mm)', example: '23:00' })
  @Prop({ type: String, default: '23:00' })
  peakEndTime: string;

  @ApiProperty({ description: 'Minimum minutes to round up', default: 1 })
  @Prop({ type: Number, default: 1 })
  minMinutes: number;
}

export const GamingPriceRuleSchema = SchemaFactory.createForClass(GamingPriceRule);
