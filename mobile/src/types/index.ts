// mobile/src/types/index.ts

export type UserRole = 'CUSTOMER' | 'STAFF' | 'OWNER' | 'ADMIN' | 'TRAINER';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  role: UserRole;
}

export interface Facility {
  _id: string;
  name: string;
  address: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  sportTypes: string[];
  description?: string;
  openHour?: string;
  closeHour?: string;
}

export interface PricingRule {
  startTime: string;
  endTime: string;
  price: number;
}

export interface Venue {
  _id: string;
  facilityId: string;
  name: string;
  type: string;
  basePricePerHour: number;
  pricingRules?: {
    peakHours?: PricingRule[];
    [key: string]: any;
  };
}

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'PAST';

export interface SlotAvailability {
  slot: string;
  startTime: string;
  endTime: string;
  price: number;
  status: SlotStatus;
  holdExpiresAt?: string;
}

export interface VenueAvailability {
  venueId: string;
  venueName: string;
  date: string;
  slots: SlotAvailability[];
}

export interface Booking {
  _id: string;
  userId?: any;
  venueId: any;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: 'HELD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED' | 'REFUND_PENDING' | 'REFUNDED';
  holdExpiresAt?: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  qrToken?: string;
  createdAt: string;
}

export interface PaymentLinkResponse {
  paymentId: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  description?: string;
  orderCode?: number;
}

export interface QrTokenResponse {
  qrToken: string;
  expiresInSeconds: number;
  expiresAt: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  booking: {
    id: string;
    venue: any;
    bookingDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
  };
}

// ==================== PT & CLASSES (M11) ====================
export interface StaffProfile {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  specialties: string[];
  bio?: string;
  avatarUrl?: string;
  hourlyRate: number;
  certifications: string[];
  employmentStatus: string;
}

export interface ClassSession {
  _id: string;
  templateId: string;
  name: string;
  classType: string;
  trainerId: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomName?: string;
  capacity: number;
  bookedCount: number;
  pricePerSession: number;
  status: string;
}

export interface PtBookingSession {
  _id: string;
  sessionCode: string;
  trainerId: string;
  trainerName: string;
  customerId: string;
  customerName?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pricePaid: number;
  status: string;
}

// ==================== TOURNAMENTS (M16) ====================
export interface Tournament {
  _id: string;
  code: string;
  name: string;
  type: 'SPORT' | 'ESPORT';
  sportOrGame: string;
  format: string;
  minTeams: number;
  maxTeams: number;
  teamSize: number;
  entryFee: number;
  prizePool: number;
  registrationStartDate: string;
  registrationEndDate: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  status: string;
  bannerUrl?: string;
}

export interface TournamentMatch {
  _id: string;
  tournamentId: string;
  matchCode: string;
  round: number;
  matchNumber: number;
  team1Id?: string;
  team1Name?: string;
  team2Id?: string;
  team2Name?: string;
  score1: number;
  score2: number;
  winnerId?: string;
  nextMatchId?: string;
  scheduledStartTime?: string;
  status: string;
}

// ==================== GAMING (M14) ====================
export interface GamingMachine {
  _id: string;
  machineCode: string;
  zone: 'STANDARD' | 'VIP' | 'STREAMING' | 'PRIVATE_ROOM';
  hourlyPrice: number;
  status: 'OFFLINE' | 'IDLE' | 'IN_USE' | 'LOCKED' | 'MAINTENANCE';
  specs?: {
    cpu?: string;
    ram?: string;
    gpu?: string;
    screen?: string;
  };
  position?: {
    x?: number;
    y?: number;
    floor: number;
    roomName?: string;
  };
}

export interface GamingSession {
  _id: string;
  sessionCode: string;
  machineId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  totalMinutes: number;
  totalHoldAmount: number;
  actualUsageAmount: number;
  status: 'STARTING' | 'ACTIVE' | 'OFFLINE_GRACE' | 'LOCKED' | 'ENDING' | 'SETTLED';
}
