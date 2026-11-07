import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ClosureReason } from '../schemas/closure.schema';

export class CreateClosureDto {
  @ApiProperty({ description: 'ID cơ sở tổ hợp' })
  @IsNotEmpty({ message: 'facilityId không được để trống' })
  @IsString()
  facilityId: string;

  @ApiProperty({ description: 'Danh sách ID hoặc mã sân bị đóng', example: ['F1', 'F2'] })
  @IsArray()
  @IsString({ each: true })
  resourceIds: string[];

  @ApiProperty({ description: 'Thời gian bắt đầu đóng ISO string', example: '2026-11-05T08:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  fromAt: string;

  @ApiProperty({ description: 'Thời gian kết thúc đóng ISO string', example: '2026-11-05T18:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  toAt: string;

  @ApiProperty({ enum: ClosureReason, example: ClosureReason.MAINTENANCE, required: false })
  @IsOptional()
  @IsEnum(ClosureReason)
  reason?: ClosureReason;

  @ApiProperty({ description: 'Ghi chú lý do đóng sân', required: false, example: 'Bảo trì hệ thống cỏ nhân tạo & đèn LED' })
  @IsOptional()
  @IsString()
  notes?: string;
}
