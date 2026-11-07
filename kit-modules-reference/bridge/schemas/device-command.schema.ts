import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DeviceCommandType, DeviceCommandStatus } from '@sports/shared';

export type DeviceCommandDocument = DeviceCommand & Document;

@Schema({ timestamps: true, collection: 'device_commands' })
export class DeviceCommand {
  @Prop({ required: true, trim: true })
  commandCode!: string; // e.g. "CMD-20261026-0001"

  @Prop({ type: Types.ObjectId, ref: 'BridgeAgent', required: true, index: true })
  agentId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(DeviceCommandType), required: true })
  commandType!: DeviceCommandType;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, any>;

  @Prop({ type: String, enum: Object.values(DeviceCommandStatus), default: DeviceCommandStatus.PENDING, index: true })
  status!: DeviceCommandStatus;

  @Prop({ type: Number, default: 1 })
  priority!: number; // 1 (normal) đến 10 (emergency open)

  @Prop({ required: true, trim: true })
  idempotencyKey!: string;

  @Prop({ type: Date })
  executedAt?: Date;

  @Prop({ type: String })
  errorMessage?: string;
}

export const DeviceCommandSchema = SchemaFactory.createForClass(DeviceCommand);
DeviceCommandSchema.index({ commandCode: 1 }, { unique: true });
DeviceCommandSchema.index({ idempotencyKey: 1 }, { unique: true });
DeviceCommandSchema.index({ agentId: 1, status: 1, priority: -1, createdAt: 1 });
