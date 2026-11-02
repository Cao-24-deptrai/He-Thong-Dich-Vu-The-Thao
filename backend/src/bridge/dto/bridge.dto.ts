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
  @ApiProperty({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsNotEmpty()
  @IsString()
  agentCode: string;

  @ApiProperty({ description: 'Agent friendly name', example: 'Quầy Thu Ngân 1' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Secret key for token generation' })
  @IsNotEmpty()
  @IsString()
  secretKey: string;

  @ApiProperty({ description: 'Physical Location', example: 'Quầy 1 sảnh chính' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ enum: DeviceType, isArray: true })
  @IsArray()
  supportedDevices: DeviceType[];

  @ApiPropertyOptional({ description: 'Hardware config' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
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
  @ApiProperty({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsNotEmpty()
  @IsString()
  agentCode: string;

  @ApiPropertyOptional({ description: 'Device diagnostics map' })
  @IsOptional()
  @IsObject()
  diagnostics?: Record<string, any>;
}

export class SubmitDeviceEventDto {
  @ApiProperty({ description: 'Agent code', example: 'AGENT-POS-01' })
  @IsNotEmpty()
  @IsString()
  agentCode: string;

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

  @ApiProperty({ enum: DeviceCommandType, example: DeviceCommandType.TRIGGER_TURNSTILE })
  @IsNotEmpty()
  @IsEnum(DeviceCommandType)
  commandType: DeviceCommandType;

  @ApiPropertyOptional({ description: 'Command Payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  priority?: number;
}
