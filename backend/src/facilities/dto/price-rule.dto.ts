import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { PriceBand } from '../schemas/price-rule.schema';

export class CreatePriceRuleDto {
  @ApiProperty({ description: 'Áp dụng cho môn hoặc mã sân (FOOTBALL_5, BADMINTON, S11,...)', example: 'FOOTBALL_5' })
  @IsNotEmpty()
  @IsString()
  appliesTo: string;

  @ApiProperty({ enum: PriceBand, example: PriceBand.PEAK })
  @IsEnum(PriceBand)
  band: PriceBand;

  @ApiProperty({ description: 'Các ngày trong tuần (0: CN, 1: T2, ..., 6: T7)', example: [1, 2, 3, 4, 5], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  dayOfWeek?: number[];

  @ApiProperty({ description: 'Giờ bắt đầu khung (HH:mm)', example: '17:30' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc khung (HH:mm)', example: '21:00' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Đơn giá chưa VAT mỗi giờ (VND Int64)', example: 300000 })
  @IsNotEmpty()
  @IsNumber()
  pricePerHour: number;

  @ApiProperty({ description: 'Mức phụ thu mỗi giờ (VND Int64)', example: 50000, required: false })
  @IsOptional()
  @IsNumber()
  surchargePerHour?: number;

  @ApiProperty({ description: 'Ngày bắt đầu có hiệu lực ISO string', example: '2026-11-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ description: 'Ngày hết hạn hiệu lực ISO string', required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class CalculatePriceDto {
  @ApiProperty({ description: 'ID của sân', example: '66e2c9a1b2c3d4e5f6a7b8c9' })
  @IsNotEmpty()
  @IsString()
  venueId: string;

  @ApiProperty({ description: 'Ngày đặt sân (YYYY-MM-DD)', example: '2026-11-05' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ description: 'Giờ bắt đầu (HH:mm)', example: '17:30' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Giờ kết thúc (HH:mm)', example: '19:00' })
  @IsNotEmpty()
  @IsString()
  endTime: string;
}
