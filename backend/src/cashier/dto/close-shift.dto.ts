import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({ description: 'Shift ID to close (optional, defaults to active shift)', required: false })
  @IsString()
  @IsOptional()
  shiftId?: string;

  @ApiProperty({ description: 'Actual cash counted by cashier in VND', example: 5840000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualCash?: number;

  @ApiProperty({
    description: 'Counting details for 9 polymer cash denominations',
    example: { '500000': 10, '200000': 4, '100000': 0, '50000': 0, '20000': 2, '10000': 0, '5000': 0, '2000': 0, '1000': 0 },
    required: false,
  })
  @IsOptional()
  denominations?: Record<string, number>;

  @ApiProperty({ description: 'Shift handover comment', example: 'Đầy đủ tiền mặt, không có chênh lệch', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
