import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums';

export class QueryUserDto {
  @ApiProperty({ description: 'Trang hiện tại (bắt đầu từ 1)', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Số lượng mục trên mỗi trang', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ enum: UserRole, required: false, description: 'Lọc theo vai trò' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ description: 'Tìm kiếm theo số điện thoại hoặc họ tên', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
