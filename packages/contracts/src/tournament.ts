import { z } from 'zod';
import {
  TournamentType,
  TournamentFormat,
  TournamentStatus,
  TournamentTeamStatus,
  TournamentMatchStatus,
  TournamentBracketType,
  PaymentMethod,
} from '@sports/shared';

// ==================== TOURNAMENT SCHEMAS ====================

export const createTournamentSchema = z.object({
  code: z.string().min(2).max(50).trim(),
  name: z.string().min(2).max(150).trim(),
  type: z.nativeEnum(TournamentType),
  sportOrGame: z.string().min(2).max(100).trim(), // e.g. "Bóng đá 7 người", "League of Legends"
  format: z.nativeEnum(TournamentFormat),
  minTeams: z.number().int().min(2).default(4),
  maxTeams: z.number().int().min(2).max(128).default(16),
  teamSize: z.number().int().min(1).default(5),
  entryFee: z.number().int().nonnegative().default(0), // Integer VND per team
  prizePool: z.number().int().nonnegative().default(0), // Total prize VND
  registrationStartDate: z.coerce.date(),
  registrationEndDate: z.coerce.date(),
  tournamentStartDate: z.coerce.date(),
  tournamentEndDate: z.coerce.date(),
  rules: z.string().max(5000).optional(),
  bannerUrl: z.string().url().optional(),
});
export type CreateTournamentDto = z.input<typeof createTournamentSchema>;

export const updateTournamentSchema = createTournamentSchema.partial();
export type UpdateTournamentDto = z.input<typeof updateTournamentSchema>;

export const tournamentListQuerySchema = z.object({
  type: z.nativeEnum(TournamentType).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type TournamentListQueryDto = z.infer<typeof tournamentListQuerySchema>;

export const tournamentDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.nativeEnum(TournamentType),
  sportOrGame: z.string(),
  format: z.nativeEnum(TournamentFormat),
  minTeams: z.number().int(),
  maxTeams: z.number().int(),
  currentTeamCount: z.number().int(),
  teamSize: z.number().int(),
  entryFee: z.number().int(),
  prizePool: z.number().int(),
  registrationStartDate: z.coerce.date(),
  registrationEndDate: z.coerce.date(),
  tournamentStartDate: z.coerce.date(),
  tournamentEndDate: z.coerce.date(),
  rules: z.string().optional(),
  bannerUrl: z.string().optional(),
  status: z.nativeEnum(TournamentStatus),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TournamentDetail = z.infer<typeof tournamentDetailSchema>;

// ==================== TEAM REGISTRATION SCHEMAS ====================

export const teamMemberSchema = z.object({
  userId: z.string().optional(),
  fullName: z.string().min(2).max(100).trim(),
  phone: z.string().min(9).max(15).trim(),
  inGameNameOrJerseyNumber: z.string().max(50).optional(),
  isCaptain: z.boolean().default(false),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const registerTournamentTeamSchema = z.object({
  teamName: z.string().min(2).max(100).trim(),
  captainName: z.string().min(2).max(100).trim(),
  captainPhone: z.string().min(9).max(15).trim(),
  logoUrl: z.string().url().optional(),
  members: z.array(teamMemberSchema).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod), // CASH or VIETQR
  cashierShiftId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
});
export type RegisterTournamentTeamDto = z.infer<typeof registerTournamentTeamSchema>;

export const withdrawTeamSchema = z.object({
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(64),
});
export type WithdrawTeamDto = z.infer<typeof withdrawTeamSchema>;

export const tournamentTeamDetailSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  teamName: z.string(),
  captainId: z.string(),
  captainName: z.string(),
  captainPhone: z.string(),
  logoUrl: z.string().optional(),
  members: z.array(teamMemberSchema),
  entryFeePaid: z.number().int(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  seedNumber: z.number().int().optional(),
  status: z.nativeEnum(TournamentTeamStatus),
  createdAt: z.coerce.date(),
});
export type TournamentTeamDetail = z.infer<typeof tournamentTeamDetailSchema>;

// ==================== BRACKET & MATCH SCHEMAS ====================

export const generateBracketSchema = z.object({
  seedType: z.enum(['RANDOM', 'MANUAL']).default('RANDOM'),
  manualSeeds: z.record(z.string(), z.number().int()).optional(), // teamId -> seedNumber
});
export type GenerateBracketDto = z.input<typeof generateBracketSchema>;

export const scheduleMatchSchema = z.object({
  scheduledDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm format required'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm format required'),
  resourceId: z.string().optional(), // Sân thể thao
  gamingMachineIds: z.array(z.string()).optional(), // Dàn máy Gaming nếu Esports
});
export type ScheduleMatchDto = z.input<typeof scheduleMatchSchema>;

export const updateMatchResultSchema = z.object({
  scoreTeam1: z.number().int().nonnegative(),
  scoreTeam2: z.number().int().nonnegative(),
  isForfeit: z.boolean().optional().default(false),
  forfeitTeamId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});
export type UpdateMatchResultDto = z.input<typeof updateMatchResultSchema>;

export const tournamentMatchDetailSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  matchCode: z.string(),
  round: z.number().int(),
  matchNumber: z.number().int(),
  bracketType: z.nativeEnum(TournamentBracketType),
  team1Id: z.string().optional(),
  team1Name: z.string().optional(),
  team2Id: z.string().optional(),
  team2Name: z.string().optional(),
  scheduledDate: z.coerce.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  resourceId: z.string().optional(),
  gamingMachineIds: z.array(z.string()).default([]),
  scoreTeam1: z.number().int().optional(),
  scoreTeam2: z.number().int().optional(),
  winnerTeamId: z.string().optional(),
  loserTeamId: z.string().optional(),
  nextMatchId: z.string().optional(),
  status: z.nativeEnum(TournamentMatchStatus),
  createdAt: z.coerce.date(),
});
export type TournamentMatchDetail = z.infer<typeof tournamentMatchDetailSchema>;

// ==================== STANDINGS & REPORTS ====================

export const tournamentStandingSchema = z.object({
  id: z.string(),
  tournamentId: z.string(),
  groupName: z.string().default('MAIN'),
  teamId: z.string(),
  teamName: z.string(),
  matchesPlayed: z.number().int(),
  won: z.number().int(),
  drawn: z.number().int(),
  lost: z.number().int(),
  points: z.number().int(),
  goalsFor: z.number().int(),
  goalsAgainst: z.number().int(),
  goalDifference: z.number().int(),
});
export type TournamentStanding = z.infer<typeof tournamentStandingSchema>;

export const tournamentReportResponseSchema = z.object({
  tournamentId: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.nativeEnum(TournamentStatus),
  totalTeamsRegistered: z.number().int(),
  totalTeamsConfirmed: z.number().int(),
  entryFee: z.number().int(),
  totalEntryFeeCollected: z.number().int(),
  totalEntryFeeRefunded: z.number().int(),
  netEntryFee: z.number().int(),
  prizePool: z.number().int(),
  netOrganizingProfit: z.number().int(),
  totalMatches: z.number().int(),
  completedMatches: z.number().int(),
});
export type TournamentReportResponse = z.infer<typeof tournamentReportResponseSchema>;
