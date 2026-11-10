import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { OtpPurpose } from '../schemas/otp-challenge.schema';

export class SendOtpDto {
  @ApiProperty({ description: 'Số điện thoại nhận OTP (10 chữ số)', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN, required: false })
  @IsOptional()
  @IsEnum(OtpPurpose, { message: 'Mục đích OTP không hợp lệ' })
  purpose?: OtpPurpose;
}
