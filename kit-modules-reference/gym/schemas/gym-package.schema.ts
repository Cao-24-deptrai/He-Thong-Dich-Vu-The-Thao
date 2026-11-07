import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GymPackageDocument = HydratedDocument<GymPackage>;

@Schema({ timestamps: true, collection: 'gym_packages' })
export class GymPackage {
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 1 })
  durationMonths: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ default: 5, min: 0, max: 100 })
  earlyRenewDiscountPercent: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const GymPackageSchema = SchemaFactory.createForClass(GymPackage);
