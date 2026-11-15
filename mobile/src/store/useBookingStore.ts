// mobile/src/store/useBookingStore.ts
import { create } from 'zustand';
import { Facility, Venue, Booking, PaymentLinkResponse } from '../types';

interface BookingState {
  selectedFacility: Facility | null;
  selectedVenue: Venue | null;
  selectedDate: string;
  activeBooking: Booking | null;
  paymentData: PaymentLinkResponse | null;

  setSelectedFacility: (fac: Facility | null) => void;
  setSelectedVenue: (venue: Venue | null) => void;
  setSelectedDate: (date: string) => void;
  setActiveBooking: (booking: Booking | null) => void;
  setPaymentData: (data: PaymentLinkResponse | null) => void;
  resetBooking: () => void;
}

const today = new Date().toISOString().split('T')[0];

export const useBookingStore = create<BookingState>((set) => ({
  selectedFacility: null,
  selectedVenue: null,
  selectedDate: today,
  activeBooking: null,
  paymentData: null,

  setSelectedFacility: (fac) => set({ selectedFacility: fac }),
  setSelectedVenue: (venue) => set({ selectedVenue: venue }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setActiveBooking: (booking) => set({ activeBooking: booking }),
  setPaymentData: (data) => set({ paymentData: data }),
  resetBooking: () => set({ activeBooking: null, paymentData: null }),
}));
