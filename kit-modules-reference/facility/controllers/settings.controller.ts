import { Controller, Get } from '@nestjs/common';
import { Public } from '../../auth/index.js';
import { SettingsService } from '../services/settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  getSettings() {
    return { data: this.settingsService.getAll() };
  }
}
