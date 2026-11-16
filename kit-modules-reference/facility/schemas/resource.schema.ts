import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ResourceKind, SportType, ResourceStatus } from '@sports/contracts';

export type ResourceDocument = HydratedDocument<Resource>;

@Schema({ collection: 'resources', timestamps: true })
export class Resource {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Object.values(ResourceKind), index: true })
  kind: ResourceKind;

  @Prop({ required: true, enum: Object.values(SportType), index: true })
  sport: SportType;

  @Prop({ trim: true })
  variant?: string;

  @Prop({ required: true, default: false })
  isComposite: boolean;

  @Prop({ type: [String], required: true, default: [] })
  baseUnitIds: string[];

  @Prop({ type: Number })
  capacity?: number;

  @Prop({ required: true, enum: Object.values(ResourceStatus), default: ResourceStatus.ACTIVE, index: true })
  status: ResourceStatus;

  @Prop({ type: Number, default: 0, index: true })
  orderIndex: number;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
ResourceSchema.index({ kind: 1, sport: 1, status: 1 });
ResourceSchema.index({ baseUnitIds: 1 });
