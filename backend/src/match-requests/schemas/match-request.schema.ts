import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { MatchRequestStatus } from '../../common/enums';

export type MatchRequestDocument = MatchRequest & Document;

@Schema({ timestamps: true })
export class MatchRequest {
  @ApiProperty({ description: 'Creator user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @ApiProperty({ description: 'Sport type', example: 'FOOTBALL' })
  @Prop({ type: String, required: true })
  sportType: string;

  @ApiProperty({ description: 'Match date and time', example: '2026-09-20T19:00:00.000Z' })
  @Prop({ type: Date, required: true })
  matchDate: Date;

  @ApiProperty({ description: 'Location description or notes', example: 'Sân bóng Mỹ Đình sân 5, cần 2 người đá tiền vệ', required: false })
  @Prop({ type: String })
  locationDescription?: string;

  @ApiProperty({ description: 'Number of additional players needed', example: 2 })
  @Prop({ type: Number, required: true })
  slotsNeeded: number;

  @ApiProperty({ description: 'Number of slots already filled', default: 0 })
  @Prop({ type: Number, default: 0 })
  slotsFilled: number;

  @ApiProperty({ enum: MatchRequestStatus, default: MatchRequestStatus.OPEN })
  @Prop({
    type: String,
    enum: Object.values(MatchRequestStatus),
    default: MatchRequestStatus.OPEN,
  })
  status: MatchRequestStatus;

  @ApiProperty({ description: 'List of users who joined this match', type: [String], required: false })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  joinedUserIds: Types.ObjectId[];
}

export const MatchRequestSchema = SchemaFactory.createForClass(MatchRequest);
MatchRequestSchema.index({ creatorId: 1 });
MatchRequestSchema.index({ matchDate: 1, status: 1 });
