import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  TournamentType,
  TournamentFormat,
  TournamentStatus,
} from '@sports/shared';

export type TournamentDocument = Tournament & Document;

@Schema({ timestamps: true, collection: 'tournaments' })
export class Tournament {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string; // e.g. "CUP-BONGDA-2026", "TMT-LOL-SPRING-2026"

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(TournamentType),
    required: true,
    index: true,
  })
  type!: TournamentType;

  @Prop({ required: true, trim: true })
  sportOrGame!: string; // e.g. "Bóng đá 7 người", "League of Legends"

  @Prop({
    type: String,
    enum: Object.values(TournamentFormat),
    required: true,
  })
  format!: TournamentFormat;

  @Prop({ required: true, min: 2, default: 4 })
  minTeams!: number;

  @Prop({ required: true, min: 2, default: 16 })
  maxTeams!: number;

  @Prop({ required: true, default: 0, min: 0 })
  currentTeamCount!: number;

  @Prop({ required: true, min: 1, default: 5 })
  teamSize!: number;

  @Prop({ required: true, min: 0, default: 0 })
  entryFee!: number; // Integer VND

  @Prop({ required: true, min: 0, default: 0 })
  prizePool!: number; // Integer VND

  @Prop({ type: Date, required: true })
  registrationStartDate!: Date;

  @Prop({ type: Date, required: true })
  registrationEndDate!: Date;

  @Prop({ type: Date, required: true })
  tournamentStartDate!: Date;

  @Prop({ type: Date, required: true })
  tournamentEndDate!: Date;

  @Prop({ trim: true })
  rules?: string;

  @Prop({ trim: true })
  bannerUrl?: string;

  @Prop({
    type: String,
    enum: Object.values(TournamentStatus),
    default: TournamentStatus.DRAFT,
    index: true,
  })
  status!: TournamentStatus;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
TournamentSchema.index({ type: 1, status: 1 });
