import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RentalPricingType, RentalTicketStatus, RentalItemCondition, PaymentMethod } from '@sports/shared';

export type RentalTicketDocument = HydratedDocument<RentalTicket>;

@Schema({ _id: false })
export class RentalTicketItem {
  @Prop({ type: Types.ObjectId, ref: 'Equipment', required: true })
  equipmentId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: 0, min: 0 })
  depositPerUnit: number;

  @Prop({ required: true, enum: RentalPricingType })
  pricingType: RentalPricingType;

  @Prop({ required: true, min: 0 })
  subtotalPrice: number;

  @Prop({ default: 0, min: 0 })
  subtotalDeposit: number;

  @Prop({ enum: RentalItemCondition })
  returnCondition?: RentalItemCondition;

  @Prop({ default: 0, min: 0 })
  penaltyFee?: number;
}

export const RentalTicketItemSchema = SchemaFactory.createForClass(RentalTicketItem);

@Schema({ timestamps: true, collection: 'rental_tickets' })
export class RentalTicket {
  @Prop({ required: true, unique: true, trim: true })
  ticketCode: string;

  @Prop({ type: Types.ObjectId, ref: 'CashierShift', required: true, index: true })
  shiftId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  cashierId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  customerPhone: string;

  @Prop({ trim: true })
  customerName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Booking', index: true })
  bookingId?: Types.ObjectId;

  @Prop({ type: [RentalTicketItemSchema], required: true })
  items: RentalTicketItem[];

  @Prop({ required: true, default: Date.now, index: true })
  rentedAt: Date;

  @Prop({ required: true, index: true })
  dueAt: Date;

  @Prop()
  returnedAt?: Date;

  @Prop({ required: true, min: 0 })
  totalRentalAmount: number;

  @Prop({ default: 0, min: 0 })
  totalDepositAmount: number;

  @Prop({ default: 0, min: 0 })
  totalPenaltyFee: number;

  @Prop({ default: 0, min: 0 })
  refundDepositAmount: number;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, enum: RentalTicketStatus, default: RentalTicketStatus.RENTING, index: true })
  status: RentalTicketStatus;

  @Prop()
  notes?: string;

  @Prop({ required: true, unique: true, trim: true })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const RentalTicketSchema = SchemaFactory.createForClass(RentalTicket);

RentalTicketSchema.index({ shiftId: 1, status: 1 });
RentalTicketSchema.index({ status: 1, dueAt: 1 });
