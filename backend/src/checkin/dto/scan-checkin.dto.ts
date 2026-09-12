import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ScanCheckinDto {
  @ApiProperty({ description: 'Chuỗi JWT động từ mã QR vé của khách (sống 60s)' })
  @IsNotEmpty({ message: 'QR Token không được để trống' })
  @IsString()
  qrToken: string;
}
