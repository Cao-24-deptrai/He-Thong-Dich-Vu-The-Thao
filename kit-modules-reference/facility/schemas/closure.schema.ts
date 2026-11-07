import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClosureDocument = HydratedDocument<Closure>;

@Schema({ collection: 'closures', timestamps: true })
export class Closure {
  @Prop({ type: [String], required: true, default: [] })
  resourceIds: string[];

  @Prop({ type: [String], required: true, default: [], index: true })
  affectedUnitIds: string[];

  @Prop({ required: true, type: Date, index: true })
  fromAt: Date;

  @Prop({ required: true, type: Date, index: true })
  toAt: Date;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  createdBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ClosureSchema = SchemaFactory.createForClass(Closure);
ClosureSchema.index({ fromAt: 1, toAt: 1 });
ClosureSchema.index({ affectedUnitIds: 1, fromAt: 1, toAt: 1 });
