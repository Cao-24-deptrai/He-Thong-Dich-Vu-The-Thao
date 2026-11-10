import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LockUserDto {
  @ApiProperty({ description: 'Thời gian khóa (phút)', default: 15, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minutes?: number = 15;

  @ApiProperty({ description: 'Lý do khóa tài khoản', required: false, example: 'Vi phạm chính sách đặt sân' })
  @IsOptional()
  @IsString()
  reason?: string;
}
