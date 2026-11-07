import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsNumber, Min, IsString, IsOptional } from 'class-validator';
import { PoolCode } from '../enums/pool.enum';

export class PurchasePoolTicketDto {
  @ApiProperty({ description: 'Số lượng vé người lớn (25.000đ/vé - BR-31)', example: 2, default: 1 })
  @IsNumber()
  @Min(0)
  adultCount: number;

  @ApiProperty({ description: 'Số lượng vé trẻ em < 1m4 (20.000đ/vé - BR-31)', example: 1, default: 0 })
  @IsNumber()
  @Min(0)
  childCount: number;

  @ApiProperty({ description: 'Số điện thoại nhận mã vé bơi QR', example: '0988776655' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  customerPhone: string;

  @ApiProperty({ description: 'Họ tên khách hàng', example: 'Nguyễn Văn Bơi' })
  @IsNotEmpty({ message: 'Họ tên khách hàng không được để trống' })
  @IsString()
  customerName: string;
}

export class ScanPoolTicketDto {
  @ApiProperty({ description: 'Mã vé bơi QR (Ví dụ: POOL_ADULT_123456)', example: 'POOL_ADULT_123456' })
  @IsNotEmpty({ message: 'Mã vé bơi không được để trống' })
  @IsString()
  ticketCode: string;

  @ApiProperty({ enum: PoolCode, example: PoolCode.POOL_50M, description: 'Hồ bơi khách muốn vào bơi (POOL_50M hoặc POOL_25M - BR-31)' })
  @IsNotEmpty({ message: 'Vui lòng chọn hồ bơi' })
  @IsEnum(PoolCode, { message: 'Mã hồ bơi phải là POOL_50M hoặc POOL_25M' })
  poolCode: PoolCode;
}

export class EmergencyClosePoolDto {
  @ApiProperty({ enum: PoolCode, example: PoolCode.POOL_50M, description: 'Hồ bơi cần đóng đột xuất' })
  @IsNotEmpty({ message: 'Vui lòng chọn hồ bơi' })
  @IsEnum(PoolCode)
  poolCode: PoolCode;

  @ApiProperty({ description: 'Lý do đóng hồ khẩn cấp (thời tiết, xử lý nước, sự cố - AC-87)', example: 'Mưa bão sấm sét nguy hiểm' })
  @IsNotEmpty({ message: 'Lý do đóng hồ không được để trống' })
  @IsString()
  reason: string;
}

export class PoolCheckOutDto {
  @ApiProperty({ enum: PoolCode, example: PoolCode.POOL_50M })
  @IsNotEmpty()
  @IsEnum(PoolCode)
  poolCode: PoolCode;

  @ApiProperty({ description: 'Số lượng khách rời hồ bơi', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  swimmerCount?: number;
}
