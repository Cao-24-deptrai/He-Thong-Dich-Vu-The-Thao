import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GymMembershipStatus } from '@sports/contracts';

export type GymMembershipDocument = HydratedDocument<GymMembership>;

@Schema({ timestamps: true, collection: 'gym_memberships' })
export class GymMembership {
  @Prop({ required: true, unique: true, trim: true })
  membershipCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GymPackage', required: true, index: true })
  packageId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  packageName: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true, index: true })
  endDate: Date;

  @Prop({
    required: true,
    enum: GymMembershipStatus,
    default: GymMembershipStatus.ACTIVE,
    index: true,
  })
  status: GymMembershipStatus;

  @Prop({ trim: true, sparse: true, index: true })
  rfidCardId?: string;

  @Prop({ required: true, min: 0 })
  pricePaid: number;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GymMembershipSchema = SchemaFactory.createForClass(GymMembership);

GymMembershipSchema.index({ userId: 1, status: 1 });
