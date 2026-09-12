import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, MinLength, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums';

export class RegisterDto {
  @ApiProperty({ description: 'Số điện thoại của người dùng (10 chữ số VN)', example: '0912345678' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  phone: string;

  @ApiProperty({ description: 'Mật khẩu tối thiểu 6 ký tự', example: 'Password123' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ', example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Email liên hệ', example: 'nguyenvana@gmail.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER, required: false })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;
}
