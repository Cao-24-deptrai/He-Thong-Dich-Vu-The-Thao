import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging push token', example: 'dK1-f92jF...' })
  @IsNotEmpty({ message: 'fcmToken không được để trống' })
  @IsString()
  fcmToken: string;
}
