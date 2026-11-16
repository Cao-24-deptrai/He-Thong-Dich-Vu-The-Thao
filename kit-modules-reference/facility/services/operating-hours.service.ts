import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OperatingHours, OperatingHoursDocument, WeeklyScheduleItem, SpecialDateItem } from '../schemas/operating-hours.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

export const DEFAULT_WEEKLY_SCHEDULES: WeeklyScheduleItem[] = [
  { dayOfWeek: 0, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Chủ Nhật
  { dayOfWeek: 1, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 2
  { dayOfWeek: 2, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 3
  { dayOfWeek: 3, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 4
  { dayOfWeek: 4, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 5
  { dayOfWeek: 5, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 6
  { dayOfWeek: 6, openTime: '06:00', closeTime: '23:00', isOpen: true }, // Thứ 7
];

@Injectable()
export class OperatingHoursService implements OnModuleInit {
  private readonly logger = new Logger(OperatingHoursService.name);

  constructor(
    @InjectModel(OperatingHours.name) private readonly operatingHoursModel: Model<OperatingHoursDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.operatingHoursModel.findOne({ facilityId: 'MAIN' }).exec();
    if (!existing) {
      await this.operatingHoursModel.create({
        facilityId: 'MAIN',
        weeklySchedules: DEFAULT_WEEKLY_SCHEDULES,
        specialDates: [],
      });
      this.logger.log('Seeded default operating hours (06:00 - 23:00 daily).');
    }
  }

  async getOperatingHours(): Promise<OperatingHoursDocument> {
    let doc = await this.operatingHoursModel.findOne({ facilityId: 'MAIN' }).exec();
    if (!doc) {
      doc = await this.operatingHoursModel.create({
        facilityId: 'MAIN',
        weeklySchedules: DEFAULT_WEEKLY_SCHEDULES,
        specialDates: [],
      });
    }
    return doc;
  }

  async updateWeeklySchedules(schedules: WeeklyScheduleItem[], actorId?: string): Promise<OperatingHoursDocument> {
    const doc = await this.getOperatingHours();
    const beforeObj = doc.toObject();

    doc.weeklySchedules = schedules;
    doc.updatedBy = actorId;
    const updated = await doc.save();

    await this.auditLogService.record({
      actorId,
      action: 'OPERATING_HOURS_UPDATE_WEEKLY',
      targetType: 'operating_hours',
      targetId: 'MAIN',
      before: beforeObj as unknown as Record<string, unknown>,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async setSpecialDate(item: SpecialDateItem, actorId?: string): Promise<OperatingHoursDocument> {
    const doc = await this.getOperatingHours();
    const beforeObj = doc.toObject();

    const index = doc.specialDates.findIndex((s) => s.date === item.date);
    if (index >= 0) {
      doc.specialDates[index] = item;
    } else {
      doc.specialDates.push(item);
    }

    doc.updatedBy = actorId;
    const updated = await doc.save();

    await this.auditLogService.record({
      actorId,
      action: 'OPERATING_HOURS_SET_SPECIAL_DATE',
      targetType: 'operating_hours',
      targetId: 'MAIN',
      before: beforeObj as unknown as Record<string, unknown>,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async removeSpecialDate(date: string, actorId?: string): Promise<OperatingHoursDocument> {
    const doc = await this.getOperatingHours();
    const beforeObj = doc.toObject();

    doc.specialDates = doc.specialDates.filter((s) => s.date !== date);
    doc.updatedBy = actorId;
    const updated = await doc.save();

    await this.auditLogService.record({
      actorId,
      action: 'OPERATING_HOURS_REMOVE_SPECIAL_DATE',
      targetType: 'operating_hours',
      targetId: 'MAIN',
      before: beforeObj as unknown as Record<string, unknown>,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
