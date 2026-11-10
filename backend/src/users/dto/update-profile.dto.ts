import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceInfoDto {
  @ApiProperty({ description: 'Mã số thuế doanh nghiệp', example: '0312345678', required: false })
  @IsOptional()
  @IsString()
  buyerTaxCode?: string;

  @ApiProperty({ description: 'Tên công ty / đơn vị xuất hóa đơn', example: 'Công ty TNHH Phanta', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Địa chỉ công ty', example: '123 Đường Số 1, TP.HCM', required: false })
  @IsOptional()
  @IsString()
  companyAddress?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'Email liên hệ', example: 'nguyenvana@gmail.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @ApiProperty({ description: 'Thông tin xuất hóa đơn VAT', type: InvoiceInfoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceInfoDto)
  invoiceInfo?: InvoiceInfoDto;
}
