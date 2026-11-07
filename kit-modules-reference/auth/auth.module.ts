import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { User, UserSchema } from './schemas/user.schema.js';
import { UserSession, UserSessionSchema } from './schemas/user-session.schema.js';
import { OtpChallenge, OtpChallengeSchema } from './schemas/otp-challenge.schema.js';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema.js';

import { PasswordService } from './services/password.service.js';
import { OtpService } from './services/otp.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { AuthService } from './services/auth.service.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard, PermissionsGuard } from './guards/roles.guard.js';

import { AuthController } from './controllers/auth.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { env } from '../../config/env.config.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, UsersController, AdminUsersController],
  providers: [
    PasswordService,
    OtpService,
    AuditLogService,
    AuthService,
    // Mặc định bảo vệ toàn bộ API bằng JwtAuthGuard, RolesGuard và PermissionsGuard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [
    AuthService,
    OtpService,
    AuditLogService,
    PasswordService,
    MongooseModule,
  ],
})
export class AuthModule {}
