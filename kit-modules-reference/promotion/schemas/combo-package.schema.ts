import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ComboItemType, PromotionChannel } from '@sports/shared';

export type ComboPackageDocument = ComboPackage & Document;

@Schema({ _id: false })
export class ComboPackageItemDef {
  @Prop({
    type: String,
    enum: Object.values(ComboItemType),
    required: true,
  })
  itemType: ComboItemType;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: String })
  courtType?: string;
}

@Schema({
  timestamps: true,
  collection: 'combo_packages',
})
export class ComboPackage {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true })
  price: number; // Integer VND

  @Prop({ type: [ComboPackageItemDef], required: true, default: [] })
  items: ComboPackageItemDef[];

  @Prop({ type: Number, default: 30, min: 1 })
  validDays: number;

  @Prop({
    type: String,
    enum: Object.values(PromotionChannel),
    default: PromotionChannel.ALL,
    index: true,
  })
  channel: PromotionChannel;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const ComboPackageSchema = SchemaFactory.createForClass(ComboPackage);

ComboPackageSchema.index({ isActive: 1, channel: 1 });
