import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ManualCheckinDto {
  @ApiProperty({ description: 'ID của đơn đặt chỗ (Booking ID)', example: '672589abcdef1234567890ab' })
  @IsNotEmpty({ message: 'Booking ID không được để trống' })
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Ghi chú lý do check-in thủ công (VD: Khách hết pin, xác minh CCCD)',
    required: false,
    example: 'Khách hết pin điện thoại, đã xác minh SĐT và CCCD',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class LookupCheckinDto {
  @ApiProperty({ description: 'Số điện thoại hoặc mã đặt chỗ (bookingCode / ticketCode)', required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ description: 'Ngày cần tìm (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
