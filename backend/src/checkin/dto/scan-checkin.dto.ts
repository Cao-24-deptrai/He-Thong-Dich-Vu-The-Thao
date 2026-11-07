import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ScanCheckinDto {
  @ApiProperty({ description: 'Chuỗi JWT động từ mã QR vé của khách (sống 60s)', required: false })
  @IsOptional()
  @IsString()
  qrToken?: string;

  @ApiProperty({ description: 'Mã vé check-in (ví dụ: PHANTA-BK1001)', required: false })
  @IsOptional()
  @IsString()
  checkInCode?: string;
}
