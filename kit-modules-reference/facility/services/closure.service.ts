import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Closure, ClosureDocument } from '../schemas/closure.schema.js';
import { ResourceService } from './resource.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import { CreateClosureDto } from '@sports/contracts';

@Injectable()
export class ClosureService {
  constructor(
    @InjectModel(Closure.name) private readonly closureModel: Model<ClosureDocument>,
    private readonly resourceService: ResourceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter?: { fromAt?: Date; toAt?: Date; resourceId?: string }): Promise<ClosureDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.fromAt || filter?.toAt) {
      const dateCond: Record<string, unknown> = {};
      if (filter.fromAt) dateCond.$gte = filter.fromAt;
      if (filter.toAt) dateCond.$lte = filter.toAt;
      query.fromAt = dateCond;
    }
    if (filter?.resourceId) {
      query.$or = [
        { resourceIds: filter.resourceId.toUpperCase() },
        { affectedUnitIds: filter.resourceId.toUpperCase() },
      ];
    }

    return this.closureModel.find(query).sort({ fromAt: -1 }).exec();
  }

  async findById(id: string): Promise<ClosureDocument> {
    const doc = await this.closureModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Closure with ID ${id} not found`);
    }
    return doc;
  }

  async create(dto: CreateClosureDto, actorId?: string): Promise<ClosureDocument> {
    const fromAt = new Date(dto.fromAt);
    const toAt = new Date(dto.toAt);

    if (isNaN(fromAt.getTime()) || isNaN(toAt.getTime())) {
      throw new BadRequestException('Invalid date format for fromAt or toAt');
    }
    if (fromAt >= toAt) {
      throw new BadRequestException('fromAt must be earlier than toAt');
    }

    // Phân giải tất cả baseUnitIds từ danh sách resourceIds
    const affectedUnitSet = new Set<string>();
    const upperResourceIds = dto.resourceIds.map((r: string) => r.toUpperCase());

    for (const code of upperResourceIds) {
      try {
        const units = await this.resourceService.resolveBaseUnits(code);
        for (const u of units) {
          affectedUnitSet.add(u);
        }
      } catch {
        // Nếu code không tồn tại dạng Resource thì vẫn ghi nhận code đó
        affectedUnitSet.add(code);
      }
    }

    const created = await this.closureModel.create({
      resourceIds: upperResourceIds,
      affectedUnitIds: Array.from(affectedUnitSet),
      fromAt,
      toAt,
      reason: dto.reason,
      notes: dto.notes,
      createdBy: actorId,
    });

    await this.auditLogService.record({
      actorId,
      action: 'CLOSURE_CREATE',
      targetType: 'facility_closure',
      targetId: created.id,
      after: created.toObject() as unknown as Record<string, unknown>,
    });

    return created;
  }

  async delete(id: string, actorId?: string): Promise<void> {
    const doc = await this.findById(id);
    const beforeObj = doc.toObject();

    await this.closureModel.findByIdAndDelete(id).exec();

    await this.auditLogService.record({
      actorId,
      action: 'CLOSURE_DELETE',
      targetType: 'facility_closure',
      targetId: id,
      before: beforeObj as unknown as Record<string, unknown>,
    });
  }

  /**
   * Kiểm tra xem một tài nguyên (hoặc các base unit của nó) có bị đóng trong khoảng thời gian [fromAt, toAt) không
   */
  async isResourceClosed(resourceCode: string, fromAt: Date, toAt: Date): Promise<boolean> {
    const baseUnits = await this.resourceService.resolveBaseUnits(resourceCode);

    const closure = await this.closureModel.findOne({
      affectedUnitIds: { $in: baseUnits },
      fromAt: { $lt: toAt },
      toAt: { $gt: fromAt },
    }).exec();

    return !!closure;
  }
}
