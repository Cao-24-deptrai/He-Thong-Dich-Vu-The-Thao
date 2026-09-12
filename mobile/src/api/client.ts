// mobile/src/api/client.ts
import { 
  User, 
  Facility, 
  Venue, 
  VenueAvailability, 
  Booking, 
  PaymentLinkResponse, 
  QrTokenResponse 
} from '../types';

const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location ? `http://${window.location.hostname}:3000` : 'http://localhost:3000');

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('mobile_token', token);
      } else {
        window.localStorage.removeItem('mobile_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('mobile_token');
    }
    return this.token;
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
      const errorMsg = data.message || data.error || `HTTP ${response.status}`;
      const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)) as any;
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  // --- AUTH ---
  async register(phone: string, password: string, fullName: string, email?: string): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, fullName, email }),
    });
    const token = res.accessToken || res.access_token;
    this.setToken(token);
    return { accessToken: token, user: res.user };
  }

  async login(phone: string, password: string): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    const token = res.accessToken || res.access_token;
    this.setToken(token);
    return { accessToken: token, user: res.user };
  }

  // --- FACILITIES & VENUES ---
  async getFacilities(sportType?: string): Promise<Facility[]> {
    const query = sportType ? `?sportType=${sportType}` : '';
    return this.request<Facility[]>(`/facilities${query}`);
  }

  async getVenues(facilityId: string): Promise<Venue[]> {
    return this.request<Venue[]>(`/venues?facilityId=${facilityId}`);
  }

  async getVenueAvailability(venueId: string, date: string): Promise<VenueAvailability> {
    return this.request<VenueAvailability>(`/venues/${venueId}/availability?date=${date}`);
  }

  // --- BOOKING ENGINE ---
  async holdSlot(payload: {
    venueId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
  }): Promise<Booking> {
    return this.request<Booking>('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/bookings/me');
  }

  async cancelBooking(bookingId: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
  }

  // --- PAYMENT (PAYOS / VIETQR) ---
  async createPaymentLink(bookingId: string): Promise<PaymentLinkResponse> {
    return this.request<PaymentLinkResponse>('/payments/create-link', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  }

  // --- DYNAMIC QR TICKET ---
  async getDynamicQr(bookingId: string): Promise<QrTokenResponse> {
    return this.request<QrTokenResponse>(`/bookings/${bookingId}/qr`);
  }

  // --- GYM MEMBERSHIP (Mục 6.1) ---
  async purchaseGymPass(type: 'SINGLE_PASS' | 'MONTHLY_PASS' | 'YEARLY_PASS', paymentProvider?: string): Promise<any> {
    return this.request<any>('/membership-pass/purchase', {
      method: 'POST',
      body: JSON.stringify({ type, paymentProvider: paymentProvider || 'PAYOS' }),
    });
  }

  async getMyGymPasses(): Promise<any[]> {
    return this.request<any[]>('/membership-pass/me');
  }

  async getGymPassQr(passId: string): Promise<{ qrToken: string; expiresInSeconds: number; remainingCheckIns: number }> {
    return this.request<any>(`/membership-pass/${passId}/qr`, {
      method: 'POST',
    });
  }

  // --- MATCHMAKING (Mục 6.3) ---
  async getMatchRequests(sportType?: string): Promise<any[]> {
    const query = sportType ? `?sportType=${sportType}` : '';
    return this.request<any[]>(`/match-requests${query}`);
  }

  async createMatchRequest(payload: {
    sportType: string;
    matchDate: string;
    locationDescription?: string;
    slotsNeeded: number;
  }): Promise<any> {
    return this.request<any>('/match-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async joinMatch(matchId: string): Promise<any> {
    return this.request<any>(`/match-requests/${matchId}/join`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
