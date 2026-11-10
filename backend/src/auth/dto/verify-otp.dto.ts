import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, IsOptional, IsEnum } from 'class-validator';
import { OtpPurpose } from '../schemas/otp-challenge.schema';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Số điện thoại đã nhận OTP', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Mã OTP 6 chữ số', example: '123456' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  code: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN, required: false })
  @IsOptional()
  @IsEnum(OtpPurpose, { message: 'Mục đích OTP không hợp lệ' })
  purpose?: OtpPurpose;
}
