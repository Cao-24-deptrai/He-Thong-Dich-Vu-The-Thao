// mobile/src/api/client.ts
import { 
  User, 
  Facility, 
  Venue, 
  VenueAvailability, 
  Booking, 
  PaymentLinkResponse, 
  QrTokenResponse,
  Voucher,
  VoucherValidationResult,
  CustomerTierInfo
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

  // --- GYM MEMBERSHIP & QR ACCESS (Epic E11: BR-26, BR-27, BR-28, BR-29, BR-30, AC-70) ---
  async getGymPlans(): Promise<any[]> {
    return this.request<any[]>('/gym/plans');
  }

  async getMyGymQr(): Promise<{
    hasCredential: boolean;
    qrCode?: string;
    status?: 'ACTIVE' | 'EXPIRED';
    planType?: string;
    planName?: string;
    startDate?: string;
    endDate?: string;
    daysRemaining?: number;
    message?: string;
  }> {
    return this.request<any>('/gym/my-qr');
  }

  async purchaseOrRenewGymPlan(payload: {
    planType: 'DAY_1' | 'MONTH_1' | 'MONTH_3' | 'MONTH_6';
    paymentMethod?: string;
  }): Promise<any> {
    return this.request<any>('/gym/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async calculateGymUpgrade(newPlanType: 'DAY_1' | 'MONTH_1' | 'MONTH_3' | 'MONTH_6'): Promise<{
    canUpgrade: boolean;
    currentPlanPrice: number;
    newPlanPrice: number;
    daysRemaining: number;
    totalDays: number;
    creditAmount: number;
    finalAmount: number;
    reason?: string;
  }> {
    return this.request<any>('/gym/calculate-upgrade', {
      method: 'POST',
      body: JSON.stringify({ newPlanType }),
    });
  }

  async getGymCapacity(): Promise<{
    insideCount: number;
    maxCapacity: number;
    isFull: boolean;
    occupancyPercentage: number;
    availableSpots: number;
  }> {
    return this.request<any>('/gym/capacity');
  }

  // --- POOL TICKETS (Epic E11: BR-31, AC-87) ---
  async getPoolStatus(): Promise<any> {
    return this.request<any>('/pool/status');
  }

  async purchasePoolTickets(payload: {
    adultCount: number;
    childCount: number;
    customerPhone?: string;
    customerName?: string;
  }): Promise<{
    success: boolean;
    totalAmount: number;
    tickets: any[];
    message: string;
  }> {
    return this.request<any>('/pool/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyPoolTickets(): Promise<any[]> {
    return this.request<any[]>('/pool/tickets/my');
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
  // --- VOUCHERS & CUSTOMER TIERS (M15) ---
  async getVouchers(onlyActive: boolean = true): Promise<Voucher[]> {
    const query = onlyActive ? '?onlyActive=true' : '';
    return this.request<Voucher[]>(`/vouchers${query}`);
  }

  async getVoucherByCode(code: string): Promise<Voucher> {
    return this.request<Voucher>(`/vouchers/${code.toUpperCase()}`);
  }

  async validateVoucher(
    code: string,
    orderAmount: number,
    venueId?: string,
    sportType?: string
  ): Promise<VoucherValidationResult> {
    return this.request<VoucherValidationResult>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code: code.toUpperCase(), orderAmount, venueId, sportType }),
    });
  }

  async applyVoucher(payload: {
    code: string;
    bookingId: string;
    orderAmount: number;
    venueId?: string;
    sportType?: string;
  }): Promise<any> {
    return this.request<any>('/vouchers/apply', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        code: payload.code.toUpperCase(),
      }),
    });
  }

  async getUserTierInfo(): Promise<CustomerTierInfo> {
    return this.request<CustomerTierInfo>('/users/tier-info');
  }

  async recalculateUserTier(): Promise<CustomerTierInfo> {
    return this.request<CustomerTierInfo>('/users/recalculate-tier', {
      method: 'POST',
    });
  }

  async redeemLoyaltyPoints(points: number, bookingId?: string): Promise<any> {
    return this.request<any>('/users/redeem-points', {
      method: 'POST',
      body: JSON.stringify({ points, bookingId }),
    });
  }
}

export const api = new ApiClient();
