import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from '../schemas/setting.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

export const DEFAULT_FACILITY_SETTINGS: Record<string, unknown> = {
  'booking.slotMinutes': 30,
  'booking.holdMinutes': 10,
  'booking.depositPercent': 30,
  'booking.maxAdvanceDays': 14,
  'booking.allowOverlapCheck': true,
  'gym.capacity': 100,
  'gym.dailyTicketPrice': 60000,
  'gaming.prepayEnabled': true,
  'gaming.defaultHourlyRate': 15000,
  'gaming.vipHourlyRate': 25000,
  'wallet.minTopup': 20000,
  'wallet.maxBalance': 50000000,
  'invoice.vatRate': 8,
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, unknown>();

  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<SettingDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    try {
      const allSettings = await this.settingModel.find().lean().exec();
      const existingKeys = new Set<string>();

      for (const item of allSettings) {
        this.cache.set(item.key, item.value);
        existingKeys.add(item.key);
      }

      // Seed default settings if missing
      for (const [key, value] of Object.entries(DEFAULT_FACILITY_SETTINGS)) {
        if (!existingKeys.has(key)) {
          await this.settingModel.updateOne(
            { key },
            { $setOnInsert: { key, value, version: 1 } },
            { upsert: true },
          );
          this.cache.set(key, value);
        }
      }
      this.logger.log(`Initialized facility settings cache with ${this.cache.size} entries.`);
    } catch (err) {
      this.logger.warn(`Failed to initialize settings from database: ${(err as Error).message}. Using in-memory defaults.`);
      for (const [key, value] of Object.entries(DEFAULT_FACILITY_SETTINGS)) {
        if (!this.cache.has(key)) {
          this.cache.set(key, value);
        }
      }
    }
  }

  get<T = unknown>(key: string, fallback?: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    if (fallback !== undefined) {
      return fallback;
    }
    return DEFAULT_FACILITY_SETTINGS[key] as T;
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.cache.entries()) {
      result[key] = value;
    }
    return result;
  }

  async set(key: string, value: unknown, actorId?: string): Promise<SettingDocument> {
    const previous = await this.settingModel.findOne({ key }).exec();
    const oldValue = previous?.value ?? this.cache.get(key);

    const doc = await this.settingModel.findOneAndUpdate(
      { key },
      {
        $set: { value, updatedBy: actorId },
        $inc: { version: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    this.cache.set(key, value);

    await this.auditLogService.record({
      actorId,
      action: 'SETTING_UPDATE',
      targetType: 'setting',
      targetId: key,
      before: { key, value: oldValue },
      after: { key, value },
    });

    return doc;
  }
}
