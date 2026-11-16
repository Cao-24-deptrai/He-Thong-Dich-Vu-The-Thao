import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BridgeAgentStatus, DeviceType, DeviceHealthStatus } from '@sports/shared';

export type BridgeAgentDocument = BridgeAgent & Document;

@Schema({ _id: false })
export class DeviceDiagnosticSubdoc {
  @Prop({ type: String, enum: Object.values(DeviceHealthStatus), default: DeviceHealthStatus.OK })
  status!: DeviceHealthStatus;

  @Prop({ type: String })
  details?: string;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}
const DeviceDiagnosticSubdocSchema = SchemaFactory.createForClass(DeviceDiagnosticSubdoc);

@Schema({ timestamps: true, collection: 'bridge_agents' })
export class BridgeAgent {
  @Prop({ required: true, trim: true })
  agentCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  tokenHash!: string; // SHA-256 hash của Secret Key dùng cho Handshake

  @Prop({ required: true, trim: true })
  location!: string; // e.g. "Cửa xoay Gym tầng 1", "Quầy thu ngân 1"

  @Prop({ type: String, enum: Object.values(BridgeAgentStatus), default: BridgeAgentStatus.OFFLINE, index: true })
  status!: BridgeAgentStatus;

  @Prop({ type: Date })
  lastHeartbeatAt?: Date;

  @Prop({ type: String, trim: true })
  ipAddress?: string;

  @Prop({ type: String, trim: true })
  version?: string;

  @Prop({ type: [String], enum: Object.values(DeviceType), default: [] })
  supportedDevices!: DeviceType[];

  @Prop({ type: Map, of: DeviceDiagnosticSubdocSchema, default: {} })
  deviceStatuses!: Map<string, DeviceDiagnosticSubdoc>;

  @Prop({ type: Map, of: Object, default: {} })
  config!: Map<string, any>;

  @Prop({ type: String })
  sessionTokenHash?: string;

  @Prop({ type: Date })
  sessionExpiresAt?: Date;
}

export const BridgeAgentSchema = SchemaFactory.createForClass(BridgeAgent);
BridgeAgentSchema.index({ agentCode: 1 }, { unique: true });
