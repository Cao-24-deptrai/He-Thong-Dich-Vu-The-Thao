import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ApplyVoucherDto {
  @ApiProperty({ description: 'Mã voucher cần áp dụng', example: 'PHANTA50K' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Giá trị đơn hàng trước giảm giá (VND)', example: 350000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  orderAmount: number;

  @ApiProperty({ description: 'ID đơn đặt sân (nếu áp dụng cho booking)', required: false })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ description: 'ID đơn hàng (nếu áp dụng cho canteen/pos)', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: 'Môn thể thao của sân đặt (để kiểm tra ràng buộc môn)', required: false, example: 'FOOTBALL' })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiProperty({ description: 'ID sân con (để kiểm tra ràng buộc sân)', required: false })
  @IsOptional()
  @IsString()
  venueId?: string;
}

export class ValidateVoucherDto {
  @ApiProperty({ description: 'Mã voucher cần kiểm tra', example: 'PHANTA50K' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Giá trị đơn dự kiến', example: 300000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  orderAmount: number;

  @ApiProperty({ description: 'Môn thể thao', required: false })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiProperty({ description: 'ID sân con', required: false })
  @IsOptional()
  @IsString()
  venueId?: string;
}
