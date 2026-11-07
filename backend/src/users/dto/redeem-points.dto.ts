import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({ description: 'Số điểm thưởng muốn quy đổi (1 điểm = 100 VND)', example: 200 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Số điểm quy đổi tối thiểu là 1' })
  pointsToRedeem: number;

  @ApiProperty({ description: 'Giá trị đơn đặt sân trước giảm trừ điểm', example: 250000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  orderAmount: number;
}
