// mobile/src/store/useBookingStore.ts
import { create } from 'zustand';
import { Facility, Venue, Booking, PaymentLinkResponse, Voucher } from '../types';

interface BookingState {
  selectedFacility: Facility | null;
  selectedVenue: Venue | null;
  selectedDate: string;
  activeBooking: Booking | null;
  paymentData: PaymentLinkResponse | null;
  appliedVoucher: Voucher | null;
  voucherDiscount: number;

  setSelectedFacility: (fac: Facility | null) => void;
  setSelectedVenue: (venue: Venue | null) => void;
  setSelectedDate: (date: string) => void;
  setActiveBooking: (booking: Booking | null) => void;
  setPaymentData: (data: PaymentLinkResponse | null) => void;
  setAppliedVoucher: (voucher: Voucher | null, discount?: number) => void;
  resetBooking: () => void;
}

const today = new Date().toISOString().split('T')[0];

export const useBookingStore = create<BookingState>((set) => ({
  selectedFacility: null,
  selectedVenue: null,
  selectedDate: today,
  activeBooking: null,
  paymentData: null,
  appliedVoucher: null,
  voucherDiscount: 0,

  setSelectedFacility: (fac) => set({ selectedFacility: fac }),
  setSelectedVenue: (venue) => set({ selectedVenue: venue }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setActiveBooking: (booking) => set({ activeBooking: booking }),
  setPaymentData: (data) => set({ paymentData: data }),
  setAppliedVoucher: (voucher, discount = 0) => set({ appliedVoucher: voucher, voucherDiscount: discount }),
  resetBooking: () => set({ activeBooking: null, paymentData: null, appliedVoucher: null, voucherDiscount: 0 }),
}));
