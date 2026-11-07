import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { CurrentUser, RequireRoles } from '../decorators/auth.decorators.js';
import { UserDocument } from '../schemas/user.schema.js';
import { Role } from '@sports/shared';
import {
  UpdateProfileRequestSchema,
  QuickCreateUserRequestSchema,
} from '@sports/contracts';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  getProfile(@CurrentUser() user: UserDocument) {
    return this.authService.mapToProfile(user);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: UserDocument, @Body() rawBody: unknown) {
    const dto = UpdateProfileRequestSchema.parse(rawBody);

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.email) user.email = dto.email;
    if (dto.invoiceInfo) {
      user.invoiceInfo = { ...user.invoiceInfo, ...dto.invoiceInfo };
    }
    if (dto.consents) {
      user.consents = {
        ...user.consents,
        ...dto.consents,
        consentedAt: new Date(),
      };
    }

    await user.save();
    return this.authService.mapToProfile(user);
  }

  @RequireRoles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
  @Post('quick-create')
  async quickCreateCustomer(
    @CurrentUser() actor: UserDocument,
    @Body() rawBody: unknown,
  ) {
    const dto = QuickCreateUserRequestSchema.parse(rawBody);
    return await this.authService.quickCreateCustomer(dto, actor);
  }
}
