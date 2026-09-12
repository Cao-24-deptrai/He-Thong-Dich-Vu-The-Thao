import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VenueType } from '../../common/enums';

export type VenueDocument = Venue & Document;

@Schema()
export class Venue {
  @ApiProperty({ description: 'Parent Facility ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Facility', required: true })
  facilityId: Types.ObjectId;

  @ApiProperty({ description: 'Venue or court/machine name', example: 'Sân bóng số 1 (5 người)' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ enum: VenueType, example: VenueType.FOOTBALL_5 })
  @Prop({
    type: String,
    enum: Object.values(VenueType),
    required: true,
  })
  type: VenueType;

  @ApiProperty({ description: 'Base price per hour in VND', example: 250000 })
  @Prop({ type: Number, required: true })
  basePricePerHour: number;

  @ApiProperty({
    description: 'Dynamic pricing rules (e.g. peak hours, weekends)',
    example: { peakHourMultiplier: 1.2, weekendMultiplier: 1.3 },
    required: false,
  })
  @Prop({ type: MongooseSchema.Types.Mixed })
  pricingRules?: Record<string, any>;
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
VenueSchema.index({ facilityId: 1 });
