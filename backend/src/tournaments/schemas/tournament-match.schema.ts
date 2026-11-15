import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { TournamentMatchStatus, TournamentBracketType } from '../../common/enums';

export type TournamentMatchDocument = TournamentMatch & Document;

@Schema({ timestamps: true, collection: 'tournament_matches' })
export class TournamentMatch {
  @ApiProperty({ description: 'Tournament ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId: Types.ObjectId;

  @ApiProperty({ description: 'Match Code (e.g. QF1, SF1, FINAL)' })
  @Prop({ required: true, trim: true })
  matchCode: string;

  @ApiProperty({ description: 'Round number (1, 2, 3...)', example: 1 })
  @Prop({ required: true, min: 1 })
  round: number;

  @ApiProperty({ description: 'Match sequence number in round' })
  @Prop({ required: true, min: 1 })
  matchNumber: number;

  @ApiProperty({ enum: TournamentBracketType, default: TournamentBracketType.WINNERS })
  @Prop({
    type: String,
    enum: Object.values(TournamentBracketType),
    default: TournamentBracketType.WINNERS,
  })
  bracketType: TournamentBracketType;

  @ApiProperty({ description: 'Team 1 ID' })
  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  team1Id?: Types.ObjectId;

  @ApiProperty({ description: 'Team 1 Name' })
  @Prop({ trim: true })
  team1Name?: string;

  @ApiProperty({ description: 'Team 2 ID' })
  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  team2Id?: Types.ObjectId;

  @ApiProperty({ description: 'Team 2 Name' })
  @Prop({ trim: true })
  team2Name?: string;

  @ApiProperty({ description: 'Score of Team 1', default: 0 })
  @Prop({ default: 0, min: 0 })
  score1: number;

  @ApiProperty({ description: 'Score of Team 2', default: 0 })
  @Prop({ default: 0, min: 0 })
  score2: number;

  @ApiProperty({ description: 'Winner Team ID' })
  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  winnerId?: Types.ObjectId;

  @ApiProperty({ description: 'Next Match ID for the winner' })
  @Prop({ type: Types.ObjectId, ref: 'TournamentMatch' })
  nextMatchId?: Types.ObjectId;

  @ApiProperty({ description: 'Scheduled match start time' })
  @Prop({ type: Date })
  scheduledStartTime?: Date;

  @ApiProperty({ description: 'Court or Facility Resource ID' })
  @Prop({ type: Types.ObjectId, ref: 'Venue' })
  resourceId?: Types.ObjectId;

  @ApiProperty({ enum: TournamentMatchStatus, default: TournamentMatchStatus.SCHEDULED })
  @Prop({
    type: String,
    enum: Object.values(TournamentMatchStatus),
    default: TournamentMatchStatus.SCHEDULED,
    index: true,
  })
  status: TournamentMatchStatus;
}

export const TournamentMatchSchema = SchemaFactory.createForClass(TournamentMatch);
TournamentMatchSchema.index({ tournamentId: 1, round: 1, matchNumber: 1 });
