import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Số điện thoại đăng nhập', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Mật khẩu đăng nhập', example: 'Password123' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Unique device identifier', required: false, default: 'default-device' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'Device human-readable name', required: false, example: 'Chrome on Windows 11' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
