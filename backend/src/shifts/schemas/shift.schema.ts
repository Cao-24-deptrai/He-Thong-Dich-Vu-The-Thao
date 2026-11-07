import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftStatus } from '../../common/enums';

export type ShiftDocument = Shift & Document;

@Schema({ timestamps: true })
export class Shift {
  @ApiProperty({ description: 'Shift code', example: 'CA-20261026-S1' })
  @Prop({ type: String, required: true, unique: true })
  shiftCode: string;

  @ApiProperty({ description: 'Cashier User ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  cashierId: Types.ObjectId;

  @ApiProperty({ description: 'Cashier Full Name', example: 'Trần Thị Thu Ngân' })
  @Prop({ type: String, required: true })
  cashierName: string;

  @ApiProperty({ description: 'Shift open timestamp' })
  @Prop({ type: Date, required: true, default: Date.now })
  openedAt: Date;

  @ApiProperty({ description: 'Shift close timestamp', required: false })
  @Prop({ type: Date })
  closedAt?: Date;

  @ApiProperty({ description: 'Opening cash float in VND', example: 2000000, default: 0 })
  @Prop({ type: Number, required: true, default: 0 })
  initialCash: number;

  @ApiProperty({ description: 'Expected cash calculated by system in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  expectedCash: number;

  @ApiProperty({ description: 'Actual cash counted by cashier in VND', required: false })
  @Prop({ type: Number })
  actualCash?: number;

  @ApiProperty({ description: 'Total VietQR / Card payments during shift in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  vietQrTotal: number;

  @ApiProperty({ description: 'Cash revenue collected during shift in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  cashRevenue?: number;

  @ApiProperty({ description: 'Cash refunds disbursed during shift in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  cashRefunds?: number;

  @ApiProperty({ description: 'Breakdown of 9 physical cash denominations counted', required: false })
  @Prop({ type: MongooseSchema.Types.Mixed })
  denominations?: Record<string, number>;

  @ApiProperty({ description: 'Difference between actual and expected cash in VND', default: 0 })
  @Prop({ type: Number, default: 0 })
  difference: number;

  @ApiProperty({ enum: ShiftStatus, default: ShiftStatus.OPEN })
  @Prop({
    type: String,
    enum: Object.values(ShiftStatus),
    default: ShiftStatus.OPEN,
  })
  status: ShiftStatus;

  @ApiProperty({ description: 'Shift notes or handover comments', required: false })
  @Prop({ type: String })
  notes?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

ShiftSchema.index({ cashierId: 1, openedAt: -1 });
ShiftSchema.index({ status: 1 });
