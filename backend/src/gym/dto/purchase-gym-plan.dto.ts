import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';
import { GymPlanType } from '../enums/gym-plan-type.enum';

export class PurchaseGymPlanDto {
  @ApiProperty({ enum: GymPlanType, example: GymPlanType.MONTH_1, description: 'Mã gói tập Gym (DAY_1, MONTH_1, MONTH_3, MONTH_6)' })
  @IsNotEmpty({ message: 'Vui lòng chọn gói tập Gym' })
  @IsEnum(GymPlanType, { message: 'Gói tập Gym không hợp lệ. Chỉ chấp nhận DAY_1, MONTH_1, MONTH_3, MONTH_6 (BR-27)' })
  planCode: GymPlanType;

  @ApiProperty({ description: 'Đánh dấu nâng cấp từ gói cũ đang còn hạn (BR-28)', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isUpgrade?: boolean;

  @ApiProperty({ description: 'Mã giao dịch thanh toán liên kết', required: false })
  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class CalculateUpgradeCreditDto {
  @ApiProperty({ enum: GymPlanType, example: GymPlanType.MONTH_3, description: 'Gói tập mục tiêu muốn nâng cấp lên' })
  @IsNotEmpty({ message: 'Vui lòng chọn gói tập mục tiêu' })
  @IsEnum(GymPlanType, { message: 'Gói tập mục tiêu không hợp lệ' })
  targetPlanCode: GymPlanType;
}
