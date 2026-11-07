import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type GymAccessLogDocument = GymAccessLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class GymAccessLog {
  @ApiProperty({ description: 'ID khách hàng check-in / check-out' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Mã QR định danh đã quét' })
  @Prop({ type: String, required: true })
  qrCode: string;

  @ApiProperty({ description: 'Tên hội viên' })
  @Prop({ type: String, required: true })
  memberName: string;

  @ApiProperty({ enum: ['IN', 'OUT'], description: 'Chiều qua cửa xoay (IN: Vào, OUT: Ra)' })
  @Prop({ type: String, enum: ['IN', 'OUT'], required: true })
  direction: 'IN' | 'OUT';

  @ApiProperty({ description: 'Số người trong phòng gym sau lượt quét này' })
  @Prop({ type: Number, required: true })
  insideCountAfter: number;

  @ApiProperty({ description: 'Mã cổng xoay kiểm soát', default: 'GYM_TURNSTILE_01' })
  @Prop({ type: String, default: 'GYM_TURNSTILE_01' })
  gateId: string;

  @ApiProperty({ description: 'Đánh dấu có phải điều chỉnh số đếm thủ công không', default: false })
  @Prop({ type: Boolean, default: false })
  isManualOverride: boolean;

  @ApiProperty({ description: 'Lý do điều chỉnh số đếm thủ công (nếu có)', required: false })
  @Prop({ type: String })
  overrideReason?: string;

  @ApiProperty({ description: 'Thời điểm quét cửa' })
  @Prop({ type: Date, default: () => new Date() })
  timestamp: Date;
}

export const GymAccessLogSchema = SchemaFactory.createForClass(GymAccessLog);
GymAccessLogSchema.index({ timestamp: -1 });
GymAccessLogSchema.index({ userId: 1, timestamp: -1 });
GymAccessLogSchema.index({ qrCode: 1 });
