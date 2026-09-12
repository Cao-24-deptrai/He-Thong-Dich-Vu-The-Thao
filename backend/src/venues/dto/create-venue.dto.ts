import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsObject } from 'class-validator';
import { VenueType } from '../../common/enums';

export class CreateVenueDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của cơ sở (Facility ID)' })
  @IsNotEmpty({ message: 'Facility ID không được để trống' })
  @IsString()
  facilityId: string;

  @ApiProperty({ example: 'Sân bóng 5 người số 1' })
  @IsNotEmpty({ message: 'Tên sân không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ enum: VenueType, example: VenueType.FOOTBALL_5, required: false })
  @IsOptional()
  type?: VenueType;

  @ApiProperty({ example: 'Standard', required: false })
  @IsOptional()
  @IsString()
  venueType?: string;

  @ApiProperty({ example: 250000, description: 'Giá gốc mỗi giờ (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  basePricePerHour?: number;

  @ApiProperty({ example: 250000, required: false })
  @IsOptional()
  @IsNumber()
  defaultPrice?: number;

  @ApiProperty({
    example: { peakHours: [{ startTime: '17:00', endTime: '21:00', price: 350000 }] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  pricingRules?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  pricingConfig?: any;

  @ApiProperty({
    example: { openTime: '06:00', closeTime: '23:00' },
    required: false,
    description: 'Khung giờ hoạt động',
  })
  @IsOptional()
  @IsObject()
  operatingHours?: {
    openTime: string;
    closeTime: string;
  };

  @ApiProperty({ example: 60, required: false, description: 'Độ dài mỗi slot (phút)' })
  @IsOptional()
  @IsNumber()
  slotDurationMinutes?: number;

  @ApiProperty({
    example: { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 },
    required: false,
    description: 'Chính sách hoàn hủy theo mốc giờ',
  })
  @IsOptional()
  @IsObject()
  cancellationPolicy?: {
    hoursBeforeForFullRefund: number;
    hoursBeforeForNoRefund: number;
  };
}
