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
  pricingConfig?: PricingRule[];
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
  async getFacilities(): Promise<Facility[]> {
    return this.request<Facility[]>('/facilities');
  }

  async createFacility(data: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>('/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- VENUES ---
  async getVenues(facilityId?: string): Promise<Venue[]> {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return this.request<Venue[]>(`/venues${query}`);
  }

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    return this.request<Venue>('/venues', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async cancelMatchRequest(id: string): Promise<any> {
    return this.request<any>(`/match-requests/${id}/cancel`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
