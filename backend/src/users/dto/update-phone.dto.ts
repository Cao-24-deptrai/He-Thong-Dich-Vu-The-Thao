import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePhoneDto {
  @ApiProperty({ description: 'Số điện thoại Việt Nam (10 chữ số)', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam (vd: 0912345678)',
  })
  phone: string;

  @ApiProperty({ description: 'Firebase Phone ID Token (nếu có xác thực OTP)', required: false })
  @IsOptional()
  @IsString()
  firebaseIdToken?: string;
}
