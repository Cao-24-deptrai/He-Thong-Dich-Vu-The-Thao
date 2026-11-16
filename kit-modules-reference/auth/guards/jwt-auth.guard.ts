import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { User, UserDocument } from '../schemas/user.schema.js';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';
import { DomainError } from '../../../common/errors/domain-error.js';
import { env } from '../../../config/env.config.js';

interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: UserDocument }>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new DomainError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.', HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.substring(7);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: env.JWT_SECRET,
      });

      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || user.status === 'LOCKED') {
        throw new DomainError('UNAUTHORIZED', 'Tài khoản không tồn tại hoặc đã bị khóa.', HttpStatus.UNAUTHORIZED);
      }

      request.user = user;
      return true;
    } catch (err) {
      if (err instanceof DomainError) throw err;
      throw new DomainError('TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', HttpStatus.UNAUTHORIZED);
    }
  }
}
