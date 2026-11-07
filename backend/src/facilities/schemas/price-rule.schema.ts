import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PriceRuleDocument = PriceRule & Document;

export enum PriceBand {
  OFFPEAK = 'OFFPEAK',
  PEAK = 'PEAK',
  NIGHT = 'NIGHT',
}

@Schema({ timestamps: true })
export class PriceRule {
  @ApiProperty({ description: 'Áp dụng cho môn hoặc mã sân (FOOTBALL_5, BADMINTON, S11,...)', example: 'FOOTBALL_5' })
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  appliesTo: string;

  @ApiProperty({ enum: PriceBand, example: PriceBand.PEAK })
  @Prop({ required: true, enum: Object.values(PriceBand), default: PriceBand.OFFPEAK, index: true })
  band: PriceBand;

  @ApiProperty({ description: 'Các ngày trong tuần (0: CN, 1: T2, ..., 6: T7). Mảng rỗng áp dụng mọi ngày', example: [1, 2, 3, 4, 5] })
  @Prop({ type: [Number], default: [] })
  dayOfWeek: number[];

  @ApiProperty({ description: 'Giờ bắt đầu khung (HH:mm)', example: '17:30' })
  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc khung (HH:mm)', example: '21:00' })
  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  endTime: string;

  @ApiProperty({ description: 'Đơn giá chưa VAT mỗi giờ (VND Int64)', example: 300000 })
  @Prop({ required: true, type: Number })
  pricePerHour: number;

  @ApiProperty({ description: 'Mức phụ thu mỗi giờ (VND Int64)', example: 50000, default: 0 })
  @Prop({ type: Number, default: 0 })
  surchargePerHour: number;

  @ApiProperty({ description: 'Ngày bắt đầu có hiệu lực (UTC)' })
  @Prop({ required: true, type: Date, default: Date.now, index: true })
  effectiveFrom: Date;

  @ApiProperty({ description: 'Ngày hết hạn hiệu lực (UTC)', required: false })
  @Prop({ type: Date })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Trạng thái hoạt động', default: true })
  @Prop({ required: true, default: true, index: true })
  isActive: boolean;
}

export const PriceRuleSchema = SchemaFactory.createForClass(PriceRule);
PriceRuleSchema.index({ appliesTo: 1, band: 1, effectiveFrom: -1 });
PriceRuleSchema.index({ isActive: 1, effectiveFrom: -1 });
