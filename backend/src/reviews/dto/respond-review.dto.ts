import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RespondReviewDto {
  @ApiProperty({
    description: 'Nội dung phản hồi của nhân viên quầy / quản trị',
    example: 'Cảm ơn quý khách đã đóng góp ý kiến. Tổ hợp đã tiến hành bảo trì hệ thống chiếu sáng!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
