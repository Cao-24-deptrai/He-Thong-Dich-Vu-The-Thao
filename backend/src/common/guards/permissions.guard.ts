import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User authentication required');
    }

    // ADMIN và OWNER có toàn quyền trên toàn hệ thống
    if (user.role === UserRole.ADMIN || user.role === UserRole.OWNER) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'PERMISSION_DENIED',
        message: `Quyền truy cập bị từ chối: Thiếu quyền [${requiredPermissions.join(', ')}]`,
        requiredPermissions,
      });
    }

    return true;
  }
}
