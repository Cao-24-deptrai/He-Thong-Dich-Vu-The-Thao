import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema.js';
import * as crypto from 'node:crypto';

export interface RecordAuditDto {
  actorId?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Ghi log thao tác nhạy cảm với cơ chế Hash Chain bảo vệ tính toàn vẹn (SPEC 3.8)
   */
  async record(dto: RecordAuditDto, session?: ClientSession): Promise<AuditLogDocument> {
    // 1. Lấy bản ghi log gần nhất để lấy prevHash
    const lastLog = await this.auditLogModel
      .findOne()
      .sort({ createdAt: -1 })
      .session(session || null)
      .exec();

    const prevHash = lastLog ? lastLog.hash : 'GENESIS';
    const now = new Date();

    // 2. Tính hash mới: SHA-256(prevHash + action + actorId + targetId + payload + timestamp)
    const payloadString = JSON.stringify(dto.after || {});
    const dataToHash = `${prevHash}|${dto.action}|${dto.actorId || 'SYSTEM'}|${dto.targetId}|${payloadString}|${now.toISOString()}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const log = new this.auditLogModel({
      actorId: dto.actorId && Types.ObjectId.isValid(dto.actorId) ? new Types.ObjectId(dto.actorId) : undefined,
      actorRole: dto.actorRole,
      action: dto.action,
      targetType: dto.targetType,
      targetId: dto.targetId,
      before: dto.before,
      after: dto.after,
      ip: dto.ip,
      userAgent: dto.userAgent,
      prevHash,
      hash,
      createdAt: now,
    });

    const saved = await log.save({ session });
    this.logger.log(`Audit: [${dto.action}] on ${dto.targetType}:${dto.targetId} by ${dto.actorId || 'SYSTEM'}`);
    return saved;
  }

  /**
   * Truy vấn danh sách nhật ký thao tác
   */
  async queryLogs(filter: { targetType?: string; targetId?: string; page?: number; limit?: number }) {
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.targetType) query['targetType'] = filter.targetType;
    if (filter.targetId) query['targetId'] = filter.targetId;

    const [items, total] = await Promise.all([
      this.auditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }
}
