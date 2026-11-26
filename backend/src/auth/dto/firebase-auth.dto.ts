import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Firebase ID Token từ Google Sign-In trên client' })
  @IsNotEmpty({ message: 'Firebase ID Token không được để trống' })
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'Mã định danh thiết bị', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'Tên thiết bị', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class ResetPasswordByPhoneDto {
  @ApiProperty({ description: 'Firebase ID Token sau khi xác thực OTP qua SĐT' })
  @IsNotEmpty({ message: 'Firebase ID Token không được để trống' })
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'Mật khẩu mới tối thiểu 6 ký tự', example: 'NewPass@123' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}

export class PrepareEmailResetDto {
  @ApiProperty({ description: 'Email đã đăng ký tài khoản khách hàng', example: 'khachhang@gmail.com' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;
}

export class ResetPasswordByEmailDto {
  @ApiProperty({ description: 'Firebase ID Token sau khi người dùng đặt lại mật khẩu qua Email Link' })
  @IsNotEmpty({ message: 'Firebase ID Token không được để trống' })
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'Mật khẩu mới đã đặt (tối thiểu 6 ký tự)', example: 'NewPass@123' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}
