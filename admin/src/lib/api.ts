// admin/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface User {
  _id: string;
  phone: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'OWNER' | 'ADMIN';
}

export interface Facility {
  _id: string;
  name: string;
  address: string;
  sportType?: 'FOOTBALL' | 'BADMINTON' | 'PICKLEBALL' | 'TENNIS' | 'ESPORTS' | 'GYM' | string;
  sportTypes?: string[];
  description?: string;
  openHour?: string;
  closeHour?: string;
  isActive?: boolean;
  createdAt?: string;
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
  venueType: string;
  defaultPrice: number;
  basePricePerHour?: number;
  pricingConfig?: PricingRule[];
  pricingRules?: Record<string, any>;
  operatingHours?: {
    openTime: string;
    closeTime: string;
  };
  slotDurationMinutes?: number;
  cancellationPolicy?: {
    hoursBeforeForFullRefund: number;
    hoursBeforeForNoRefund: number;
  };
  isActive?: boolean;
}

export interface SlotAvailability {
  startTime: string;
  endTime: string;
  price: number;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'PAST';
}

export interface VenueAvailability {
  venueId: string;
  date: string;
  slots: SlotAvailability[];
}



export interface StaffResponse {
  respondedBy: string;
  responderName: string;
  content: string;
  respondedAt: string;
}

export interface Review {
  _id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  facilityId: string;
  venueId?: string;
  facilityRating: number;
  serviceRating: number;
  staffRating: number;
  cleanlinessRating: number;
  overallRating: number;
  comment: string;
  staffId?: string;
  needsAttention: boolean;
  staffResponse?: StaffResponse;
  createdAt: string;
}

export interface ReviewSummary {
  totalReviews: number;
  avgOverall: number;
  avgFacility: number;
  avgService: number;
  avgStaff: number;
  avgCleanliness: number;
  starsBreakdown: { [key: number]: number };
  needsAttentionCount: number;
}

export interface Equipment {
  _id: string;
  code: string;
  name: string;
  sportType: 'FOOTBALL' | 'TENNIS' | 'BADMINTON' | 'BASKETBALL' | 'GENERAL';
  pricingType: 'PER_TURN' | 'HOURLY';
  price: number;
  depositAmount: number;
  damageFee: number;
  lostFee: number;
  totalQuantity: number;
  rentedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface RentalTicketItem {
  equipmentId: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  depositPerUnit: number;
  pricingType: 'PER_TURN' | 'HOURLY';
  subtotalPrice: number;
  subtotalDeposit: number;
  returnCondition?: 'GOOD' | 'DAMAGED' | 'LOST';
  penaltyFee?: number;
}

export interface RentalTicket {
  _id: string;
  ticketCode: string;
  shiftId?: string;
  cashierId: string;
  customerId?: string;
  customerPhone: string;
  customerName?: string;
  bookingId?: string;
  items: RentalTicketItem[];
  rentedAt: string;
  dueAt: string;
  returnedAt?: string;
  totalRentalAmount: number;
  totalDepositAmount: number;
  totalPenaltyFee: number;
  refundDepositAmount: number;
  paymentMethod: 'CASH' | 'VIETQR' | 'MOMO';
  status: 'RENTING' | 'RETURNED' | 'CANCELLED';
  notes?: string;
}

export interface Booking {
  _id: string;
  bookingCode?: string;
  userId?: any;
  venueId: any;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: 'HELD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED' | 'REFUND_PENDING' | 'REFUNDED';
  isCheckedIn: boolean;
  checkedInAt?: string;
  isWalkIn?: boolean;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  refundNote?: string;
  refundedAt?: string;
  createdAt?: string;
}

class ApiService {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  public setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  public setUser(user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_user', JSON.stringify(user));
    }
  }

