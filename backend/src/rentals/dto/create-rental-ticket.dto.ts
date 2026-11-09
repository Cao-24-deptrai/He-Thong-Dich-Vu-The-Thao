import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentProvider } from '../../common/enums';

export class RentalItemOrderDto {
  @ApiProperty({ description: 'ID thiết bị', example: '60d5ecb8b487343568912345' })
  @IsMongoId()
  @IsNotEmpty()
  equipmentId: string;

  @ApiProperty({ description: 'Số lượng thuê', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateRentalTicketDto {
  @ApiProperty({ example: '0911223344' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  shiftId?: string;

  @ApiProperty({ type: [RentalItemOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalItemOrderDto)
  items: RentalItemOrderDto[];

  @ApiProperty({ description: 'Thời lượng thuê tính bằng giờ (nếu giá theo giờ, mặc định 2 giờ)', default: 2, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  rentalHours?: number;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.CASH })
  @IsEnum(PaymentProvider)
  @IsOptional()
  paymentMethod?: PaymentProvider;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
