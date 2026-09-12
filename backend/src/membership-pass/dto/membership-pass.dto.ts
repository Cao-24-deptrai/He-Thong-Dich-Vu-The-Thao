import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipPassType, PaymentProvider } from '../../common/enums';

export class PurchasePassDto {
  @ApiProperty({ enum: MembershipPassType, example: MembershipPassType.MONTHLY_PASS })
  @IsEnum(MembershipPassType)
  @IsNotEmpty()
  type: MembershipPassType;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.PAYOS, required: false })
  @IsEnum(PaymentProvider)
  @IsOptional()
  paymentProvider?: PaymentProvider;
}

export class CheckInPassDto {
  @ApiProperty({ description: 'Membership pass ID to check-in (optional if qrToken is provided)', required: false })
  @IsString()
  @IsOptional()
  passId?: string;

  @ApiProperty({ description: 'Dynamic 60s QR JWT token', required: false })
  @IsString()
  @IsOptional()
  qrToken?: string;
}
