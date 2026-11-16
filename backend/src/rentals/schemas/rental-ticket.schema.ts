import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  RentalPricingType,
  RentalTicketStatus,
  RentalItemCondition,
  PaymentProvider,
} from '../../common/enums';

export type RentalTicketDocument = HydratedDocument<RentalTicket>;

@Schema({ _id: false })
export class RentalTicketItem {
  @ApiProperty({ description: 'ID thiết bị' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Equipment', required: true })
  equipmentId: Types.ObjectId;

  @ApiProperty({ description: 'Mã thiết bị' })
  @Prop({ required: true })
  code: string;

  @ApiProperty({ description: 'Tên thiết bị' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Số lượng thuê', example: 2 })
  @Prop({ required: true, min: 1 })
  quantity: number;

  @ApiProperty({ description: 'Đơn giá thuê', example: 50000 })
  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @ApiProperty({ description: 'Tiền cọc trên 1 đơn vị', example: 100000 })
  @Prop({ default: 0, min: 0 })
  depositPerUnit: number;

  @ApiProperty({ enum: RentalPricingType })
  @Prop({ type: String, enum: Object.values(RentalPricingType), required: true })
  pricingType: RentalPricingType;

  @ApiProperty({ description: 'Thành tiền thuê = unitPrice * quantity' })
  @Prop({ required: true, min: 0 })
  subtotalPrice: number;

  @ApiProperty({ description: 'Tổng cọc = depositPerUnit * quantity' })
  @Prop({ default: 0, min: 0 })
  subtotalDeposit: number;

  @ApiProperty({ enum: RentalItemCondition, required: false })
  @Prop({ type: String, enum: Object.values(RentalItemCondition), required: false })
  returnCondition?: RentalItemCondition;

  @ApiProperty({ description: 'Phí phạt nếu hỏng hoặc mất', required: false, default: 0 })
  @Prop({ default: 0, min: 0 })
  penaltyFee?: number;
}

export const RentalTicketItemSchema = SchemaFactory.createForClass(RentalTicketItem);

@Schema({ timestamps: true, collection: 'rental_tickets' })
export class RentalTicket {
  @ApiProperty({ description: 'Mã phiếu thuê', example: 'RNT-20261101-0001' })
  @Prop({ required: true, unique: true, trim: true })
  ticketCode: string;

  @ApiProperty({ description: 'ID ca làm việc', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CashierShift', required: false, index: true })
  shiftId?: Types.ObjectId;

  @ApiProperty({ description: 'ID nhân viên lập phiếu' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  cashierId: Types.ObjectId;

  @ApiProperty({ description: 'ID khách hàng (nếu có tài khoản)', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  customerId?: Types.ObjectId;

  @ApiProperty({ description: 'Số điện thoại khách', example: '0911223344' })
  @Prop({ required: true, trim: true, index: true })
  customerPhone: string;

  @ApiProperty({ description: 'Tên khách hàng', required: false })
  @Prop({ trim: true })
  customerName?: string;

  @ApiProperty({ description: 'Mã đơn đặt sân nếu thuê kèm', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: false, index: true })
  bookingId?: Types.ObjectId;

  @ApiProperty({ description: 'Danh sách món thuê', type: [RentalTicketItem] })
  @Prop({ type: [RentalTicketItemSchema], required: true })
  items: RentalTicketItem[];

  @ApiProperty({ description: 'Thời điểm bắt đầu thuê' })
  @Prop({ required: true, default: Date.now, index: true })
  rentedAt: Date;

  @ApiProperty({ description: 'Hạn trả dự kiến' })
  @Prop({ required: true, index: true })
  dueAt: Date;

  @ApiProperty({ description: 'Thời điểm thực tế trả đồ', required: false })
  @Prop({ required: false })
  returnedAt?: Date;

  @ApiProperty({ description: 'Tổng tiền thuê', example: 100000 })
  @Prop({ required: true, min: 0 })
  totalRentalAmount: number;

  @ApiProperty({ description: 'Tổng tiền cọc đã thu', example: 200000 })
  @Prop({ default: 0, min: 0 })
  totalDepositAmount: number;

  @ApiProperty({ description: 'Tổng tiền phạt hư hỏng / mất', example: 0 })
  @Prop({ default: 0, min: 0 })
  totalPenaltyFee: number;

  @ApiProperty({ description: 'Tiền cọc hoàn trả lại cho khách', example: 200000 })
  @Prop({ default: 0, min: 0 })
  refundDepositAmount: number;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.CASH })
  @Prop({ type: String, enum: Object.values(PaymentProvider), default: PaymentProvider.CASH })
  paymentMethod: PaymentProvider;

  @ApiProperty({ enum: RentalTicketStatus, default: RentalTicketStatus.RENTING })
  @Prop({
    type: String,
    enum: Object.values(RentalTicketStatus),
    default: RentalTicketStatus.RENTING,
    index: true,
  })
  status: RentalTicketStatus;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @Prop()
  notes?: string;
}

export const RentalTicketSchema = SchemaFactory.createForClass(RentalTicket);

RentalTicketSchema.index({ status: 1, customerPhone: 1 });
RentalTicketSchema.index({ shiftId: 1, status: 1 });
