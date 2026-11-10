import { BookingDocument } from '../schemas/booking.schema';

const extractVenueId = (venueId: any): string => {
  if (!venueId) return '';
  if (venueId._id) return venueId._id.toString();
  return venueId.toString();
};

export const BOOKING_EVENTS = {
  HELD: 'booking.held',
  CONFIRMED: 'booking.confirmed',
  CANCELLED: 'booking.cancelled',
  CHECKED_IN: 'booking.checked_in',
  EXPIRED: 'booking.expired',
} as const;

export class BookingHeldEvent {
  public readonly bookingId: string;
  public readonly venueId: string;
  public readonly bookingDate: Date;
  public readonly startTime: string;
  public readonly endTime: string;
  public readonly totalPrice: number;
  public readonly holdExpiresAt?: Date;
  public readonly userId?: string;

  constructor(public readonly booking: BookingDocument | any) {
    this.bookingId = booking._id?.toString();
    this.venueId = extractVenueId(booking.venueId);
    this.bookingDate = booking.bookingDate;
    this.startTime = booking.startTime;
    this.endTime = booking.endTime;
    this.totalPrice = booking.totalPrice;
    this.holdExpiresAt = booking.holdExpiresAt;
    this.userId = booking.userId?.toString();
  }
}

export class BookingConfirmedEvent {
  public readonly bookingId: string;
  public readonly bookingCode: string;
  public readonly ticketCode?: string;
  public readonly venueId: string;
  public readonly bookingDate: Date;
  public readonly startTime: string;
  public readonly endTime: string;
  public readonly totalPrice: number;
  public readonly userId?: string;
  public readonly customerName?: string;
  public readonly customerPhone?: string;
  public readonly paymentMethod?: string;
  public readonly isRecurring: boolean;
  public readonly recurringGroupId?: string;

  constructor(public readonly booking: BookingDocument | any) {
    this.bookingId = booking._id?.toString();
    this.bookingCode = booking.bookingCode;
    this.ticketCode = booking.ticketCode;
    this.venueId = extractVenueId(booking.venueId);
    this.bookingDate = booking.bookingDate;
    this.startTime = booking.startTime;
    this.endTime = booking.endTime;
    this.totalPrice = booking.totalPrice;
    this.userId = booking.userId?.toString();
    this.customerName = booking.customerName;
    this.customerPhone = booking.customerPhone;
    this.paymentMethod = booking.paymentMethod;
    this.isRecurring = Boolean(booking.isRecurring);
    this.recurringGroupId = booking.recurringGroupId;
  }
}

export class BookingCancelledEvent {
  public readonly bookingId: string;
  public readonly venueId: string;

  constructor(
    public readonly booking: BookingDocument | any,
    public readonly reason?: string,
    public readonly cancelledBy?: string,
    public readonly refundRate?: number,
    public readonly refundAmount?: number,
  ) {
    this.bookingId = booking._id?.toString();
    this.venueId = extractVenueId(booking.venueId);
  }
}

export class BookingCheckedInEvent {
  public readonly bookingId: string;
  public readonly bookingCode?: string;
  public readonly ticketCode?: string;
  public readonly venueId: string;
  public readonly checkedInAt: Date;
  public readonly checkedInBy?: string;
  public readonly checkinMethod: string;

  constructor(public readonly booking: BookingDocument | any) {
    this.bookingId = booking._id?.toString();
    this.bookingCode = booking.bookingCode;
    this.ticketCode = booking.ticketCode;
    this.venueId = extractVenueId(booking.venueId);
    this.checkedInAt = booking.checkedInAt || new Date();
    this.checkedInBy = booking.checkedInBy?.toString();
    this.checkinMethod = booking.checkinMethod || 'QR';
  }
}

export class BookingExpiredEvent {
  public readonly venueId?: string;

  constructor(
    public readonly bookingId: string,
    venueId?: any,
    public readonly bookingDate?: Date,
    public readonly startTime?: string,
  ) {
    this.venueId = venueId ? extractVenueId(venueId) : undefined;
  }
}
