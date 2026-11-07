import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GamingSessionStatus } from '@sports/shared';

export type GamingSessionDocument = GamingSession & Document;

@Schema({
  timestamps: true,
  collection: 'gaming_sessions',
})
export class GamingSession {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  sessionCode: string;

  @Prop({ type: Types.ObjectId, ref: 'GamingMachine', required: true, index: true })
  machineId: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  machineCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true })
  customerPhone: string;

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  startedAt: Date;

  @Prop({ type: Date, index: true })
  endedAt?: Date;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  lastHeartbeatAt: Date;

  @Prop({ type: Number, default: 0 })
  totalPlayedMinutes: number;

  @Prop({ type: Number, default: 0 })
  totalHoldAmount: number; // Tổng số tiền đã tạm giữ từ ví (Integer VND)

  @Prop({ type: Number, default: 0 })
  actualUsageAmount: number; // Tiền thực tế theo số phút đã chơi (Integer VND)

  @Prop({ type: Number, default: 0 })
  refundHoldAmount: number; // Tiền tạm giữ thừa được hoàn lại ví (Integer VND)

  @Prop({
    type: String,
    enum: Object.values(GamingSessionStatus),
    default: GamingSessionStatus.STARTING,
    index: true,
  })
  status: GamingSessionStatus;

  @Prop({ type: Types.ObjectId, ref: 'Booking', index: true })
  roomBookingId?: Types.ObjectId;

  @Prop({ type: Number })
  warningMinutesRemaining?: number;

  @Prop({ type: Boolean, default: false })
  isLocked?: boolean;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  idempotencyKey: string;
}

export const GamingSessionSchema = SchemaFactory.createForClass(GamingSession);

GamingSessionSchema.index(
  { customerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          GamingSessionStatus.STARTING,
          GamingSessionStatus.ACTIVE,
          GamingSessionStatus.OFFLINE_GRACE,
          GamingSessionStatus.LOCKED,
        ],
      },
    },
  },
);
GamingSessionSchema.index({ machineId: 1, status: 1 });
GamingSessionSchema.index({ startedAt: 1, status: 1 });
