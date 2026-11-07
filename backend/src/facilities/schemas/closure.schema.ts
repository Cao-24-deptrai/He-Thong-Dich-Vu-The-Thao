import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ClosureDocument = Closure & Document;

export enum ClosureReason {
  MAINTENANCE = 'MAINTENANCE',
  EVENT = 'EVENT',
  WEATHER = 'WEATHER',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class Closure {
  @ApiProperty({ description: 'ID cơ sở tổ hợp' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @ApiProperty({ description: 'Danh sách ID hoặc mã các sân bị đóng', example: ['F1', 'F2'] })
  @Prop({ type: [String], required: true, default: [] })
  resourceIds: string[];

  @ApiProperty({ description: 'Thời điểm bắt đầu đóng (UTC)' })
  @Prop({ type: Date, required: true, index: true })
  fromAt: Date;

  @ApiProperty({ description: 'Thời điểm kết thúc đóng (UTC)' })
  @Prop({ type: Date, required: true, index: true })
  toAt: Date;

  @ApiProperty({ enum: ClosureReason, example: ClosureReason.MAINTENANCE })
  @Prop({ type: String, enum: Object.values(ClosureReason), default: ClosureReason.MAINTENANCE })
  reason: ClosureReason;

  @ApiProperty({ description: 'Ghi chú lý do chi tiết', required: false })
  @Prop({ type: String })
  notes?: string;

  @ApiProperty({ description: 'ID người tạo lệnh đóng sân', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @ApiProperty({ description: 'Trạng thái hoạt động của lịch đóng', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ClosureSchema = SchemaFactory.createForClass(Closure);
ClosureSchema.index({ facilityId: 1, fromAt: 1, toAt: 1 });
ClosureSchema.index({ resourceIds: 1, fromAt: 1, toAt: 1 });
