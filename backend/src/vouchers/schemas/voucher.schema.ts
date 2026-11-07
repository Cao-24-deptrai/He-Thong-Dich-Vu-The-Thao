import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DiscountType } from '../../common/enums';

export type VoucherDocument = Voucher & Document;

@Schema({ timestamps: true })
export class Voucher {
  @ApiProperty({ description: 'Mã khuyến mãi duy nhất (In hoa)', example: 'PHANTA50K' })
  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @ApiProperty({ description: 'Tên / Tiêu đề chương trình khuyến mãi', example: 'Giảm 50.000đ cho lượt đặt sân' })
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết điều kiện khuyến mãi', required: false })
  @Prop({ type: String, default: '' })
  description?: string;

  @ApiProperty({ enum: DiscountType, default: DiscountType.FIXED })
  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    default: DiscountType.FIXED,
  })
  discountType: DiscountType;

  @ApiProperty({ description: 'Giá trị giảm (phần trăm % hoặc số tiền VND)', example: 50000 })
  @Prop({ type: Number, required: true, min: 0 })
  discountValue: number;

  @ApiProperty({ description: 'Giá trị đơn tối thiểu để được áp dụng (VND)', example: 200000, default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  minOrderValue: number;

  @ApiProperty({ description: 'Mức giảm tối đa khi dùng PERCENT (VND)', required: false })
  @Prop({ type: Number, min: 0 })
  maxDiscountAmount?: number;

  @ApiProperty({ description: 'Tổng ngân sách phát hành tối đa (VND, BR-13)', example: 10000000, default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  totalBudget: number; // 0 = Không giới hạn ngân sách

  @ApiProperty({ description: 'Ngân sách khuyến mãi đã sử dụng thực tế (VND, BR-13)', default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  usedBudget: number;

  @ApiProperty({ description: 'Tổng số lượt dùng tối đa toàn hệ thống', default: 100 })
  @Prop({ type: Number, default: 100, min: 1 })
  usageLimit: number;

  @ApiProperty({ description: 'Số lượt dùng thực tế toàn hệ thống', default: 0 })
  @Prop({ type: Number, default: 0, min: 0 })
  usedCount: number;

  @ApiProperty({ description: 'Số lượt dùng tối đa trên mỗi khách hàng (BR-15, AC-15)', default: 1 })
  @Prop({ type: Number, default: 1, min: 1 })
  perUserLimit: number;

  @ApiProperty({ description: 'Ngày bắt đầu có hiệu lực' })
  @Prop({ type: Date, required: true, default: Date.now })
  startDate: Date;

  @ApiProperty({ description: 'Ngày hết hạn hiệu lực' })
  @Prop({ type: Date, required: true })
  endDate: Date;

  @ApiProperty({ description: 'Danh sách môn thể thao áp dụng', example: ['FOOTBALL'], required: false })
  @Prop({ type: [String], default: [] })
  applicableSports?: string[];

  @ApiProperty({ description: 'Danh sách sân áp dụng (Nếu có)', required: false })
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Venue' }], default: [] })
  applicableVenues?: Types.ObjectId[];

  @ApiProperty({ description: 'Danh sách hạng thành viên áp dụng', example: ['GOLD', 'PLATINUM'], required: false })
  @Prop({ type: [String], default: [] })
  applicableCustomerTiers?: string[];

  @ApiProperty({ description: 'Trạng thái kích hoạt', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

// Composite indexes phục vụ truy vấn tối ưu và chống race condition
VoucherSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
VoucherSchema.index({ usedCount: 1, usageLimit: 1 });
VoucherSchema.index({ usedBudget: 1, totalBudget: 1 });
