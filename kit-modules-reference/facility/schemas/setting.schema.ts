import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SettingDocument = HydratedDocument<Setting>;

@Schema({ collection: 'settings', timestamps: true })
export class Setting {
  @Prop({ required: true, unique: true, trim: true, index: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  value: unknown;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, type: Number, default: 1 })
  version: number;

  @Prop()
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
