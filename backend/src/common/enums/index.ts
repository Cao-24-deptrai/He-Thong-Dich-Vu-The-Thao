export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  CASHIER = 'CASHIER',
  PT = 'PT',
  MANAGER = 'MANAGER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum VenueType {
  FOOTBALL_5 = 'FOOTBALL_5',
  FOOTBALL_7 = 'FOOTBALL_7',
  FOOTBALL_11 = 'FOOTBALL_11',
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  GYM = 'GYM',
  POOL = 'POOL',
  BILLIARDS = 'BILLIARDS',
  ESPORT_VIP = 'ESPORT_VIP',
  ESPORT_NORMAL = 'ESPORT_NORMAL',
}

export enum MembershipTier {
  MEMBER = 'MEMBER',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export enum LedgerType {
  TOPUP = 'TOPUP',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  HOLD = 'HOLD',
  RELEASE = 'RELEASE',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum RentalItemType {
  BALL = 'BALL',
  BIB = 'BIB',
  RACKET = 'RACKET',
  OTHER = 'OTHER',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum BookingSource {
  APP = 'APP',
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
}

export enum BookingStatus {
  HELD = 'HELD',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  PAYOS = 'PAYOS',
  VIETQR = 'VIETQR',
  CASH = 'CASH',
  WALLET = 'WALLET',
  MOMO = 'MOMO',
}

export enum SportCategory {
  SOCCER = 'SOCCER',
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  GYM = 'GYM',
  POOL = 'POOL',
  GAMING = 'GAMING',
  BILLIARDS = 'BILLIARDS',
  OTHER = 'OTHER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderItemType {
  PRODUCT = 'PRODUCT',
  RENTAL = 'RENTAL',
  TICKET = 'TICKET',
  SERVICE = 'SERVICE',
}

export enum PaymentStatus {
  INIT = 'INIT',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
}

export enum MembershipPassType {
  SINGLE_PASS = 'SINGLE_PASS',
  MONTHLY_PASS = 'MONTHLY_PASS',
  YEARLY_PASS = 'YEARLY_PASS',
}

export enum MatchRequestStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}
