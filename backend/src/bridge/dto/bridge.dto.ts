import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import {
  DeviceType,
  DeviceEventType,
  DeviceCommandType,
} from '../../common/enums';

export class CreateBridgeAgentDto {
  @ApiPropertyOptional({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsOptional()
  @IsString()
  agentCode?: string;

  @ApiPropertyOptional({ description: 'Agent ID alias' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Agent friendly name', example: 'Quầy Thu Ngân 1' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Secret key for token generation' })
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional({ description: 'Physical Location', example: 'Quầy 1 sảnh chính' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: DeviceType, isArray: true })
  @IsOptional()
  @IsArray()
  supportedDevices?: DeviceType[];

  @ApiPropertyOptional({ description: 'Hardware config' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  devices?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  deviceStatuses?: any[];
}

export class AgentHandshakeDto {
  @ApiProperty({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsNotEmpty()
  @IsString()
  agentCode: string;

  @ApiProperty({ description: 'Secret key provided during installation' })
  @IsNotEmpty()
  @IsString()
  secretKey: string;

  @ApiPropertyOptional({ description: 'Agent software version' })
  @IsOptional()
  @IsString()
  softwareVersion?: string;
}

export class AgentHeartbeatDto {
  @ApiPropertyOptional({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsOptional()
  @IsString()
  agentCode?: string;

  @ApiPropertyOptional({ description: 'Agent ID alias' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Device diagnostics map' })
  @IsOptional()
  @IsObject()
  diagnostics?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  status?: any;

  @ApiPropertyOptional()
  @IsOptional()
  offlineQueueSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  devices?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  deviceStatuses?: any[];
}

export class SubmitDeviceEventDto {
  @ApiPropertyOptional({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsOptional()
  @IsString()
  agentCode?: string;

  @ApiPropertyOptional({ description: 'Agent ID alias' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ enum: DeviceEventType, example: DeviceEventType.QR_SCANNED })
  @IsNotEmpty()
  @IsEnum(DeviceEventType)
  eventType: DeviceEventType;

  @ApiProperty({ description: 'Event payload (QR token raw text, RFID serial, etc.)' })
  @IsNotEmpty()
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({ description: 'Idempotency key for offline replay' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ description: 'Timestamp when scanned on edge' })
  @IsOptional()
  occurredAt?: Date;
}

export class CreateDeviceCommandDto {
  @ApiProperty({ description: 'Target Agent ID' })
  @IsNotEmpty()
  @IsString()
  agentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ enum: DeviceCommandType, example: DeviceCommandType.TRIGGER_TURNSTILE })
  @IsNotEmpty()
  @IsEnum(DeviceCommandType)
  commandType: DeviceCommandType;

  @ApiPropertyOptional({ description: 'Command Payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Command Params' })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  priority?: number;
}
