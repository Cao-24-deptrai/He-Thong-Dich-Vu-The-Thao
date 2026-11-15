import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsOptional } from 'class-validator';

export class WalkInBookingDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của sân/vị trí đặt' })
  @IsNotEmpty({ message: 'Venue ID không được để trống' })
  @IsString()
  venueId: string;

  @ApiProperty({ example: '2026-09-20', description: 'Ngày đặt (định dạng YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày đặt không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày đặt phải có định dạng YYYY-MM-DD' })
  bookingDate: string;

  @ApiProperty({ example: '18:00', description: 'Giờ bắt đầu (định dạng HH:mm)' })
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ bắt đầu phải có định dạng HH:mm' })
  startTime: string;

  @ApiProperty({ example: '19:00', description: 'Giờ kết thúc (định dạng HH:mm)' })
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ kết thúc phải có định dạng HH:mm' })
  endTime: string;

  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '0912345678', description: 'SĐT khách vãng lai (không bắt buộc)', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: 'CASH', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: 'Ghi chú đặt sân', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
