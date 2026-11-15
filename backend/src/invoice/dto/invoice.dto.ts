import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Thuê sân bóng đá 7 người (18:00 - 19:30)' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  taxRate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'Nguyễn Văn Minh' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: '0312345678', required: false })
  @IsOptional()
  @IsString()
  customerTaxCode?: string;

  @ApiProperty({ example: 'Công ty Cổ phần Thể thao ABC', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM', required: false })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiProperty({ example: 'contact@abc.vn', required: false })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({ example: 'BOOKING' })
  @IsString()
  refType: string;

  @ApiProperty({ example: 'BK-170001' })
  @IsString()
  refId: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
