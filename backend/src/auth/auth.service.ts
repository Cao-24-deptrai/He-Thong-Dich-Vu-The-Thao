import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Số điện thoại đã được đăng ký');
    }

    const user = await this.usersService.create({
      phone: dto.phone,
      password: dto.password,
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role || UserRole.CUSTOMER,
    });

    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không chính xác');
    }

    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
