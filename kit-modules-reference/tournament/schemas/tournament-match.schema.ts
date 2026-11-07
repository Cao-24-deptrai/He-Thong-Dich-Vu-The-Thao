import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  TournamentMatchStatus,
  TournamentBracketType,
} from '@sports/shared';

export type TournamentMatchDocument = TournamentMatch & Document;

@Schema({ timestamps: true, collection: 'tournament_matches' })
export class TournamentMatch {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  matchCode!: string; // e.g. "R1M1", "QF1", "SF1", "FINAL"

  @Prop({ required: true, min: 1 })
  round!: number; // 1, 2, 3...

  @Prop({ required: true, min: 1 })
  matchNumber!: number;

  @Prop({
    type: String,
    enum: Object.values(TournamentBracketType),
    default: TournamentBracketType.WINNERS,
  })
  bracketType!: TournamentBracketType;

  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  team1Id?: Types.ObjectId;

  @Prop({ trim: true })
  team1Name?: string;

  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  team2Id?: Types.ObjectId;

  @Prop({ trim: true })
  team2Name?: string;

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ trim: true })
  startTime?: string; // HH:mm

  @Prop({ trim: true })
  endTime?: string; // HH:mm

  @Prop({ type: Types.ObjectId, ref: 'Resource' })
  resourceId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'GamingMachine' }], default: [] })
  gamingMachineIds!: Types.ObjectId[];

  @Prop({ min: 0 })
  scoreTeam1?: number;

  @Prop({ min: 0 })
  scoreTeam2?: number;

  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  winnerTeamId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TournamentTeam' })
  loserTeamId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TournamentMatch' })
  nextMatchId?: Types.ObjectId; // Trận tiếp theo của nhánh đấu mà đội thắng sẽ đi tới

  @Prop({
    type: String,
    enum: Object.values(TournamentMatchStatus),
    default: TournamentMatchStatus.SCHEDULED,
    index: true,
  })
  status!: TournamentMatchStatus;
}

export const TournamentMatchSchema = SchemaFactory.createForClass(TournamentMatch);
TournamentMatchSchema.index({ tournamentId: 1, matchCode: 1 }, { unique: true });
TournamentMatchSchema.index({ tournamentId: 1, round: 1 });
TournamentMatchSchema.index({ resourceId: 1, scheduledDate: 1, status: 1 });
