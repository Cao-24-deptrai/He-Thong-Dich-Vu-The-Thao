import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryFacilityDto {
  @ApiProperty({ required: false, description: 'Lọc theo môn thể thao (VD: FOOTBALL, BADMINTON)' })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiProperty({ required: false, description: 'Kinh độ người dùng để tìm gần nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({ required: false, description: 'Vĩ độ người dùng để tìm gần nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false, description: 'Bán kính tìm kiếm (mét), mặc định 10000m (10km)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDistance?: number;

  @ApiProperty({ required: false, description: 'Bao gồm cả cơ sở đã vô hiệu hóa (Admin)', default: false })
  @IsOptional()
  includeInactive?: boolean | string;
}
