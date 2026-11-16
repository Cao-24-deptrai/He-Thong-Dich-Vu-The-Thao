import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyStatsDocument = DailyStats & Document;

@Schema({ _id: false })
export class RevenueBreakdownSubdoc {
  @Prop({ required: true, default: 0 })
  grossRevenue!: number;

  @Prop({ required: true, default: 0 })
  discountAmount!: number;

  @Prop({ required: true, default: 0 })
  refundAmount!: number;

  @Prop({ required: true, default: 0 })
  netRevenue!: number;
}
const RevenueBreakdownSubdocSchema = SchemaFactory.createForClass(RevenueBreakdownSubdoc);

@Schema({ _id: false })
export class BookingStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalBookings!: number;

  @Prop({ required: true, default: 0 })
  totalMinutes!: number;

  @Prop({ required: true, default: 0 })
  completedBookings!: number;

  @Prop({ required: true, default: 0 })
  cancelledBookings!: number;

  @Prop({ required: true, default: 0 })
  noShowBookings!: number;
}
const BookingStatsSubdocSchema = SchemaFactory.createForClass(BookingStatsSubdoc);

@Schema({ _id: false })
export class GymStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalCheckIns!: number;

  @Prop({ required: true, default: 0 })
  newMemberships!: number;

  @Prop({ required: true, default: 0 })
  renewedMemberships!: number;
}
const GymStatsSubdocSchema = SchemaFactory.createForClass(GymStatsSubdoc);

@Schema({ _id: false })
export class GamingStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalSessions!: number;

  @Prop({ required: true, default: 0 })
  totalPlayMinutes!: number;

  @Prop({ required: true, default: 0 })
  standardRevenue!: number;

  @Prop({ required: true, default: 0 })
  vipRevenue!: number;
}
const GamingStatsSubdocSchema = SchemaFactory.createForClass(GamingStatsSubdoc);

@Schema({ _id: false })
export class CanteenStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalOrders!: number;

  @Prop({ required: true, default: 0 })
  totalSales!: number;

  @Prop({ required: true, default: 0 })
  totalCost!: number;

  @Prop({ required: true, default: 0 })
  grossProfit!: number;
}
const CanteenStatsSubdocSchema = SchemaFactory.createForClass(CanteenStatsSubdoc);

@Schema({ _id: false })
export class RentalStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalRentals!: number;

  @Prop({ required: true, default: 0 })
  totalRentalRevenue!: number;
}
const RentalStatsSubdocSchema = SchemaFactory.createForClass(RentalStatsSubdoc);

@Schema({ _id: false })
export class TournamentStatsSubdoc {
  @Prop({ required: true, default: 0 })
  totalTournamentsActive!: number;

  @Prop({ required: true, default: 0 })
  totalEntryFeesCollected!: number;
}
const TournamentStatsSubdocSchema = SchemaFactory.createForClass(TournamentStatsSubdoc);

@Schema({ timestamps: true, collection: 'daily_stats' })
export class DailyStats {
  @Prop({ required: true, trim: true })
  date!: string; // Format: YYYY-MM-DD

  @Prop({ type: RevenueBreakdownSubdocSchema, required: true, default: () => ({}) })
  revenueSummary!: RevenueBreakdownSubdoc;

  @Prop({ type: Map, of: RevenueBreakdownSubdocSchema, default: {} })
  revenueByService!: Map<string, RevenueBreakdownSubdoc>;

  @Prop({ type: Map, of: Number, default: {} })
  revenueByPaymentMethod!: Map<string, number>;

  @Prop({ type: BookingStatsSubdocSchema, required: true, default: () => ({}) })
  bookingSummary!: BookingStatsSubdoc;

  @Prop({ type: GymStatsSubdocSchema, required: true, default: () => ({}) })
  gymSummary!: GymStatsSubdoc;

  @Prop({ type: GamingStatsSubdocSchema, required: true, default: () => ({}) })
  gamingSummary!: GamingStatsSubdoc;

  @Prop({ type: CanteenStatsSubdocSchema, required: true, default: () => ({}) })
  canteenSummary!: CanteenStatsSubdoc;

  @Prop({ type: RentalStatsSubdocSchema, required: true, default: () => ({}) })
  rentalSummary!: RentalStatsSubdoc;

  @Prop({ type: TournamentStatsSubdocSchema, required: true, default: () => ({}) })
  tournamentSummary!: TournamentStatsSubdoc;

  @Prop({ required: true, default: 0 })
  newCustomers!: number;

  @Prop({ required: true, default: 0 })
  activeCustomers!: number;
}

export const DailyStatsSchema = SchemaFactory.createForClass(DailyStats);
DailyStatsSchema.index({ date: 1 }, { unique: true });
