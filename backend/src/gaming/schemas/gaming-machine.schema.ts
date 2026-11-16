import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { GamingMachineZone, GamingMachineStatus } from '../../common/enums';

export type GamingMachineDocument = GamingMachine & Document;

@Schema({ _id: false })
export class MachineSpecs {
  @ApiProperty({ example: 'Intel Core i7-14700K' })
  @Prop({ type: String })
  cpu?: string;

  @ApiProperty({ example: '32GB DDR5' })
  @Prop({ type: String })
  ram?: string;

  @ApiProperty({ example: 'NVIDIA RTX 4080 Super' })
  @Prop({ type: String })
  gpu?: string;

  @ApiProperty({ example: '27 inch 240Hz Fast IPS' })
  @Prop({ type: String })
  screen?: string;
}

@Schema({ _id: false })
export class MachinePosition {
  @ApiProperty({ example: 10 })
  @Prop({ type: Number })
  x?: number;

  @ApiProperty({ example: 20 })
  @Prop({ type: Number })
  y?: number;

  @ApiProperty({ example: 1, default: 1 })
  @Prop({ type: Number, default: 1 })
  floor: number;

  @ApiProperty({ example: 'Sảnh chính' })
  @Prop({ type: String })
  roomName?: string;
}

@Schema({ timestamps: true, collection: 'gaming_machines' })
export class GamingMachine {
  @ApiProperty({ description: 'Machine Code (e.g. PC-01..50, PC-R01-01..10, PC-E01-01..20)', example: 'PC-01' })
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  machineCode: string;

  @ApiProperty({ enum: GamingMachineZone, default: GamingMachineZone.STANDARD })
  @Prop({
    type: String,
    enum: Object.values(GamingMachineZone),
    default: GamingMachineZone.STANDARD,
    index: true,
  })
  zone: GamingMachineZone;

  @ApiProperty({ enum: GamingMachineStatus, default: GamingMachineStatus.IDLE })
  @Prop({
    type: String,
    enum: Object.values(GamingMachineStatus),
    default: GamingMachineStatus.IDLE,
    index: true,
  })
  status: GamingMachineStatus;

  @ApiProperty({ type: MachineSpecs })
  @Prop({ type: MachineSpecs, default: () => ({}) })
  specs: MachineSpecs;

  @ApiProperty({ type: MachinePosition })
  @Prop({ type: MachinePosition, default: () => ({ floor: 1 }) })
  position: MachinePosition;

  @ApiProperty({ description: 'Hourly price in VND', example: 10000 })
  @Prop({ type: Number, default: 10000 })
  hourlyPrice: number;

  @ApiProperty({ description: 'Current active session code' })
  @Prop({ type: String })
  currentSessionCode?: string;

  @ApiProperty({ description: 'Current active user phone' })
  @Prop({ type: String })
  currentUserPhone?: string;

  @ApiProperty({ description: 'Last ping timestamp' })
  @Prop({ type: Date })
  lastPingAt?: Date;

  @ApiProperty({ default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const GamingMachineSchema = SchemaFactory.createForClass(GamingMachine);
