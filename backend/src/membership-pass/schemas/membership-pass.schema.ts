import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipPassType } from '../../common/enums';

export type MembershipPassDocument = MembershipPass & Document;

@Schema({ timestamps: true })
export class MembershipPass {
  @ApiProperty({ description: 'Member user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ enum: MembershipPassType, example: MembershipPassType.MONTHLY_PASS })
  @Prop({
    type: String,
    enum: Object.values(MembershipPassType),
    required: true,
  })
  type: MembershipPassType;

  @ApiProperty({ description: 'Total check-ins allowed', required: false })
  @Prop({ type: Number })
  totalCheckIns?: number;

  @ApiProperty({ description: 'Remaining check-ins', required: false })
  @Prop({ type: Number })
  remainingCheckIns?: number;

  @ApiProperty({ description: 'Pass expiration date', required: false })
  @Prop({ type: Date })
  expiryDate?: Date;
}

export const MembershipPassSchema = SchemaFactory.createForClass(MembershipPass);
MembershipPassSchema.index({ userId: 1 });
