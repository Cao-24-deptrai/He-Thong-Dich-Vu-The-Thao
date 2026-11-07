import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { GymPlanType, GymQrStatus } from '../enums/gym-plan-type.enum';

export type GymQrCredentialDocument = GymQrCredential & Document;

@Schema({ timestamps: true })
export class GymQrCredential {
  @ApiProperty({ description: 'ID khách hàng sở hữu mã QR định danh duy nhất' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Chuỗi mã QR định danh điện tử cố định (BR-26, BR-30a)' })
  @Prop({ type: String, required: true, unique: true })
  qrCode: string;

  @ApiProperty({ enum: GymQrStatus, default: GymQrStatus.ACTIVE })
  @Prop({
    type: String,
    enum: Object.values(GymQrStatus),
    default: GymQrStatus.ACTIVE,
  })
  status: GymQrStatus;

  @ApiProperty({ description: 'Thời điểm hết hạn của gói tập hiệu lực' })
  @Prop({ type: Date, required: true })
  activeUntil: Date;

  @ApiProperty({ enum: GymPlanType })
  @Prop({
    type: String,
    enum: Object.values(GymPlanType),
    required: true,
  })
  currentPlanCode: GymPlanType;

  @ApiProperty({ description: 'Thời điểm cấp mã QR lần đầu tiên' })
  @Prop({ type: Date, default: () => new Date() })
  issuedAt: Date;

  @ApiProperty({ description: 'Thời điểm gia hạn hoặc nâng cấp gần nhất' })
  @Prop({ type: Date, default: () => new Date() })
  lastRenewedAt: Date;
}

export const GymQrCredentialSchema = SchemaFactory.createForClass(GymQrCredential);
GymQrCredentialSchema.index({ status: 1 });
GymQrCredentialSchema.index({ activeUntil: 1 });
