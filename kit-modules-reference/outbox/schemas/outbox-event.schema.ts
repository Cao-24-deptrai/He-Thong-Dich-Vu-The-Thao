import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OutboxStatus } from '@sports/shared';

export type OutboxEventDocument = OutboxEvent & Document;

@Schema({ collection: 'outbox_events', timestamps: { createdAt: true, updatedAt: false } })
export class OutboxEvent {
  @Prop({ required: true, index: true })
  eventType!: string; // ví dụ: booking.booking.confirmed, wallet.ledger.credited

  @Prop({ required: true })
  aggregateType!: string; // ví dụ: Booking, Wallet, Payment

  @Prop({ required: true })
  aggregateId!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ required: true, enum: OutboxStatus, default: OutboxStatus.PENDING, index: true })
  status!: OutboxStatus;

  @Prop({ default: 0 })
  retryCount!: number;

  @Prop()
  processedAt?: Date;

  @Prop()
  lastError?: string;

  createdAt!: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// Compound index cho worker polling tối ưu
OutboxEventSchema.index({ status: 1, createdAt: 1 });
