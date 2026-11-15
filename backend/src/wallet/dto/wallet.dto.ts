import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletTxnType, WalletCategory } from '../../common/enums';

export class TopupWalletDto {
  @ApiProperty({ description: 'Số tiền cần nạp (VND, tối thiểu 10,000đ)', example: 200000 })
  @IsNumber()
  @Min(10000)
  amount: number;

  @ApiProperty({ description: 'Mã giao dịch tham chiếu / Idempotency key', example: 'TOPUP-USER123-1700000000' })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Ghi chú giao dịch', required: false, example: 'Nạp tiền qua VietQR' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class WalletPayDto {
  @ApiProperty({ description: 'Số tiền cần thanh toán', example: 150000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: 'Hạng mục thanh toán', enum: WalletCategory, example: WalletCategory.COURT })
  @IsEnum(WalletCategory)
  category: WalletCategory;

  @ApiProperty({ description: 'Loại tài nguyên tham chiếu', example: 'BOOKING' })
  @IsString()
  refType: string;

  @ApiProperty({ description: 'ID tài nguyên tham chiếu', example: '65b1234567890abcdef' })
  @IsString()
  refId: string;

  @ApiProperty({ description: 'Idempotency key chống trừ đúp', example: 'PAY-BK-12345' })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class WalletHoldDto {
  @ApiProperty({ description: 'Số tiền cần tạm giữ cọc (Ví dụ cọc máy gaming)', example: 50000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: 'Loại tài nguyên', example: 'GAMING_SESSION' })
  @IsString()
  refType: string;

  @ApiProperty({ description: 'ID phiên hoặc giao dịch', example: 'SESSION-PC01' })
  @IsString()
  refId: string;

  @ApiProperty({ description: 'Idempotency key', example: 'HOLD-PC01-123' })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class WalletReleaseDto {
  @ApiProperty({ description: 'Số tiền giải tỏa', example: 50000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: 'Loại tài nguyên', example: 'GAMING_SESSION' })
  @IsString()
  refType: string;

  @ApiProperty({ description: 'ID phiên', example: 'SESSION-PC01' })
  @IsString()
  refId: string;

  @ApiProperty({ description: 'Idempotency key', example: 'REL-PC01-123' })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustWalletDto {
  @ApiProperty({ description: 'User ID của ví cần điều chỉnh', example: '65b1234567890' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Số tiền điều chỉnh (dương để cộng, âm để trừ)', example: 50000 })
  @IsNumber()
  amountDelta: number;

  @ApiProperty({ description: 'Lý do điều chỉnh kiểm toán', example: 'Bù trừ số dư lỗi hệ thống' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Idempotency key', example: 'ADJ-ADMIN-123' })
  @IsString()
  idempotencyKey: string;
}
