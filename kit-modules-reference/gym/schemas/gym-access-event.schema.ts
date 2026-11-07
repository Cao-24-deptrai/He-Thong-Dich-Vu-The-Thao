import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GymAccessType, GymAccessMethod } from '@sports/contracts';

export type GymAccessEventDocument = HydratedDocument<GymAccessEvent>;

@Schema({ timestamps: true, collection: 'gym_access_events' })
export class GymAccessEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GymMembership', required: true, index: true })
  membershipId: Types.ObjectId;

  @Prop({ required: true, enum: GymAccessType, index: true })
  type: GymAccessType;

  @Prop({ required: true, enum: GymAccessMethod })
  method: GymAccessMethod;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  operatorId?: Types.ObjectId;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ default: () => new Date(), index: true })
  occurredAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const GymAccessEventSchema = SchemaFactory.createForClass(GymAccessEvent);

GymAccessEventSchema.index({ userId: 1, occurredAt: -1 });
