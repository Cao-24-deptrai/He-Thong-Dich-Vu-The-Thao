import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
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

  @ApiProperty({ description: 'Trạng thái hoạt động (Soft delete)', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Khung giờ hoạt động của sân',
    example: { openTime: '06:00', closeTime: '22:00' },
    required: false,
  })
  @Prop(
    raw({
      openTime: { type: String, default: '06:00' },
      closeTime: { type: String, default: '22:00' },
    }),
  )
  operatingHours?: {
    openTime: string;
    closeTime: string;
  };

  @ApiProperty({ description: 'Độ dài mỗi slot tính theo phút', example: 60, default: 60, required: false })
  @Prop({ type: Number, default: 60 })
  slotDurationMinutes?: number;

  @ApiProperty({
    description: 'Chính sách hủy và hoàn tiền theo mốc thời gian',
    example: { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 },
    required: false,
  })
  @Prop(
    raw({
      hoursBeforeForFullRefund: { type: Number, default: 24 },
      hoursBeforeForNoRefund: { type: Number, default: 2 },
    }),
  )
  cancellationPolicy?: {
    hoursBeforeForFullRefund: number;
    hoursBeforeForNoRefund: number;
  };
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
VenueSchema.index({ facilityId: 1 });
