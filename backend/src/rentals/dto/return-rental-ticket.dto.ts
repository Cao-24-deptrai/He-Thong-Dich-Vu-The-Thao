import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { RentalItemCondition } from '../../common/enums';

export class ReturnRentalItemDto {
  @ApiProperty({ description: 'ID thiết bị', example: '60d5ecb8b487343568912345' })
  @IsMongoId()
  @IsNotEmpty()
  equipmentId: string;

  @ApiProperty({ enum: RentalItemCondition, example: RentalItemCondition.GOOD })
  @IsEnum(RentalItemCondition)
  condition: RentalItemCondition;

  @ApiProperty({ description: 'Số lượng theo tình trạng này', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Phí phạt bổ sung nếu có thỏa thuận khác', required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  customPenaltyFee?: number;
}

export class ReturnRentalTicketDto {
  @ApiProperty({ type: [ReturnRentalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnRentalItemDto)
  items: ReturnRentalItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
