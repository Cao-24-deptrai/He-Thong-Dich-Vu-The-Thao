import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { PoolTicketType, PoolTicketStatus, PoolCode } from '../enums/pool.enum';

export type PoolTicketDocument = PoolTicket & Document;

@Schema({ timestamps: true })
export class PoolTicket {
  @ApiProperty({ description: 'ID khách hàng (nếu đã đăng nhập)' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Mã vé bơi duy nhất dạng QR' })
  @Prop({ type: String, required: true, unique: true })
  ticketCode: string;

  @ApiProperty({ enum: PoolTicketType, description: 'Loại vé: ADULT (25.000đ) hoặc CHILD (20.000đ, BR-31)' })
  @Prop({
    type: String,
    enum: Object.values(PoolTicketType),
    required: true,
  })
  ticketType: PoolTicketType;

  @ApiProperty({ description: 'Giá tiền vé bơi (VND)' })
  @Prop({ type: Number, required: true })
  price: number;

  @ApiProperty({ description: 'Ngày có giá trị sử dụng (trong ngày mua theo BR-31)' })
  @Prop({ type: Date, required: true })
  validDate: Date;

  @ApiProperty({ enum: PoolTicketStatus, default: PoolTicketStatus.UNUSED })
  @Prop({
    type: String,
    enum: Object.values(PoolTicketStatus),
    default: PoolTicketStatus.UNUSED,
  })
  status: PoolTicketStatus;

  @ApiProperty({ enum: PoolCode, description: 'Hồ bơi khách quét cổng vào (POOL_50M hoặc POOL_25M)', required: false })
  @Prop({ type: String, enum: Object.values(PoolCode) })
  scannedPoolCode?: PoolCode;

  @ApiProperty({ description: 'Thời điểm quét vé qua cổng hồ bơi', required: false })
  @Prop({ type: Date })
  scannedAt?: Date;

  @ApiProperty({ description: 'Thời điểm hoàn tiền khi hồ đóng đột xuất (AC-87)', required: false })
  @Prop({ type: Date })
  refundedAt?: Date;

  @ApiProperty({ description: 'Lý do hoàn tiền vé bơi (AC-87)', required: false })
  @Prop({ type: String })
  refundReason?: string;

  @ApiProperty({ description: 'Số điện thoại khách hàng' })
  @Prop({ type: String, required: true })
  customerPhone: string;

  @ApiProperty({ description: 'Tên khách hàng' })
  @Prop({ type: String, required: true })
  customerName: string;
}

export const PoolTicketSchema = SchemaFactory.createForClass(PoolTicket);
PoolTicketSchema.index({ validDate: 1, status: 1 });
PoolTicketSchema.index({ customerPhone: 1 });
PoolTicketSchema.index({ userId: 1 });
