import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceCommandType, DeviceCommandStatus } from '../../common/enums';

export type DeviceCommandDocument = DeviceCommand & Document;

@Schema({ timestamps: true, collection: 'device_commands' })
export class DeviceCommand {
  @ApiProperty({ description: 'Command Code', example: 'CMD-20261102-001' })
  @Prop({ required: true, unique: true, trim: true, index: true })
  commandCode: string;

  @ApiProperty({ description: 'Target Bridge Agent ID' })
  @Prop({ type: Types.ObjectId, ref: 'BridgeAgent', required: true, index: true })
  agentId: Types.ObjectId;

  @ApiProperty({ enum: DeviceCommandType, example: DeviceCommandType.PRINT_RECEIPT })
  @Prop({
    type: String,
    enum: Object.values(DeviceCommandType),
    required: true,
  })
  commandType: DeviceCommandType;

  @ApiProperty({ description: 'Command Payload' })
  @Prop({ type: Object, default: {} })
  payload: Record<string, any>;

  @ApiProperty({ enum: DeviceCommandStatus, default: DeviceCommandStatus.PENDING })
  @Prop({
    type: String,
    enum: Object.values(DeviceCommandStatus),
    default: DeviceCommandStatus.PENDING,
    index: true,
  })
  status: DeviceCommandStatus;

  @ApiProperty({ description: 'Command priority (1: normal, 10: urgent)' })
  @Prop({ type: Number, default: 1 })
  priority: number;

  @ApiProperty({ description: 'Idempotency Key' })
  @Prop({ required: true, unique: true, trim: true, index: true })
  idempotencyKey: string;

  @ApiProperty({ description: 'Execution timestamp' })
  @Prop({ type: Date })
  executedAt?: Date;

  @ApiProperty({ description: 'Error message if failed' })
  @Prop({ type: String })
  errorMessage?: string;
}

export const DeviceCommandSchema = SchemaFactory.createForClass(DeviceCommand);
DeviceCommandSchema.index({ agentId: 1, status: 1, priority: -1, createdAt: 1 });
