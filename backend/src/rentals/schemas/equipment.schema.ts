import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SportType, RentalPricingType } from '../../common/enums';

export type EquipmentDocument = HydratedDocument<Equipment>;

@Schema({ timestamps: true, collection: 'equipments' })
export class Equipment {
  @ApiProperty({ description: 'Mã thiết bị duy nhất', example: 'EQP-001' })
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @ApiProperty({ description: 'Tên thiết bị', example: 'Vợt Tennis Wilson Pro Staff' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ enum: SportType, default: SportType.GENERAL })
  @Prop({ type: String, enum: Object.values(SportType), default: SportType.GENERAL, index: true })
  sportType: SportType;

  @ApiProperty({ enum: RentalPricingType, default: RentalPricingType.PER_TURN })
  @Prop({ type: String, enum: Object.values(RentalPricingType), default: RentalPricingType.PER_TURN })
  pricingType: RentalPricingType;

  @ApiProperty({ description: 'Giá thuê (VND nguyên dương)', example: 50000 })
  @Prop({ required: true, min: 0 })
  price: number;

  @ApiProperty({ description: 'Tiền đặt cọc yêu cầu', example: 200000 })
  @Prop({ default: 0, min: 0 })
  depositAmount: number;

  @ApiProperty({ description: 'Phí bồi thường nếu làm hỏng', example: 100000 })
  @Prop({ default: 0, min: 0 })
  damageFee: number;

  @ApiProperty({ description: 'Phí bồi thường nếu làm mất', example: 500000 })
  @Prop({ default: 0, min: 0 })
  lostFee: number;

  @ApiProperty({ description: 'Tổng số lượng tài sản', example: 20 })
  @Prop({ required: true, min: 1 })
  totalQuantity: number;

  @ApiProperty({ description: 'Số lượng đang cho thuê', example: 5 })
  @Prop({ default: 0, min: 0 })
  rentedQuantity: number;

  @ApiProperty({ description: 'Số lượng hỏng hoặc mất cách ly', example: 1 })
  @Prop({ default: 0, min: 0 })
  damagedQuantity: number;

  @ApiProperty({ description: 'Số lượng khả dụng = total - rented - damaged', example: 14 })
  @Prop({ required: true, min: 0, index: true })
  availableQuantity: number;

  @ApiProperty({ description: 'Ảnh đại diện thiết bị', required: false })
  @Prop({ required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Trạng thái hoạt động', default: true })
  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

EquipmentSchema.index({ sportType: 1, isActive: 1 });
EquipmentSchema.index({ name: 'text', code: 'text' });
