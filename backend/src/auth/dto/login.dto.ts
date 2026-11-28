import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, ValidateIf } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Số điện thoại, email hoặc mã tài khoản đăng nhập',
    example: '0912345678',
    required: false,
  })
  @ValidateIf((o) => !o.identifier)
  @IsNotEmpty({ message: 'Số điện thoại hoặc email không được để trống' })
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Số điện thoại hoặc email đăng nhập (tương đương phone)',
    example: 'khachhang@gmail.com',
    required: false,
  })
  @ValidateIf((o) => !o.phone)
  @IsNotEmpty({ message: 'Số điện thoại hoặc email không được để trống' })
  @IsString()
  identifier?: string;

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
