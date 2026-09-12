import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePaymentLinkDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của booking cần thanh toán' })
  @IsNotEmpty({ message: 'Booking ID không được để trống' })
  @IsString()
  bookingId: string;

  @ApiProperty({ example: 'https://mysportsapp.vn/payment/success', required: false })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiProperty({ example: 'https://mysportsapp.vn/payment/cancel', required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiProperty({ enum: ['PAYOS', 'MOMO', 'VIETQR', 'CASH'], default: 'PAYOS', required: false })
  @IsOptional()
  @IsString()
  provider?: string;
}
