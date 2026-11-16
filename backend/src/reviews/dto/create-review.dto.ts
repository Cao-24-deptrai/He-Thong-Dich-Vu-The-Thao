import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID đơn đặt sân' })
  @IsMongoId()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Điểm cơ sở vật chất (1-5 sao)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  facilityRating: number;

  @ApiProperty({ description: 'Điểm chất lượng dịch vụ (1-5 sao)', example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceRating: number;

  @ApiProperty({ description: 'Điểm thái độ nhân viên (1-5 sao)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  staffRating: number;

  @ApiProperty({ description: 'Điểm vệ sinh (1-5 sao)', example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  cleanlinessRating: number;

  @ApiProperty({ description: 'Nhận xét chi tiết', example: 'Sân cỏ đẹp, đèn sáng rõ, nhân viên nhiệt tình!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class QueryReviewDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  facilityId?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  venueId?: string;

  @ApiProperty({ required: false, description: 'Lọc các đánh giá có điểm <= 2 sao cần xử lý' })
  @IsOptional()
  needsAttention?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  rating?: number;
}
