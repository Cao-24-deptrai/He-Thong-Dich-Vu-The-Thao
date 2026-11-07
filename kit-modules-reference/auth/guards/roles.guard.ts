import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@sports/shared';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/auth.decorators.js';
import { DomainError } from '../../../common/errors/domain-error.js';
import { UserDocument } from '../schemas/user.schema.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserDocument }>();
    const user = request.user;

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 'Chưa xác thực người dùng.', HttpStatus.UNAUTHORIZED);
    }

    // ADMIN luôn có mọi quyền
    if (user.role === Role.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new DomainError(
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserDocument }>();
    const user = request.user;

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 'Chưa xác thực người dùng.', HttpStatus.UNAUTHORIZED);
    }

    // ADMIN luôn có mọi quyền
    if (user.role === Role.ADMIN) {
      return true;
    }

    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      throw new DomainError(
        'FORBIDDEN',
        'Tài khoản thiếu quyền hạn yêu cầu để thực hiện thao tác này.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
