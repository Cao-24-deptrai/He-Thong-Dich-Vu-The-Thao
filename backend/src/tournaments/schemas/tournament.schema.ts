import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { TournamentType, TournamentFormat, TournamentStatus } from '../../common/enums';

export type TournamentDocument = Tournament & Document;

@Schema({ timestamps: true, collection: 'tournaments' })
export class Tournament {
  @ApiProperty({ description: 'Tournament unique code', example: 'CUP-PHANTA-2026' })
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code: string;

  @ApiProperty({ description: 'Tournament full name', example: 'Giải Bóng Đá Tứ Hùng Phanta 2026' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiProperty({ enum: TournamentType, example: TournamentType.SPORT })
  @Prop({
    type: String,
    enum: Object.values(TournamentType),
    required: true,
    index: true,
  })
  type: TournamentType;

  @ApiProperty({ description: 'Sport or Esport game name', example: 'Bóng đá 7 người' })
  @Prop({ required: true, trim: true })
  sportOrGame: string;

  @ApiProperty({ enum: TournamentFormat, example: TournamentFormat.SINGLE_ELIMINATION })
  @Prop({
    type: String,
    enum: Object.values(TournamentFormat),
    required: true,
  })
  format: TournamentFormat;

  @ApiProperty({ description: 'Min teams required', example: 4 })
  @Prop({ required: true, min: 2, default: 4 })
  minTeams: number;

  @ApiProperty({ description: 'Max teams allowed', example: 16 })
  @Prop({ required: true, min: 2, default: 16 })
  maxTeams: number;

  @ApiProperty({ description: 'Team size (players per team)', example: 7 })
  @Prop({ required: true, min: 1, default: 7 })
  teamSize: number;

  @ApiProperty({ description: 'Entry fee per team in VND', example: 500000 })
  @Prop({ required: true, min: 0, default: 0 })
  entryFee: number;

  @ApiProperty({ description: 'Total prize pool in VND', example: 5000000 })
  @Prop({ required: true, min: 0, default: 0 })
  prizePool: number;

  @ApiProperty({ description: 'Registration start date' })
  @Prop({ type: Date, required: true })
  registrationStartDate: Date;

  @ApiProperty({ description: 'Registration end date' })
  @Prop({ type: Date, required: true })
  registrationEndDate: Date;

  @ApiProperty({ description: 'Tournament start date' })
  @Prop({ type: Date, required: true })
  tournamentStartDate: Date;

  @ApiProperty({ description: 'Tournament end date' })
  @Prop({ type: Date, required: true })
  tournamentEndDate: Date;

  @ApiProperty({ description: 'Tournament rules & regulations' })
  @Prop({ trim: true })
  rules?: string;

  @ApiProperty({ description: 'Banner image URL' })
  @Prop({ trim: true })
  bannerUrl?: string;

  @ApiProperty({ enum: TournamentStatus, default: TournamentStatus.DRAFT })
  @Prop({
    type: String,
    enum: Object.values(TournamentStatus),
    default: TournamentStatus.DRAFT,
    index: true,
  })
  status: TournamentStatus;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
