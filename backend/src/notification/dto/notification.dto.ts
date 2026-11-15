import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '../../common/enums';

export class SendBroadcastNotificationDto {
  @ApiProperty({ example: '🔥 Ưu đãi giờ vàng: Giảm 20% toàn bộ cụm sân Pickleball!' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Áp dụng cho các khung giờ từ 13:00 đến 16:00 hôm nay. Nhanh tay đặt chỗ!' })
  @IsString()
  body: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.PROMOTION })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, isArray: true, example: [NotificationChannel.IN_APP, NotificationChannel.FCM] })
  @IsArray()
  channels: NotificationChannel[];

  @ApiProperty({ example: 'ALL', required: false, description: 'ALL, GOLD_MEMBERS, TODAY_BOOKINGS' })
  @IsOptional()
  @IsString()
  targetAudience?: string;
}

export class SendDirectNotificationDto {
  @ApiProperty({ example: '65b1234567890abcdef' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Biến động số dư ví Phanta Pay' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Bạn vừa nạp thành công +200,000 đ vào ví.' })
  @IsString()
  body: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.WALLET_BALANCE })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, default: NotificationChannel.IN_APP })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty({ required: false })
  @IsOptional()
  data?: Record<string, any>;
}
