import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema.js';
import { CreateResourceDto, UpdateResourceDto } from '@sports/contracts';
import { AuditLogService } from '../../auth/services/audit-log.service.js';

@Injectable()
export class ResourceService {
  constructor(
    @InjectModel(Resource.name) private readonly resourceModel: Model<ResourceDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter?: { kind?: string; sport?: string; status?: string }): Promise<ResourceDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.kind) query.kind = filter.kind;
    if (filter?.sport) query.sport = filter.sport;
    if (filter?.status) query.status = filter.status;

    return this.resourceModel.find(query).sort({ orderIndex: 1, code: 1 }).exec();
  }

  async findById(id: string): Promise<ResourceDocument> {
    const resource = await this.resourceModel.findById(id).exec();
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return resource;
  }

  async findByCode(code: string): Promise<ResourceDocument> {
    const resource = await this.resourceModel.findOne({ code: code.toUpperCase() }).exec();
    if (!resource) {
      throw new NotFoundException(`Resource with code ${code} not found`);
    }
    return resource;
  }

  /**
   * Phân giải danh sách baseUnitIds từ mã tài nguyên.
   * Ví dụ:
   * S11 -> ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']
   * S7-A -> ['F1', 'F2']
   * F1 -> ['F1']
   */
  async resolveBaseUnits(resourceCode: string): Promise<string[]> {
    const resource = await this.findByCode(resourceCode);
    if (resource.baseUnitIds && resource.baseUnitIds.length > 0) {
      return resource.baseUnitIds;
    }
    return [resource.code];
  }

  /**
   * Tìm tất cả các tài nguyên có thể gây xung đột lịch với một tài nguyên cho trước
   * (chia sẻ ít nhất 1 baseUnitId).
   */
  async findConflictingResources(resourceCode: string): Promise<ResourceDocument[]> {
    const baseUnits = await this.resolveBaseUnits(resourceCode);
    return this.resourceModel.find({
      baseUnitIds: { $in: baseUnits },
    }).exec();
  }

  async create(dto: CreateResourceDto, actorId?: string): Promise<ResourceDocument> {
    const upperCode = dto.code.toUpperCase();
    const existing = await this.resourceModel.findOne({ code: upperCode }).exec();
    if (existing) {
      throw new ConflictException(`Resource with code ${upperCode} already exists`);
    }

    const baseUnitIds = dto.baseUnitIds && dto.baseUnitIds.length > 0
      ? dto.baseUnitIds.map((u: string) => u.toUpperCase())
      : [upperCode];

    const created = await this.resourceModel.create({
      ...dto,
      code: upperCode,
      baseUnitIds,
    });

    await this.auditLogService.record({
      actorId,
      action: 'RESOURCE_CREATE',
      targetType: 'facility_resource',
      targetId: created.id,
      after: created.toObject() as unknown as Record<string, unknown>,
    });

    return created;
  }

  async update(id: string, dto: UpdateResourceDto, actorId?: string): Promise<ResourceDocument> {
    const resource = await this.findById(id);
    const beforeObj = resource.toObject();

    if (dto.baseUnitIds) {
      dto.baseUnitIds = dto.baseUnitIds.map((u: string) => u.toUpperCase());
    }

    Object.assign(resource, dto);
    const updated = await resource.save();

    await this.auditLogService.record({
      actorId,
      action: 'RESOURCE_UPDATE',
      targetType: 'facility_resource',
      targetId: id,
      before: beforeObj as unknown as Record<string, unknown>,
      after: updated.toObject() as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