  public getUser(): User | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('admin_user');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  public logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
      const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)) as any;
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  // --- AUTH ---
  async login(phone: string, password: string): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    const token = res.accessToken || res.access_token || '';
    this.setToken(token);
    this.setUser(res.user);
    return { accessToken: token, user: res.user };
  }

  // --- FACILITIES ---
  async getFacilities(includeInactive = false): Promise<Facility[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.request<Facility[]>(`/facilities${query}`);
  }

  async createFacility(data: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>('/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFacility(id: string): Promise<{ message: string; facility: Facility }> {
    return this.request<{ message: string; facility: Facility }>(`/facilities/${id}`, {
      method: 'DELETE',
    });
  }

  // --- VENUES ---
  async getVenues(facilityId?: string, includeInactive = false): Promise<Venue[]> {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (includeInactive) params.append('includeInactive', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Venue[]>(`/venues${query}`);
  }

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    return this.request<Venue>('/venues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVenue(id: string, data: Partial<Venue>): Promise<Venue> {
    return this.request<Venue>(`/venues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteVenue(id: string): Promise<{ message: string; venue: Venue }> {
    return this.request<{ message: string; venue: Venue }>(`/venues/${id}`, {
      method: 'DELETE',
    });
  }

  async getVenueAvailability(venueId: string, date: string): Promise<VenueAvailability> {
    return this.request<VenueAvailability>(`/venues/${venueId}/availability?date=${date}`);
  }

  // --- WALK-IN BOOKING ---
  async createWalkInBooking(payload: {
    venueId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    customerName: string;
    customerPhone: string;
    paymentMethod?: string;
    note?: string;
  }): Promise<Booking> {
    return this.request<Booking>('/bookings/walk-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- CHECK-IN ---
  async scanCheckin(qrToken: string): Promise<{ message: string; booking: Booking }> {
    return this.request<{ message: string; booking: Booking }>('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }

  // For testing: get QR token for a booking
  async getBookingQr(bookingId: string): Promise<{ qrToken: string; expiresInSeconds: number }> {
    return this.request<{ qrToken: string; expiresInSeconds: number }>(`/bookings/${bookingId}/qr`);
  }

  // --- REFUND MANAGEMENT ---
  async getRefundPending(): Promise<Booking[]> {
    return this.request<Booking[]>('/admin/refund-pending');
  }

  async processRefund(bookingId: string, refundNote?: string): Promise<{ message: string; booking: Booking }> {
    return this.request<{ message: string; booking: Booking }>(`/admin/refund/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ refundNote }),
    });
  }

  // --- AUTO REFUND (Mục 6.5) ---
  async autoRefund(bookingId: string, reason?: string): Promise<any> {
    return this.request<any>(`/admin/refund/${bookingId}/auto`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- GYM MEMBERSHIP (Mục 6.1) ---
  async getAllGymPasses(): Promise<any[]> {
    return this.request<any[]>('/membership-pass/admin/all');
  }

  async checkInGymPass(payload: { passId?: string; qrToken?: string }): Promise<any> {
    return this.request<any>('/membership-pass/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- MATCHMAKING (Mục 6.3) ---
  async getMatchRequests(sportType?: string): Promise<any[]> {
    const query = sportType ? `?sportType=${sportType}` : '';
    return this.request<any[]>(`/match-requests${query}`);
  }


  // --- EQUIPMENT RENTAL (M13 - E07) ---
  async getEquipments(params?: { sportType?: string; search?: string; availableOnly?: boolean }): Promise<Equipment[]> {
    const q = new URLSearchParams();
    if (params?.sportType) q.append('sportType', params.sportType);
    if (params?.search) q.append('search', params.search);
    if (params?.availableOnly) q.append('availableOnly', 'true');
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Equipment[]>(`/rentals/equipments${query}`);
  }

  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    return this.request<Equipment>('/rentals/equipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
    return this.request<Equipment>(`/rentals/equipments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createRentalTicket(payload: {
    customerPhone: string;
    customerName?: string;
    bookingId?: string;
    shiftId?: string;
    items: { equipmentId: string; quantity: number }[];
    rentalHours?: number;
    paymentMethod?: string;
    notes?: string;
  }): Promise<RentalTicket> {
    return this.request<RentalTicket>('/rentals/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRentalTickets(params?: { status?: string; customerPhone?: string; shiftId?: string; bookingId?: string }): Promise<RentalTicket[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.customerPhone) q.append('customerPhone', params.customerPhone);
    if (params?.shiftId) q.append('shiftId', params.shiftId);
    if (params?.bookingId) q.append('bookingId', params.bookingId);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<RentalTicket[]>(`/rentals/tickets${query}`);
  }

  async returnRentalTicket(id: string, payload: {
    items: { equipmentId: string; condition: 'GOOD' | 'DAMAGED' | 'LOST'; quantity: number; customPenaltyFee?: number }[];
    notes?: string;
  }): Promise<RentalTicket> {
    return this.request<RentalTicket>(`/rentals/tickets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }


  // --- REVIEWS & COMMUNITY (E15) ---
  async getReviewSummary(facilityId?: string): Promise<ReviewSummary> {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return this.request<ReviewSummary>(`/reviews/summary${query}`);
  }

  async getReviews(params?: { facilityId?: string; venueId?: string; needsAttention?: boolean; rating?: number }): Promise<Review[]> {
    const q = new URLSearchParams();
    if (params?.facilityId) q.append('facilityId', params.facilityId);
    if (params?.venueId) q.append('venueId', params.venueId);
    if (params?.needsAttention !== undefined) q.append('needsAttention', String(params.needsAttention));
    if (params?.rating) q.append('rating', String(params.rating));
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<Review[]>(`/reviews${query}`);
  }

  async createReview(payload: {
    bookingId: string;
    facilityRating: number;
    serviceRating: number;
    staffRating: number;
    cleanlinessRating: number;
    comment: string;
  }): Promise<Review> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async respondToReview(id: string, content: string): Promise<Review> {
    return this.request<Review>(`/reviews/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async dismissReviewAttention(id: string): Promise<Review> {
    return this.request<Review>(`/reviews/${id}/dismiss`, {
      method: 'PATCH',
    });
  }

  async cancelMatchRequest(id: string): Promise<any> {
    return this.request<any>(`/match-requests/${id}/cancel`, {
      method: 'POST',
    });
  }

  // --- REPORTING & SHIFT AUDIT (E06 & E16) ---
  async getEquipmentStats(): Promise<any> {
    return this.request('/rentals/reports/stats');
  }

  async getFacilityRatingBreakdown(): Promise<any[]> {
    return this.request('/reviews/reports/facility-breakdown');
  }

  async checkShiftUnreturnedRentals(shiftId: string): Promise<any> {
    return this.request(`/admin/shifts/${shiftId}/unreturned-rentals`);
  }
}

export const api = new ApiService();
