import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VenueType, SportCategory } from '../../common/enums';

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

  @ApiProperty({ description: 'Court code identifier', example: 'F1' })
  @Prop({ type: String, required: false })
  courtCode?: string;

  @ApiProperty({ description: 'Liệu đây có phải là sân ghép (ví dụ Sân 7, Sân 11)', default: false })
  @Prop({ type: Boolean, default: false })
  isComposite: boolean;

  @ApiProperty({
    description: 'Danh sách ID hoặc mã các sân cơ sở cấu thành sân ghép này (Base units)',
    example: ['F1', 'F2'],
    type: [String],
    default: [],
  })
  @Prop({ type: [String], default: [] })
  baseUnitCodes: string[];

  @ApiProperty({ enum: SportCategory, default: SportCategory.SOCCER })
  @Prop({
    type: String,
    enum: Object.values(SportCategory),
    default: SportCategory.SOCCER,
  })
  sportCategory: SportCategory;

  @ApiProperty({
    description: '3D coordinate position in interactive spatial map',
    example: { x: -35, y: 0.5, z: -20 },
    required: false,
  })
  @Prop(
    raw({
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 },
    }),
  )
  position3D?: {
    x: number;
    y: number;
    z: number;
  };

  @ApiProperty({ description: 'Current live occupancy headcount', default: 0 })
  @Prop({ type: Number, default: 0 })
  currentOccupancy: number;

  @ApiProperty({ description: 'Maximum safe capacity headcount', default: 14 })
  @Prop({ type: Number, default: 14 })
  maxCapacity: number;

  @ApiProperty({ description: 'Venue operational status', example: 'AVAILABLE', default: 'AVAILABLE' })
  @Prop({ type: String, default: 'AVAILABLE' })
  status: string;

  @ApiProperty({ description: 'Evening lighting fee per hour in VND', default: 50000 })
  @Prop({ type: Number, default: 50000 })
  lightingFeePerHour?: number;

  @ApiProperty({ description: 'Image URL of court or venue', required: false })
  @Prop({ type: String })
  imageUrl?: string;

  @ApiProperty({ description: 'Description and specifications', required: false })
  @Prop({ type: String })
  description?: string;

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
VenueSchema.index({ sportCategory: 1, isActive: 1 });
VenueSchema.index({ status: 1 });
