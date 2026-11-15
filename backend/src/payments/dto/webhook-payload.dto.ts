import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString, IsObject } from 'class-validator';

export class WebhookDataDto {
  @ApiProperty({ example: 123456, required: false })
  @IsOptional()
  orderCode?: number | string;

  @ApiProperty({ example: 250000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'FT260912123456', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'BOOKING_66e2c9a1b2c3d4e5f6a7b8c9', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', required: false })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: '00', required: false })
  @IsOptional()
  @IsString()
  code?: string;
}

export class WebhookPayloadDto {
  @ApiProperty({ example: '00', description: 'Mã trạng thái từ cổng thanh toán (00 là thành công)' })
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'success' })
  @IsOptional()
  desc?: string;

  @ApiProperty({ type: WebhookDataDto })
  @IsNotEmpty()
  @IsObject()
  data: WebhookDataDto;

  @ApiProperty({ example: 'signature_hash_hex', required: false })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ example: 'TXN_ID_123456', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ example: 'IDEM_KEY_123456', required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
