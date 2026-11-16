import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GamingMachineZone, GamingMachineStatus } from '@sports/shared';

export type GamingMachineDocument = GamingMachine & Document;

@Schema({ _id: false })
export class MachineSpecs {
  @Prop({ type: String })
  cpu?: string;

  @Prop({ type: String })
  ram?: string;

  @Prop({ type: String })
  gpu?: string;

  @Prop({ type: String })
  screen?: string;
}

@Schema({ _id: false })
export class MachinePosition {
  @Prop({ type: Number })
  x?: number;

  @Prop({ type: Number })
  y?: number;

  @Prop({ type: Number, default: 1 })
  floor: number;

  @Prop({ type: String })
  roomName?: string;
}

@Schema({
  timestamps: true,
  collection: 'gaming_machines',
})
export class GamingMachine {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  machineCode: string;

  @Prop({
    type: String,
    enum: Object.values(GamingMachineZone),
    default: GamingMachineZone.STANDARD,
    index: true,
  })
  zone: GamingMachineZone;

  @Prop({ type: MachineSpecs, default: () => ({}) })
  specs?: MachineSpecs;

  @Prop({ type: MachinePosition, default: () => ({ floor: 1 }) })
  position?: MachinePosition;

  @Prop({
    type: String,
    enum: Object.values(GamingMachineStatus),
    default: GamingMachineStatus.IDLE,
    index: true,
  })
  status: GamingMachineStatus;

  @Prop({ type: Types.ObjectId, ref: 'GamingSession', default: null, index: true })
  currentSessionId?: Types.ObjectId | null;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  macAddress?: string;

  @Prop({ type: String })
  registrationToken?: string;

  @Prop({ type: String })
  oneTimeCode?: string;

  @Prop({ type: Number })
  hourlyPrice?: number;

  @Prop({ type: Date, index: true })
  lastHeartbeatAt?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const GamingMachineSchema = SchemaFactory.createForClass(GamingMachine);

GamingMachineSchema.index({ zone: 1, status: 1 });
GamingMachineSchema.index({ 'position.floor': 1 });
