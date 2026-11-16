import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  actorId?: Types.ObjectId;

  @Prop()
  actorRole?: string;

  @Prop({ required: true, index: true })
  action!: string; // ví dụ: auth.role.assign, auth.user.lock, facility.price.update

  @Prop({ required: true, index: true })
  targetType!: string; // ví dụ: User, Booking, Facility, PriceRule

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true, default: 'GENESIS' })
  prevHash!: string; // Hash của bản ghi trước đó để chống can thiệp (Hash Chain)

  @Prop({ required: true, index: true })
  hash!: string; // SHA-256(prevHash + action + actorId + targetId + createdAt)

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
