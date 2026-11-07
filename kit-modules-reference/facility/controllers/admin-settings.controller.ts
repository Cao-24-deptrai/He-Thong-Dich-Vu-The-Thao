import { Controller, Patch, Put, Get, Param, Body } from '@nestjs/common';
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { SettingsService } from '../services/settings.service.js';
import { z } from 'zod';

const updateSettingSchema = z.object({
  value: z.unknown(),
  reason: z.string().optional(),
});

@Controller('admin/settings')
@RequireRoles(Role.ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    const data = this.settingsService.getAll();
    return { data };
  }

  @Patch(':key')
  @Put(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: unknown; reason?: string },
    @CurrentUser('sub') actorId?: string,
  ) {
    const validated = updateSettingSchema.parse(body);
    const updated = await this.settingsService.set(key, validated.value, actorId);
    return { data: updated };
  }
}
