import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMatchRequestDto {
  @ApiProperty({ description: 'Môn thể thao (FOOTBALL, BADMINTON, TENNIS, ESPORTS, GYM...)', example: 'FOOTBALL' })
  @IsString()
  @IsNotEmpty()
  sportType: string;

  @ApiProperty({ description: 'Ngày giờ diễn ra trận đấu (ISO 8601)', example: '2026-09-20T19:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  matchDate: string;

  @ApiProperty({ description: 'Mô tả địa điểm, yêu cầu trình độ hoặc ghi chú', example: 'Sân bóng Chùa Láng sân 5, cần 2 bạn đá vị trí hậu vệ', required: false })
  @IsString()
  @IsOptional()
  locationDescription?: string;

  @ApiProperty({ description: 'Số lượng người chơi cần tìm thêm', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  slotsNeeded: number;
}
