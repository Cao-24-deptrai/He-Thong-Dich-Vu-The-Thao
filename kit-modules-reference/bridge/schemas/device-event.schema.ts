import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DeviceEventType, DeviceType } from '@sports/shared';

export type DeviceEventDocument = DeviceEvent & Document;

@Schema({ timestamps: true, collection: 'device_events' })
export class DeviceEvent {
  @Prop({ required: true, trim: true })
  eventCode!: string; // e.g. "EVT-20261026-0001"

  @Prop({ type: Types.ObjectId, ref: 'BridgeAgent', required: true, index: true })
  agentId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(DeviceEventType), required: true, index: true })
  eventType!: DeviceEventType;

  @Prop({ type: String, enum: Object.values(DeviceType), required: true })
  deviceType!: DeviceType;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, any>;

  @Prop({ type: Date, required: true, index: true })
  occurredAt!: Date;

  @Prop({ type: Date, default: Date.now })
  syncedAt!: Date;

  @Prop({ type: Boolean, default: false })
  isOfflineReplay!: boolean;

  @Prop({ required: true, trim: true })
  idempotencyKey!: string;

  @Prop({ type: Boolean, default: false })
  processed!: boolean;

  @Prop({ type: String })
  processResult?: string;
}

export const DeviceEventSchema = SchemaFactory.createForClass(DeviceEvent);
DeviceEventSchema.index({ eventCode: 1 }, { unique: true });
DeviceEventSchema.index({ idempotencyKey: 1 }, { unique: true });
DeviceEventSchema.index({ agentId: 1, occurredAt: -1 });
