import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BridgeAgentStatus, DeviceType, DeviceHealthStatus } from '../../common/enums';

export type BridgeAgentDocument = BridgeAgent & Document;

@Schema({ _id: false })
export class DeviceDiagnosticSubdoc {
  @ApiProperty({ enum: DeviceHealthStatus, default: DeviceHealthStatus.OK })
  @Prop({ type: String, enum: Object.values(DeviceHealthStatus), default: DeviceHealthStatus.OK })
  status: DeviceHealthStatus;

  @ApiProperty({ description: 'Diagnostic details / error message' })
  @Prop({ type: String })
  details?: string;

  @ApiProperty({ description: 'Last diagnostic update' })
  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
const DeviceDiagnosticSubdocSchema = SchemaFactory.createForClass(DeviceDiagnosticSubdoc);

@Schema({ timestamps: true, collection: 'bridge_agents' })
export class BridgeAgent {
  @ApiProperty({ description: 'Agent unique code', example: 'AGENT-POS-01' })
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  agentCode: string;

  @ApiProperty({ description: 'Agent friendly name', example: 'Quầy Thu Ngân 1' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ description: 'Token hash for handshake authentication' })
  @Prop({ required: true })
  tokenHash: string;

  @ApiProperty({ description: 'Physical Location', example: 'Cửa xoay Gym tầng 1' })
  @Prop({ required: true, trim: true })
  location: string;

  @ApiProperty({ enum: BridgeAgentStatus, default: BridgeAgentStatus.OFFLINE })
  @Prop({
    type: String,
    enum: Object.values(BridgeAgentStatus),
    default: BridgeAgentStatus.OFFLINE,
    index: true,
  })
  status: BridgeAgentStatus;

  @ApiProperty({ description: 'Last heartbeat timestamp' })
  @Prop({ type: Date })
  lastHeartbeatAt?: Date;

  @ApiProperty({ description: 'IP address of the agent machine' })
  @Prop({ type: String, trim: true })
  ipAddress?: string;

  @ApiProperty({ description: 'Software version', example: '1.2.0' })
  @Prop({ type: String, trim: true, default: '1.0.0' })
  softwareVersion: string;

  @ApiProperty({ enum: DeviceType, isArray: true })
  @Prop({ type: [String], enum: Object.values(DeviceType), default: [] })
  supportedDevices: DeviceType[];

  @ApiProperty({ description: 'Diagnostics map by device type' })
  @Prop({
    type: Map,
    of: DeviceDiagnosticSubdocSchema,
    default: () => new Map(),
  })
  diagnostics: Map<string, DeviceDiagnosticSubdoc>;

  @ApiProperty({ description: 'Hardware configuration object' })
  @Prop({ type: Object, default: () => ({}) })
  config: Record<string, any>;
}

export const BridgeAgentSchema = SchemaFactory.createForClass(BridgeAgent);
