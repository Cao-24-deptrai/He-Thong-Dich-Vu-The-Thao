import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CashierWalkInDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của sân đặt' })
  @IsNotEmpty({ message: 'Venue ID không được để trống' })
  @IsString()
  venueId: string;

  @ApiProperty({ example: '2026-10-26', description: 'Ngày đặt YYYY-MM-DD' })
  @IsNotEmpty({ message: 'Ngày đặt không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày đặt phải có định dạng YYYY-MM-DD' })
  bookingDate: string;

  @ApiProperty({ example: '17:30', description: 'Giờ bắt đầu HH:mm' })
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ bắt đầu phải có định dạng HH:mm' })
  startTime: string;

  @ApiProperty({ example: '19:00', description: 'Giờ kết thúc HH:mm' })
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ kết thúc phải có định dạng HH:mm' })
  endTime: string;

  @ApiProperty({ example: 'Anh Tuấn (Khách vãng lai)', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: 'khachhang@gmail.com', description: 'Email nhận hóa đơn điện tử VAT', required: false })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({ example: 'CASH', description: 'Phương thức thanh toán: CASH | VIETQR | WALLET', default: 'CASH' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Danh sách dụng cụ thuê kèm tại quầy',
    example: [{ itemId: 'ball-1', name: 'Bóng Molten Vantaggio 5000', quantity: 1, price: 50000 }],
    required: false,
  })
  @IsOptional()
  @IsArray()
  equipmentRentals?: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;

  @ApiProperty({ description: 'Tiền giảm giá khuyến mại (VNĐ)', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiProperty({ description: 'Check-in ngay vào sân (Mở cổng luôn)', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  checkInImmediately?: boolean;

  @ApiProperty({ example: 'Khách thanh toán tiền mặt tại quầy', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
