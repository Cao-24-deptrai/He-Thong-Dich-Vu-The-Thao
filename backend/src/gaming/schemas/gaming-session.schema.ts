import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { GamingSessionStatus } from '../../common/enums';

export type GamingSessionDocument = GamingSession & Document;

@Schema({ timestamps: true, collection: 'gaming_sessions' })
export class GamingSession {
  @ApiProperty({ description: 'Unique Session Code', example: 'GS-20261102-001' })
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  sessionCode: string;

  @ApiProperty({ description: 'Gaming Machine ID' })
  @Prop({ type: Types.ObjectId, ref: 'GamingMachine', required: true, index: true })
  machineId: Types.ObjectId;

  @ApiProperty({ description: 'Machine Code', example: 'PC-01' })
  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  machineCode: string;

  @ApiProperty({ description: 'Customer User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @ApiProperty({ description: 'Customer Phone', example: '0912345678' })
  @Prop({ type: String, required: true, trim: true, index: true })
  customerPhone: string;

  @ApiProperty({ description: 'Customer Full Name' })
  @Prop({ type: String })
  customerName?: string;

  @ApiProperty({ description: 'Session Started At' })
  @Prop({ type: Date, required: true, default: Date.now, index: true })
  startedAt: Date;

  @ApiProperty({ description: 'Session Ended At' })
  @Prop({ type: Date, index: true })
  endedAt?: Date;

  @ApiProperty({ description: 'Last Heartbeat Timestamp' })
  @Prop({ type: Date, required: true, default: Date.now, index: true })
  lastHeartbeatAt: Date;

  @ApiProperty({ description: 'Total Played Minutes', default: 0 })
  @Prop({ type: Number, default: 0 })
  totalPlayedMinutes: number;

  @ApiProperty({ description: 'Total Hold Amount from internal wallet (Integer VND)', default: 0 })
  @Prop({ type: Number, default: 0 })
  totalHoldAmount: number;

  @ApiProperty({ description: 'Actual Usage Amount billed (Integer VND)', default: 0 })
  @Prop({ type: Number, default: 0 })
  actualUsageAmount: number;

  @ApiProperty({ description: 'Refund Hold Amount returned to wallet (Integer VND)', default: 0 })
  @Prop({ type: Number, default: 0 })
  refundHoldAmount: number;

  @ApiProperty({ enum: GamingSessionStatus, default: GamingSessionStatus.STARTING })
  @Prop({
    type: String,
    enum: Object.values(GamingSessionStatus),
    default: GamingSessionStatus.STARTING,
    index: true,
  })
  status: GamingSessionStatus;

  @ApiProperty({ description: 'Prebooked Room Booking ID (if PREBOOKED session)' })
  @Prop({ type: Types.ObjectId, ref: 'Booking', index: true })
  roomBookingId?: Types.ObjectId;

  @ApiProperty({ description: 'Minutes remaining before lock' })
  @Prop({ type: Number })
  warningMinutesRemaining?: number;

  @ApiProperty({ description: 'Is machine currently locked' })
  @Prop({ type: Boolean, default: false })
  isLocked?: boolean;

  @ApiProperty({ description: 'Idempotency key for offline replay' })
  @Prop({ type: String, required: true, unique: true, index: true })
  idempotencyKey: string;
}

export const GamingSessionSchema = SchemaFactory.createForClass(GamingSession);

// Partial Unique Index 1: 1 tài khoản chỉ có duy nhất 1 phiên chơi đang mở trên toàn hệ thống (SPEC Rule 1)
GamingSessionSchema.index(
  { customerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [GamingSessionStatus.STARTING, GamingSessionStatus.ACTIVE, GamingSessionStatus.OFFLINE_GRACE, GamingSessionStatus.LOCKED] },
    },
  },
);

// Partial Unique Index 2: 1 máy chỉ có duy nhất 1 phiên chơi đang mở tại một thời điểm
GamingSessionSchema.index(
  { machineId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [GamingSessionStatus.STARTING, GamingSessionStatus.ACTIVE, GamingSessionStatus.OFFLINE_GRACE, GamingSessionStatus.LOCKED] },
    },
  },
);
