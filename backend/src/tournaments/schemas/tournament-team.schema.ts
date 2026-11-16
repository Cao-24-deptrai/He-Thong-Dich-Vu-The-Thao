import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { TournamentTeamStatus, PaymentProvider } from '../../common/enums';

export type TournamentTeamDocument = TournamentTeam & Document;

@Schema({ _id: false })
export class TeamMemberSubdoc {
  @ApiProperty({ description: 'Member user ID (optional)' })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Full name' })
  @Prop({ required: true, trim: true })
  fullName: string;

  @ApiProperty({ description: 'Phone number' })
  @Prop({ required: true, trim: true })
  phone: string;

  @ApiProperty({ description: 'In-game name or jersey number' })
  @Prop({ trim: true })
  inGameNameOrJerseyNumber?: string;

  @ApiProperty({ description: 'Is team captain' })
  @Prop({ default: false })
  isCaptain: boolean;
}

export const TeamMemberSubdocSchema = SchemaFactory.createForClass(TeamMemberSubdoc);

@Schema({ timestamps: true, collection: 'tournament_teams' })
export class TournamentTeam {
  @ApiProperty({ description: 'Tournament ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'Tournament' })
  tournamentId: Types.ObjectId;

  @ApiProperty({ description: 'Team Name', example: 'Chiến Binh Rồng' })
  @Prop({ required: true, trim: true })
  teamName: string;

  @ApiProperty({ description: 'Captain User ID' })
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  captainId: Types.ObjectId;

  @ApiProperty({ description: 'Captain Full Name' })
  @Prop({ required: true, trim: true })
  captainName: string;

  @ApiProperty({ description: 'Captain Phone' })
  @Prop({ required: true, trim: true })
  captainPhone: string;

  @ApiProperty({ description: 'Team Logo URL' })
  @Prop({ trim: true })
  logoUrl?: string;

  @ApiProperty({ type: [TeamMemberSubdoc], description: 'List of team members' })
  @Prop({ type: [TeamMemberSubdocSchema], default: [] })
  members: TeamMemberSubdoc[];

  @ApiProperty({ description: 'Seed number (optional)' })
  @Prop({ min: 1 })
  seed?: number;

  @ApiProperty({ enum: TournamentTeamStatus, default: TournamentTeamStatus.CONFIRMED })
  @Prop({
    type: String,
    enum: Object.values(TournamentTeamStatus),
    default: TournamentTeamStatus.CONFIRMED,
    index: true,
  })
  status: TournamentTeamStatus;

  @ApiProperty({ enum: PaymentProvider, default: PaymentProvider.VIETQR })
  @Prop({
    type: String,
    enum: Object.values(PaymentProvider),
    default: PaymentProvider.VIETQR,
  })
  paymentMethod: PaymentProvider;

  @ApiProperty({ description: 'Entry fee paid in VND' })
  @Prop({ default: 0, min: 0 })
  entryFeePaid: number;
}

export const TournamentTeamSchema = SchemaFactory.createForClass(TournamentTeam);
TournamentTeamSchema.index({ tournamentId: 1, teamName: 1 }, { unique: true });
