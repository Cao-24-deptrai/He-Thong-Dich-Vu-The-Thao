import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class SendInvoiceDto {
  @ApiProperty({ example: '66e2c9a1b2c3d4e5f6a7b8c9', description: 'ID của đơn đặt sân' })
  @IsNotEmpty({ message: 'Booking ID không được để trống' })
  @IsString()
  bookingId: string;

  @ApiProperty({ example: 'customer@phanta.vn', description: 'Địa chỉ email nhận hóa đơn điện tử' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email: string;
}
