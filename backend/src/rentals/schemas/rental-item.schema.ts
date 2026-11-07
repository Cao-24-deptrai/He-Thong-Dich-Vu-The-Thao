import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { RentalItemType, SportCategory } from '../../common/enums';

export type RentalItemDocument = RentalItem & Document;

@Schema({ timestamps: true })
export class RentalItem {
  @ApiProperty({ description: 'Item name', example: 'Bóng Molten Vantaggio 5000' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ enum: RentalItemType, default: RentalItemType.BALL })
  @Prop({
    type: String,
    enum: Object.values(RentalItemType),
    default: RentalItemType.BALL,
  })
  type: RentalItemType;

  @ApiProperty({ enum: SportCategory, default: SportCategory.SOCCER })
  @Prop({
    type: String,
    enum: Object.values(SportCategory),
    default: SportCategory.SOCCER,
  })
  sportCategory: SportCategory;

  @ApiProperty({ description: 'Rental price per slot/match in VND', example: 50000 })
  @Prop({ type: Number, required: true })
  rentalPricePerSlot: number;

  @ApiProperty({ description: 'Security deposit amount per unit in VND', example: 200000 })
  @Prop({ type: Number, required: true, default: 0 })
  depositPrice: number;

  @ApiProperty({ description: 'Total stock quantity', example: 30 })
  @Prop({ type: Number, required: true, default: 0 })
  stockQty: number;

  @ApiProperty({ description: 'Available quantity in stock ready to rent', example: 28 })
  @Prop({ type: Number, required: true, default: 0 })
  availableQty: number;

  @ApiProperty({ description: 'Product image URL', required: false })
  @Prop({ type: String })
  imageUrl?: string;

  @ApiProperty({ description: 'Active status', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const RentalItemSchema = SchemaFactory.createForClass(RentalItem);

RentalItemSchema.index({ sportCategory: 1, isActive: 1 });
RentalItemSchema.index({ type: 1 });
