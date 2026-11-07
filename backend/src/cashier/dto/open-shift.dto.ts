import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({ description: 'Initial cash float in VND', example: 2000000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialCash?: number;

  @ApiProperty({ description: 'Alias for initial cash float in VND', example: 2000000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  openingCash?: number;

  @ApiProperty({ description: 'Shift opening note', example: 'Mở ca sáng đầu ngày', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
