export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

export enum VenueType {
  FOOTBALL_5 = 'FOOTBALL_5',
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  GYM = 'GYM',
  ESPORT_VIP = 'ESPORT_VIP',
  ESPORT_NORMAL = 'ESPORT_NORMAL',
}

export enum BookingSource {
  APP = 'APP',
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
}

export enum BookingStatus {
  HELD = 'HELD',
  CONFIRMED = 'CONFIRMED',
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
  MOMO = 'MOMO',
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
