import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { GymPlanType } from '../enums/gym-plan-type.enum';

export type GymSubscriptionDocument = GymSubscription & Document;

@Schema({ timestamps: true })
export class GymSubscription {
  @ApiProperty({ description: 'ID khách hàng' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ enum: GymPlanType })
  @Prop({
    type: String,
    enum: Object.values(GymPlanType),
    required: true,
  })
  planCode: GymPlanType;

  @ApiProperty({ description: 'Tên gói tập' })
  @Prop({ type: String, required: true })
  planName: string;

  @ApiProperty({ description: 'Thời lượng gói tập (ngày)' })
  @Prop({ type: Number, required: true })
  durationDays: number;

  @ApiProperty({ description: 'Giá gốc của gói tập niêm yết (VND)' })
  @Prop({ type: Number, required: true })
  originalPrice: number;

  @ApiProperty({ description: 'Số tiền khấu trừ từ ngày chưa dùng của gói cũ (BR-28)', default: 0 })
  @Prop({ type: Number, default: 0 })
  creditDeducted: number;

  @ApiProperty({ description: 'Số tiền thực tế thanh toán (VND)' })
  @Prop({ type: Number, required: true })
  paidAmount: number;

  @ApiProperty({ description: 'Ngày bắt đầu tính gói' })
  @Prop({ type: Date, required: true })
  startDate: Date;

  @ApiProperty({ description: 'Ngày kết thúc gói' })
  @Prop({ type: Date, required: true })
  endDate: Date;

  @ApiProperty({ description: 'Đánh dấu có phải là giao dịch nâng cấp gói không', default: false })
  @Prop({ type: Boolean, default: false })
  isUpgrade: boolean;

  @ApiProperty({ description: 'Trạng thái gói', default: 'ACTIVE' })
  @Prop({ type: String, enum: ['ACTIVE', 'EXPIRED', 'UPGRADED'], default: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Mã giao dịch thanh toán', required: false })
  @Prop({ type: String })
  paymentId?: string;
}

export const GymSubscriptionSchema = SchemaFactory.createForClass(GymSubscription);
GymSubscriptionSchema.index({ userId: 1, createdAt: -1 });
GymSubscriptionSchema.index({ status: 1 });
