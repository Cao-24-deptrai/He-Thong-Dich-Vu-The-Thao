import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TournamentStandingDocument = TournamentStanding & Document;

@Schema({ timestamps: true, collection: 'tournament_standings' })
export class TournamentStanding {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId!: Types.ObjectId;

  @Prop({ required: true, default: 'MAIN', trim: true })
  groupName!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'TournamentTeam' })
  teamId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  teamName!: string;

  @Prop({ required: true, default: 0, min: 0 })
  matchesPlayed!: number;

  @Prop({ required: true, default: 0, min: 0 })
  won!: number;

  @Prop({ required: true, default: 0, min: 0 })
  drawn!: number;

  @Prop({ required: true, default: 0, min: 0 })
  lost!: number;

  @Prop({ required: true, default: 0 })
  points!: number;

  @Prop({ required: true, default: 0, min: 0 })
  goalsFor!: number;

  @Prop({ required: true, default: 0, min: 0 })
  goalsAgainst!: number;

  @Prop({ required: true, default: 0 })
  goalDifference!: number;
}

export const TournamentStandingSchema = SchemaFactory.createForClass(TournamentStanding);
TournamentStandingSchema.index({ tournamentId: 1, groupName: 1, teamId: 1 }, { unique: true });
TournamentStandingSchema.index({ tournamentId: 1, points: -1, goalDifference: -1, goalsFor: -1 });
