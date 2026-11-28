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
  CustomerTierInfo,
} from '../types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000');

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
      const err = new Error(
        typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
      ) as Error & { status?: number; data?: unknown };
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  // --- AUTH ---
  async register(
    phone: string,
    password: string,
    fullName: string,
    email?: string
  ): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, fullName, email }),
    });
    const token = res.accessToken || res.access_token;
    this.setToken(token);
    return { accessToken: token, user: res.user };
  }

  async login(
    phone: string,
    password: string
  ): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    const token = res.accessToken || res.access_token;
    this.setToken(token);
    return { accessToken: token, user: res.user };
  }

  async sendOtp(phone: string): Promise<{ message: string }> {
    return this.request<any>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(
    phone: string,
    code: string
  ): Promise<{ accessToken: string; user: User }> {
    const res = await this.request<any>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    const token = res.accessToken || res.access_token;
    this.setToken(token);
    return { accessToken: token, user: res.user };
  }

  async getAuthMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.setToken(null);
    }
  }

  // --- USERS ---
  async getMyProfile(): Promise<any> {
    return this.request<any>('/users/me');
  }

  async updateMyProfile(payload: {
    fullName?: string;
    email?: string;
    bio?: string;
    favoriteSports?: string[];
  }): Promise<any> {
    return this.request<any>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getUserTierInfo(): Promise<CustomerTierInfo> {
    return this.request<CustomerTierInfo>('/users/tier-info');
  }

  // --- FACILITIES & VENUES ---
  async getFacilities(sportType?: string): Promise<Facility[]> {
    const query = sportType ? `?sportType=${sportType}` : '';
    return this.request<Facility[]>(`/facilities${query}`);
  }

  async getVenues(facilityId: string): Promise<Venue[]> {
    return this.request<Venue[]>(`/venues?facilityId=${facilityId}`);
  }

  async getVenueAvailability(
    venueId: string,
    date: string
  ): Promise<VenueAvailability> {
    return this.request<VenueAvailability>(
      `/venues/${venueId}/availability?date=${date}`
    );
  }

  // --- BOOKINGS & RECURRING ---
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

  async checkRecurring(payload: any): Promise<any> {
    return this.request<any>('/bookings/recurring/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createRecurring(payload: any): Promise<any> {
    return this.request<any>('/bookings/recurring', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- PAYMENT & CHECKIN ---
  async createPaymentLink(bookingId: string): Promise<PaymentLinkResponse> {
    return this.request<PaymentLinkResponse>('/payments/create-link', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  }

  async getPaymentStatus(bookingId: string): Promise<any> {
    return this.request<any>(`/payments/status/${bookingId}`);
  }

  async getDynamicQr(bookingId: string): Promise<QrTokenResponse> {
    return this.request<QrTokenResponse>(`/bookings/${bookingId}/qr`);
  }

  async scanCheckin(qrToken: string): Promise<any> {
    return this.request<any>('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }

  // --- WALLET ---
  async getMyWallet(): Promise<{
    balance: number;
    heldBalance?: number;
    status?: string;
  }> {
    return this.request<any>('/wallets/me');
  }

  async getMyWalletTransactions(type?: string): Promise<any> {
    const query = type ? `?type=${type}` : '';
    return this.request<any>(`/wallets/me/transactions${query}`);
  }

  async topupWallet(amount: number, note?: string): Promise<any> {
    return this.request<any>('/wallets/topup', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        idempotencyKey: `TOPUP-${Date.now()}`,
        note: note || 'Nạp tiền qua VietQR',
      }),
    });
  }

  async payWithWallet(payload: {
    amount: number;
    category: string;
    refType: string;
    refId: string;
    note?: string;
  }): Promise<any> {
    return this.request<any>('/wallets/pay', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        idempotencyKey: `PAY-${payload.refId}-${Date.now()}`,
      }),
    });
  }

  // --- GYM & POOL ---
  async getGymPlans(): Promise<any[]> {
    return this.request<any[]>('/gym/plans');
  }

  async getMyGymQr(): Promise<any> {
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

  async getGymCapacity(): Promise<{
    insideCount: number;
    maxCapacity: number;
    isFull: boolean;
    occupancyPercentage: number;
    availableSpots: number;
  }> {
    return this.request<any>('/gym/capacity');
  }

  async getPoolStatus(): Promise<any> {
    return this.request<any>('/pool/status');
  }

  async purchasePoolTickets(payload: {
    adultCount: number;
    childCount: number;
    customerPhone?: string;
    customerName?: string;
  }): Promise<any> {
    return this.request<any>('/pool/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMyPoolTickets(): Promise<any[]> {
    return this.request<any[]>('/pool/tickets/my');
  }

  // --- GAMING ---
  async getGamingMachines(zone?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (zone) params.append('zone', zone);
    if (status) params.append('status', status);
    const qs = params.toString();
    return this.request<any[]>(`/gaming/machines${qs ? `?${qs}` : ''}`);
  }

  async startGamingSession(payload: {
    machineId: string;
    depositAmount?: number;
  }): Promise<any> {
    return this.request<any>('/gaming/sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- PT & CLASSES ---
  async getTrainers(specialty?: string): Promise<any[]> {
    const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
    return this.request<any[]>(`/pt-classes/trainers${query}`);
  }

  async getClasses(classType?: string): Promise<any[]> {
    const query = classType ? `?classType=${encodeURIComponent(classType)}` : '';
    return this.request<any[]>(`/pt-classes/classes${query}`);
  }

  async bookPtSession(payload: {
    trainerId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<any> {
    return this.request<any>('/pt-classes/pt/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async registerClass(classId: string, payload?: { notes?: string }): Promise<any> {
    return this.request<any>(`/pt-classes/classes/${classId}/register`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  // --- MATCHMAKING ---
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

  // --- VOUCHERS ---
  async getVouchers(onlyActive: boolean = true): Promise<Voucher[]> {
    const query = onlyActive ? '?onlyActive=true' : '';
    return this.request<Voucher[]>(`/vouchers${query}`);
  }

  async validateVoucher(
    code: string,
    orderAmount: number,
    venueId?: string,
    sportType?: string
  ): Promise<VoucherValidationResult> {
    return this.request<VoucherValidationResult>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: code.toUpperCase(),
        orderAmount,
        venueId,
        sportType,
      }),
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

  // --- REVIEWS ---
  async getReviewSummary(facilityId?: string): Promise<any> {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return this.request<any>(`/reviews/summary${query}`);
  }

  async createReview(payload: {
    bookingId: string;
    facilityRating: number;
    serviceRating: number;
    staffRating: number;
    cleanlinessRating: number;
    comment: string;
  }): Promise<any> {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- NOTIFICATIONS ---
  async getMyNotifications(): Promise<any[]> {
    return this.request<any[]>('/notifications/me');
  }

  async markNotificationRead(id: string): Promise<any> {
    return this.request<any>(`/notifications/me/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(): Promise<any> {
    return this.request<any>('/notifications/me/read-all', {
      method: 'POST',
    });
  }

  // --- RENTALS / EQUIPMENTS ---
  async getEquipments(): Promise<any[]> {
    return this.request<any[]>('/rentals/equipments');
  }
}

export const api = new ApiClient();
