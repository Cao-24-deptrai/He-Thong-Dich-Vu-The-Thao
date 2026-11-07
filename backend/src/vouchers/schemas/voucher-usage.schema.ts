import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type VoucherUsageDocument = VoucherUsage & Document;

export enum VoucherUsageStatus {
  APPLIED = 'APPLIED',       // Đang áp dụng cho đơn (ví dụ đơn HELD đang chờ thanh toán)
  COMMITTED = 'COMMITTED',   // Đã thanh toán thành công, chính thức chốt lượt
  ROLLED_BACK = 'ROLLED_BACK', // Đơn bị hủy / hết hạn, hoàn lại ngân sách & lượt dùng
}

@Schema({ timestamps: true })
export class VoucherUsage {
  @ApiProperty({ description: 'ID của Voucher' })
  @Prop({ type: Types.ObjectId, ref: 'Voucher', required: true, index: true })
  voucherId: Types.ObjectId;

  @ApiProperty({ description: 'Mã code voucher' })
  @Prop({ type: String, required: true, uppercase: true, index: true })
  voucherCode: string;

  @ApiProperty({ description: 'ID của khách hàng sử dụng' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'ID của đơn đặt sân (nếu có)' })
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: false, index: true })
  bookingId?: Types.ObjectId;

  @ApiProperty({ description: 'ID của đơn hàng POS / Canteen / Gym (nếu có)' })
  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  orderId?: Types.ObjectId;

  @ApiProperty({ description: 'Số tiền giảm giá thực tế (VND)' })
  @Prop({ type: Number, required: true, min: 0 })
  discountAmount: number;

  @ApiProperty({ description: 'Giá trị gốc của đơn hàng trước giảm giá (VND)' })
  @Prop({ type: Number, required: true, min: 0 })
  originalAmount: number;

  @ApiProperty({ description: 'Giá trị thanh toán cuối cùng sau khi giảm giá (VND)' })
  @Prop({ type: Number, required: true, min: 0 })
  finalAmount: number;

  @ApiProperty({ enum: VoucherUsageStatus, default: VoucherUsageStatus.APPLIED })
  @Prop({
    type: String,
    enum: Object.values(VoucherUsageStatus),
    default: VoucherUsageStatus.APPLIED,
    index: true,
  })
  status: VoucherUsageStatus;

  @ApiProperty({ description: 'Thời điểm áp dụng voucher' })
  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;
}

export const VoucherUsageSchema = SchemaFactory.createForClass(VoucherUsage);

// Composite indexes phục vụ kiểm tra perUserLimit và race condition
VoucherUsageSchema.index({ voucherId: 1, userId: 1, status: 1 });
VoucherUsageSchema.index({ bookingId: 1, status: 1 });
