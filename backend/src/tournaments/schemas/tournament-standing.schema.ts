import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TournamentStandingDocument = TournamentStanding & Document;

@Schema({ timestamps: true, collection: 'tournament_standings' })
export class TournamentStanding {
  @ApiProperty({ description: 'Tournament ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId: Types.ObjectId;

  @ApiProperty({ description: 'Group Name', default: 'MAIN' })
  @Prop({ required: true, default: 'MAIN', trim: true })
  groupName: string;

  @ApiProperty({ description: 'Tournament Team ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'TournamentTeam' })
  teamId: Types.ObjectId;

  @ApiProperty({ description: 'Team Name' })
  @Prop({ required: true, trim: true })
  teamName: string;

  @ApiProperty({ description: 'Matches Played', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  matchesPlayed: number;

  @ApiProperty({ description: 'Wins', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  won: number;

  @ApiProperty({ description: 'Draws', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  drawn: number;

  @ApiProperty({ description: 'Losses', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  lost: number;

  @ApiProperty({ description: 'Points', default: 0 })
  @Prop({ required: true, default: 0 })
  points: number;

  @ApiProperty({ description: 'Goals / Points For', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  goalsFor: number;

  @ApiProperty({ description: 'Goals / Points Against', default: 0 })
  @Prop({ required: true, default: 0, min: 0 })
  goalsAgainst: number;

  @ApiProperty({ description: 'Goal Difference', default: 0 })
  @Prop({ required: true, default: 0 })
  goalDifference: number;
}

export const TournamentStandingSchema = SchemaFactory.createForClass(TournamentStanding);
TournamentStandingSchema.index({ tournamentId: 1, groupName: 1, points: -1, goalDifference: -1 });
