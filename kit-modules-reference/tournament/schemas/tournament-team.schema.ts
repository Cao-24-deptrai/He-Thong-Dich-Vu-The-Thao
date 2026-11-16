import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TournamentTeamStatus, PaymentMethod } from '@sports/shared';

export type TournamentTeamDocument = TournamentTeam & Document;

@Schema({ _id: false })
export class TeamMemberSubdoc {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ trim: true })
  inGameNameOrJerseyNumber?: string;

  @Prop({ default: false })
  isCaptain!: boolean;
}

const TeamMemberSubdocSchema = SchemaFactory.createForClass(TeamMemberSubdoc);

@Schema({ timestamps: true, collection: 'tournament_teams' })
export class TournamentTeam {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  teamName!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  captainId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  captainName!: string;

  @Prop({ required: true, trim: true })
  captainPhone!: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ type: [TeamMemberSubdocSchema], default: [] })
  members!: TeamMemberSubdoc[];

  @Prop({ required: true, min: 0, default: 0 })
  entryFeePaid!: number; // Integer VND

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  })
  paymentMethod!: PaymentMethod;

  @Prop({ type: Types.ObjectId, ref: 'CashierShift' })
  cashierShiftId?: Types.ObjectId;

  @Prop({ min: 1 })
  seedNumber?: number;

  @Prop({
    type: String,
    enum: Object.values(TournamentTeamStatus),
    default: TournamentTeamStatus.CONFIRMED,
    index: true,
  })
  status!: TournamentTeamStatus;

  @Prop({ required: true, index: true })
  idempotencyKey!: string;
}

export const TournamentTeamSchema = SchemaFactory.createForClass(TournamentTeam);
TournamentTeamSchema.index({ tournamentId: 1, teamName: 1 }, { unique: true });
TournamentTeamSchema.index({ tournamentId: 1, status: 1 });
