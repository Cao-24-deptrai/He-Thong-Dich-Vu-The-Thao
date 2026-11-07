import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { LedgerType } from '../../common/enums';

export type WalletLedgerDocument = WalletLedger & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class WalletLedger {
  @ApiProperty({ description: 'User ID owning the wallet' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ enum: LedgerType, example: LedgerType.TOPUP })
  @Prop({
    type: String,
    enum: Object.values(LedgerType),
    required: true,
  })
  type: LedgerType;

  @ApiProperty({ description: 'Transaction amount in VND (always positive)', example: 500000 })
  @Prop({ type: Number, required: true })
  amount: number;

  @ApiProperty({ description: 'Balance before transaction in VND', example: 100000 })
  @Prop({ type: Number, required: true })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after transaction in VND', example: 600000 })
  @Prop({ type: Number, required: true })
  balanceAfter: number;

  @ApiProperty({ description: 'External or internal reference ID (Booking ID, Order ID, PayOS code)', required: false })
  @Prop({ type: String })
  referenceId?: string;

  @ApiProperty({ description: 'Payment method used', example: 'VIETQR', required: false })
  @Prop({ type: String })
  paymentMethod?: string;

  @ApiProperty({ description: 'Detailed human-readable transaction description', example: 'Nạp tiền vào ví qua VietQR' })
  @Prop({ type: String, required: true })
  description: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const WalletLedgerSchema = SchemaFactory.createForClass(WalletLedger);

WalletLedgerSchema.index({ userId: 1, createdAt: -1 });
WalletLedgerSchema.index({ createdAt: -1, type: 1 });
WalletLedgerSchema.index({ referenceId: 1 });
