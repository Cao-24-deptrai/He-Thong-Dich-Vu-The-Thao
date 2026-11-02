import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceEventType } from '../../common/enums';

export type DeviceEventDocument = DeviceEvent & Document;

@Schema({ timestamps: true, collection: 'device_events' })
export class DeviceEvent {
  @ApiProperty({ description: 'Event unique code', example: 'EVT-20261102-001' })
  @Prop({ required: true, unique: true, trim: true, index: true })
  eventCode: string;

  @ApiProperty({ description: 'Origin Bridge Agent ID' })
  @Prop({ type: Types.ObjectId, ref: 'BridgeAgent', required: true, index: true })
  agentId: Types.ObjectId;

  @ApiProperty({ enum: DeviceEventType, example: DeviceEventType.QR_SCANNED })
  @Prop({
    type: String,
    enum: Object.values(DeviceEventType),
    required: true,
    index: true,
  })
  eventType: DeviceEventType;

  @ApiProperty({ description: 'Event Payload (QR raw data, RFID tag, etc.)' })
  @Prop({ type: Object, default: {} })
  payload: Record<string, any>;

  @ApiProperty({ description: 'Idempotency key for offline sync deduplication' })
  @Prop({ required: true, unique: true, trim: true, index: true })
  idempotencyKey: string;

  @ApiProperty({ description: 'Timestamp when event occurred on edge device' })
  @Prop({ type: Date, required: true, default: Date.now })
  occurredAt: Date;

  @ApiProperty({ description: 'Processed by Cloud status', default: true })
  @Prop({ type: Boolean, default: true })
  isProcessed: boolean;
}

export const DeviceEventSchema = SchemaFactory.createForClass(DeviceEvent);
DeviceEventSchema.index({ agentId: 1, eventType: 1, occurredAt: -1 });
