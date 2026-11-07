import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SportType } from '@sports/contracts';
import { RentalPricingType } from '@sports/shared';

export type EquipmentDocument = HydratedDocument<Equipment>;

@Schema({ timestamps: true, collection: 'equipments' })
export class Equipment {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: SportType, index: true })
  sportType?: SportType;

  @Prop({ required: true, enum: RentalPricingType, default: RentalPricingType.PER_TURN })
  pricingType: RentalPricingType;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 0, min: 0 })
  depositAmount: number;

  @Prop({ default: 0, min: 0 })
  damageFee: number;

  @Prop({ default: 0, min: 0 })
  lostFee: number;

  @Prop({ required: true, min: 1 })
  totalQuantity: number;

  @Prop({ default: 0, min: 0 })
  rentedQuantity: number;

  @Prop({ default: 0, min: 0 })
  damagedQuantity: number;

  @Prop({ required: true, min: 0, index: true })
  availableQuantity: number;

  @Prop()
  imageUrl?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

EquipmentSchema.index({ sportType: 1, isActive: 1 });
EquipmentSchema.index({ name: 'text', code: 'text' });
