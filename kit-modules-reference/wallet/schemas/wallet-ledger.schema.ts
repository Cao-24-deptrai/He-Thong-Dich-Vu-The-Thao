import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WalletTxnType, WalletCategory } from '@sports/shared';

export type WalletLedgerDocument = HydratedDocument<WalletLedger>;

@Schema({ collection: 'wallet_ledger', timestamps: true })
export class WalletLedger {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Wallet', index: true })
  walletId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(WalletTxnType), index: true })
  type: WalletTxnType;

  @Prop({ required: true, type: Number })
  amount: number; // Biến động trên số dư khả dụng (Integer VND, có dấu)

  @Prop({ required: true, type: Number, default: 0 })
  heldDelta: number; // Biến động trên tiền tạm giữ (Integer VND, có dấu)

  @Prop({ required: true, type: Number })
  balanceAfter: number; // Số dư khả dụng sau giao dịch

  @Prop({ required: true, type: Number })
  heldAfter: number; // Tiền tạm giữ sau giao dịch

  @Prop({ enum: Object.values(WalletCategory) })
  category?: WalletCategory;

  @Prop({ required: true, trim: true })
  refType: string;

  @Prop({ required: true, trim: true })
  refId: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  idempotencyKey: string; // Khóa chống lặp giao dịch (Unique)

  @Prop({ trim: true })
  note?: string;

  @Prop({ trim: true })
  actorId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletLedgerSchema = SchemaFactory.createForClass(WalletLedger);
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });
WalletLedgerSchema.index({ walletId: 1, createdAt: -1 });
WalletLedgerSchema.index({ refType: 1, refId: 1 });
