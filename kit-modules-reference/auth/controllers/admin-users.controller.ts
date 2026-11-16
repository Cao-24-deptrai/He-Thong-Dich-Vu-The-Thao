import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../services/auth.service.js';
import { AuditLogService } from '../services/audit-log.service.js';
import { CurrentUser, RequireRoles } from '../decorators/auth.decorators.js';
import { User, UserDocument } from '../schemas/user.schema.js';
import { Role } from '@sports/shared';
import {
  AssignRoleRequestSchema,
  LockUserRequestSchema,
} from '@sports/contracts';

@RequireRoles(Role.MANAGER, Role.ADMIN)
@Controller('api/v1/admin')
export class AdminUsersController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('users')
  async listUsers(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (role) query['role'] = role;
    if (search) {
      query['$or'] = [
        { phone: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      items: users.map((u) => this.authService.mapToProfile(u)),
      total,
      page,
      limit,
    };
  }

  @Patch('users/:id/role')
  async assignRole(
    @Param('id') targetUserId: string,
    @CurrentUser() actor: UserDocument,
    @Body() rawBody: unknown,
  ) {
    const dto = AssignRoleRequestSchema.parse(rawBody);
    return await this.authService.assignRole(targetUserId, dto, actor);
  }

  @Post('users/:id/lock')
  async lockUser(
    @Param('id') targetUserId: string,
    @CurrentUser() actor: UserDocument,
    @Body() rawBody: unknown,
  ) {
    const dto = LockUserRequestSchema.parse(rawBody);
    return await this.authService.lockUser(targetUserId, dto, actor);
  }

  @Post('users/:id/unlock')
  async unlockUser(
    @Param('id') targetUserId: string,
    @CurrentUser() actor: UserDocument,
  ) {
    return await this.authService.unlockUser(targetUserId, actor);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10)));
    return await this.auditLogService.queryLogs({ targetType, targetId, page, limit });
  }
}
