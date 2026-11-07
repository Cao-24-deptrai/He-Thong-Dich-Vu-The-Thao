import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class ScanGymTurnstileDto {
  @ApiProperty({ description: 'Chuỗi mã QR định danh điện tử của hội viên', example: 'PHANTA_GYM_USER01_A1B2C3D4' })
  @IsNotEmpty({ message: 'Mã QR không được để trống' })
  @IsString()
  qrCode: string;

  @ApiProperty({ enum: ['IN', 'OUT'], description: 'Chiều di chuyển qua cửa xoay: IN (Vào) hoặc OUT (Ra)', example: 'IN' })
  @IsNotEmpty({ message: 'Chiều quét qua cửa phải là IN hoặc OUT' })
  @IsIn(['IN', 'OUT'], { message: 'Chiều quét phải là IN hoặc OUT' })
  direction: 'IN' | 'OUT';

  @ApiProperty({ description: 'Mã đầu đọc / cổng xoay', example: 'GYM_TURNSTILE_01', required: false })
  @IsOptional()
  @IsString()
  gateId?: string;
}

export class OverrideGymCapacityDto {
  @ApiProperty({ description: 'Số người thực tế trong phòng gym muốn ghi đè (0 - 100)', example: 45 })
  @IsNotEmpty({ message: 'Số người không được để trống' })
  newCount: number;

  @ApiProperty({ description: 'Lý do điều chỉnh số đếm thủ công', example: 'Lệch số đếm do đầu đọc QR bị mất mạng cục bộ' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp lý do điều chỉnh' })
  @IsString()
  reason: string;
}
