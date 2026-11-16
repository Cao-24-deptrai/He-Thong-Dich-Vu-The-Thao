// mobile/src/types/index.ts

export type UserRole = 'CUSTOMER' | 'STAFF' | 'OWNER' | 'ADMIN';

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
  phone?: string;
  operatingHours?: {
    openTime: string;
    closeTime: string;
  };
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
  type?: string;
  venueType?: string;
  courtCode?: string;
  isComposite?: boolean;
  baseUnitCodes?: string[];
  basePricePerHour: number;
  defaultPrice?: number;
  pricingRules?: {
    peakHours?: PricingRule[];
    [key: string]: any;
  };
  pricingConfig?: PricingRule[];
  operatingHours?: {
    openTime: string;
    closeTime: string;
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

export interface Voucher {
  _id?: string;
  code: string;
  title?: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  totalBudget?: number;
  usedBudget?: number;
  usageLimit?: number;
  usedCount?: number;
  perUserLimit?: number;
  applicableSports?: string[];
  applicableVenues?: string[];
  applicableCustomerTiers?: string[];
  validFrom?: string;
  validUntil: string;
  isActive: boolean;
}

export interface VoucherValidationResult {
  valid: boolean;
  discountAmount: number;
  finalPrice: number;
  voucher?: Voucher;
  reason?: string;
}

export interface CustomerTierInfo {
  currentTier: 'MEMBER' | 'SILVER' | 'GOLD' | 'PLATINUM';
  tierName: string;
  rolling12MonthSpend: number;
  totalLifetimeSpend: number;
  loyaltyPoints: number;
  discountRate: number;
  pointMultiplier: number;
  nextTier: {
    tier: string;
    name: string;
    minSpend: number;
    remainingSpend: number;
  } | null;
  tierExpiresAt?: string;
}
