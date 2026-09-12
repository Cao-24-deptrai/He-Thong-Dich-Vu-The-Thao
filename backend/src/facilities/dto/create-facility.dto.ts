import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class LocationDto {
  @ApiProperty({ example: 105.7725, description: 'Kinh độ (Longitude)', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: 21.0185, description: 'Vĩ độ (Latitude)', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;
}

export class CreateFacilityDto {
  @ApiProperty({ example: 'Tổ hợp Thể thao Mỹ Đình' })
  @IsNotEmpty({ message: 'Tên cơ sở không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội' })
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString()
  address: string;

  @ApiProperty({ type: LocationDto, required: false })
  @IsOptional()
  location?: LocationDto;

  @ApiProperty({ example: ['FOOTBALL', 'BADMINTON', 'TENNIS'], required: false })
  @IsOptional()
  @IsArray()
  sportTypes?: string[];

  @ApiProperty({ example: 'FOOTBALL', required: false })
  @IsOptional()
  @IsString()
  sportType?: string;
}
