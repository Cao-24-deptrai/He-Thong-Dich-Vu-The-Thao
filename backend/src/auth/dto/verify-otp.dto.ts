import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsOptional, IsIn, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Số điện thoại nhận mã OTP', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, { message: 'Số điện thoại không đúng định dạng Việt Nam' })
  phone: string;

  @ApiProperty({ description: 'Mã xác thực 6 số', example: '123456' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  code: string;

  @ApiProperty({ description: 'Mục đích nhận OTP: AUTH | TRANSACTION', example: 'AUTH', required: false })
  @IsOptional()
  @IsIn(['AUTH', 'TRANSACTION'])
  purpose?: 'AUTH' | 'TRANSACTION';
}
