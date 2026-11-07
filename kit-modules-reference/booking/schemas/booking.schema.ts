import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { BookingStatus } from '@sports/shared';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ _id: false })
export class MatchmakingInfo {
  @Prop({ default: false, index: true })
  isLookingForOpponent: boolean;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  skillLevel?: string;
}

const MatchmakingInfoSchema = SchemaFactory.createForClass(MatchmakingInfo);

@Schema({ _id: false })
export class PolicySnapshot {
  @Prop({ required: true, default: 24 })
  cancelRefundCutoffHours: number;

  @Prop({ required: true, default: 30 })
  depositPercent: number;
}

const PolicySnapshotSchema = SchemaFactory.createForClass(PolicySnapshot);

@Schema({ collection: 'bookings', timestamps: true })
export class Booking {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  bookingCode: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  resourceCode: string;

  @Prop({ required: true, trim: true })
  sport: string;

  @Prop({ required: true, trim: true, index: true })
  date: string; // YYYY-MM-DD (Giờ VN)

  @Prop({ type: [Number], required: true })
  slotIndices: number[];

  @Prop({ type: [String], required: true, index: true })
  baseUnitIds: string[];

  @Prop({
    required: true,
    enum: Object.values(BookingStatus),
    default: BookingStatus.HOLD,
    index: true,
  })
  status: BookingStatus;

  @Prop({ required: true, type: Number })
  totalPrice: number; // Integer VND

  @Prop({ required: true, type: Number })
  depositAmount: number; // Integer VND

  @Prop({ required: true, type: Number, default: 0 })
  paidAmount: number; // Integer VND

  @Prop({ type: Date, index: true })
  holdExpiresAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  priceSnapshot: Record<string, unknown>;

  @Prop({ type: PolicySnapshotSchema, required: true })
  policySnapshot: PolicySnapshot;

  @Prop({ type: MatchmakingInfoSchema, default: () => ({ isLookingForOpponent: false }) })
  matchmaking?: MatchmakingInfo;

  @Prop({ type: Date })
  checkInAt?: Date;

  @Prop({ type: Date })
  checkOutAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancelReason?: string;

  @Prop({ type: Number })
  refundAmount?: number;

  @Prop({ required: true, default: 0 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ resourceCode: 1, date: 1, status: 1 });
BookingSchema.index({ status: 1, holdExpiresAt: 1 });
BookingSchema.index({ 'matchmaking.isLookingForOpponent': 1, date: 1 });
