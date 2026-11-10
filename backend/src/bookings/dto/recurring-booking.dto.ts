import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecurringBookingDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của sân đặt định kỳ' })
  @IsNotEmpty({ message: 'Venue ID không được để trống' })
  @IsString()
  venueId: string;

  @ApiProperty({ example: '2026-11-05', description: 'Ngày bắt đầu chuỗi định kỳ (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày bắt đầu phải có định dạng YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({ example: '18:00', description: 'Giờ bắt đầu (HH:mm)' })
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ bắt đầu phải có định dạng HH:mm' })
  startTime: string;

  @ApiProperty({ example: '19:00', description: 'Giờ kết thúc (HH:mm)' })
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ kết thúc phải có định dạng HH:mm' })
  endTime: string;

  @ApiProperty({ example: 4, description: 'Số tuần đặt lặp lại (tối thiểu 2, tối đa 12 tuần theo US-027)', default: 4 })
  @Type(() => Number)
  @IsInt({ message: 'Số tuần phải là số nguyên' })
  @Min(2, { message: 'Đặt định kỳ phải từ 2 tuần trở lên' })
  @Max(12, { message: 'Đặt định kỳ tối đa 12 tuần' })
  weekCount: number;

  @ApiProperty({
    example: [2, 4],
    description: 'Danh sách các thứ trong tuần (0=Chủ nhật, 1=Thứ hai, ..., 6=Thứ bảy). Mặc định lấy thứ của startDate',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @Type(() => Number)
  daysOfWeek?: number[];

  @ApiProperty({ description: 'Tên khách hàng (cho đặt tại quầy)', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: 'SĐT khách hàng (cho đặt tại quầy)', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: 'Phương thức thanh toán (CASH, VIETQR, PAYOS)', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
