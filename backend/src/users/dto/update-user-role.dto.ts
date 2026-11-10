import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { UserRole } from '../../common/enums';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, description: 'Vai trò mới' })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role: UserRole;

  @ApiProperty({ description: 'Danh sách quyền chi tiết cho RBAC động', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
