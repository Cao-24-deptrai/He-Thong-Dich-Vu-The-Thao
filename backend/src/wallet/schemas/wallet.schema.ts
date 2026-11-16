import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WalletStatus } from '../../common/enums';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ collection: 'wallets', timestamps: true })
export class Wallet {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Number, default: 0, index: true })
  balance: number; // Số dư khả dụng (VND >= 0)

  @Prop({ required: true, type: Number, default: 0 })
  held: number; // Tiền đang tạm giữ cọc (VND >= 0)

  @Prop({ required: true, enum: WalletStatus, default: WalletStatus.ACTIVE })
  status: WalletStatus;

  @Prop({ required: true, default: 0 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
