import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProductCategory } from '@sports/shared';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  sku: string;

  @Prop({ trim: true, sparse: true, unique: true })
  barcode?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ProductCategory, index: true })
  category: ProductCategory;

  @Prop({ required: true, trim: true, default: 'cái' })
  unit: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  costPrice: number;

  @Prop({ required: true, min: 0, max: 100, default: 8 })
  vatRate: number;

  @Prop({ default: true })
  trackInventory: boolean;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: 5, min: 0 })
  minStockThreshold: number;

  @Prop()
  imageUrl?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ name: 'text', sku: 'text' });
