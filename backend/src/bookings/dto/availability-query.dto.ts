import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-20', description: 'Ngày cần xem lịch (định dạng YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày tra cứu không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày tra cứu phải có định dạng YYYY-MM-DD' })
  date: string;
}
