import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard, PermissionsGuard } from './roles.guard.js';
import { Role } from '@sports/shared';
import { DomainError } from '../../../common/errors/domain-error.js';

describe('RolesGuard & PermissionsGuard', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user?: Record<string, unknown>): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('RolesGuard', () => {
    it('allows access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createMockContext({ role: Role.CUSTOMER });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('always allows ADMIN access regardless of required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
      const ctx = createMockContext({ role: Role.ADMIN });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows user with matching role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER, Role.CASHIER]);
      const ctx = createMockContext({ role: Role.CASHIER });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('throws FORBIDDEN when user role does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
      const ctx = createMockContext({ role: Role.CASHIER }); // Thu ngân gọi API quản lý
      expect(() => rolesGuard.canActivate(ctx)).toThrow(DomainError);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(
        expect.objectContaining({ code: 'FORBIDDEN', httpStatus: 403 }),
      );
    });
  });

  describe('PermissionsGuard', () => {
    it('allows access when user possesses all required permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['booking.cancel.any']);
      const ctx = createMockContext({
        role: Role.MANAGER,
        permissions: ['booking.cancel.any', 'wallet.adjust'],
      });
      expect(permissionsGuard.canActivate(ctx)).toBe(true);
    });

    it('throws FORBIDDEN when user lacks one of the required permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['wallet.adjust']);
      const ctx = createMockContext({
        role: Role.CASHIER,
        permissions: ['booking.cancel.any'],
      });
      expect(() => permissionsGuard.canActivate(ctx)).toThrow(DomainError);
    });
  });
});
