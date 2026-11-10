import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token để cấp mới access token' })
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  @IsString()
  refreshToken: string;

  @ApiProperty({ description: 'Device ID của phiên hiện tại', required: false, default: 'default-device' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
