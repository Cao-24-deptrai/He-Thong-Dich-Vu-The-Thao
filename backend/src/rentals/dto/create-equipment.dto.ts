import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SportType, RentalPricingType } from '../../common/enums';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'EQP-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Vợt Tennis Wilson Pro Staff' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: SportType, default: SportType.GENERAL })
  @IsEnum(SportType)
  @IsOptional()
  sportType?: SportType;

  @ApiProperty({ enum: RentalPricingType, default: RentalPricingType.PER_TURN })
  @IsEnum(RentalPricingType)
  @IsOptional()
  pricingType?: RentalPricingType;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 200000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @ApiProperty({ example: 100000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  damageFee?: number;

  @ApiProperty({ example: 500000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lostFee?: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(1)
  totalQuantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
