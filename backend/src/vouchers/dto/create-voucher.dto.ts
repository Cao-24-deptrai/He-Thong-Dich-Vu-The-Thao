import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { DiscountType } from '../../common/enums';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Mã voucher (In hoa, không dấu)', example: 'PHANTA50K' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Tên / Tiêu đề voucher', example: 'Giảm 50.000đ cho lượt đặt sân' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.FIXED })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ description: 'Giá trị giảm (phần trăm % hoặc số tiền VND)', example: 50000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ description: 'Giá trị đơn tối thiểu (VND)', example: 200000, default: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiProperty({ description: 'Mức giảm tối đa khi dùng PERCENT (VND)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ description: 'Tổng ngân sách phát hành tối đa (VND, BR-13)', example: 10000000, default: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number;

  @ApiProperty({ description: 'Tổng số lượt dùng tối đa toàn hệ thống', default: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ description: 'Số lượt dùng tối đa trên mỗi user (BR-15, AC-15)', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực (ISO string)', example: '2026-11-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Ngày hết hạn hiệu lực (ISO string)', example: '2026-12-31T23:59:59.000Z' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Danh sách môn thể thao áp dụng', example: ['FOOTBALL'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableSports?: string[];

  @ApiProperty({ description: 'Danh sách ID sân con áp dụng', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableVenues?: string[];

  @ApiProperty({ description: 'Danh sách hạng thành viên áp dụng', example: ['GOLD', 'PLATINUM'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCustomerTiers?: string[];
}
