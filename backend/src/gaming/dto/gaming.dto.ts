import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import {
  GamingMachineZone,
  GamingRemoteAction,
} from '../../common/enums';

export class CreateGamingMachineDto {
  @ApiProperty({ description: 'Machine code (e.g. PC-01..50, PC-R01-01)', example: 'PC-01' })
  @IsNotEmpty()
  @IsString()
  machineCode: string;

  @ApiPropertyOptional({ enum: GamingMachineZone, default: GamingMachineZone.STANDARD })
  @IsOptional()
  @IsEnum(GamingMachineZone)
  zone?: GamingMachineZone;

  @ApiPropertyOptional({ description: 'Hourly price in VND', example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyPrice?: number;

  @ApiPropertyOptional({ description: 'Room name' })
  @IsOptional()
  @IsString()
  roomName?: string;
}

export class StartGamingSessionDto {
  @ApiProperty({ description: 'Machine Code', example: 'PC-01' })
  @IsNotEmpty()
  @IsString()
  machineCode: string;

  @ApiPropertyOptional({ description: 'Prebooked Booking ID (optional)' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class GamingHeartbeatDto {
  @ApiProperty({ description: 'Active session code', example: 'GS-20261102-001' })
  @IsNotEmpty()
  @IsString()
  sessionCode: string;

  @ApiProperty({ description: 'Client monotonic clock timestamp in ms' })
  @IsNotEmpty()
  @IsNumber()
  clientTimestampMs: number;

  @ApiPropertyOptional({ description: 'Elapsed minutes reported by client' })
  @IsOptional()
  @IsNumber()
  elapsedMinutes?: number;
}

export class EndGamingSessionDto {
  @ApiProperty({ description: 'Session code to terminate', example: 'GS-20261102-001' })
  @IsNotEmpty()
  @IsString()
  sessionCode: string;

  @ApiPropertyOptional({ description: 'Reason for closing session' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SwitchMachineDto {
  @ApiProperty({ description: 'Current active session code' })
  @IsNotEmpty()
  @IsString()
  sessionCode: string;

  @ApiProperty({ description: 'New target machine code', example: 'PC-05' })
  @IsNotEmpty()
  @IsString()
  targetMachineCode: string;
}

export class RemoteControlDto {
  @ApiProperty({ description: 'Target Machine Code', example: 'PC-01' })
  @IsNotEmpty()
  @IsString()
  machineCode: string;

  @ApiProperty({ enum: GamingRemoteAction, example: GamingRemoteAction.LOCK })
  @IsNotEmpty()
  @IsEnum(GamingRemoteAction)
  action: GamingRemoteAction;

  @ApiPropertyOptional({ description: 'Message payload (for MESSAGE action)' })
  @IsOptional()
  @IsString()
  message?: string;
}
