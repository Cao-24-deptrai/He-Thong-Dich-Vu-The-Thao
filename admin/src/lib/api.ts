// admin/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface User {
  _id: string;
  id?: string;
  phone: string;
  fullName: string;
  email?: string;
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'OWNER' | 'ADMIN' | 'PT';
  permissions?: string[];
  isPhoneVerified?: boolean;
  invoiceInfo?: {
    buyerTaxCode?: string;
    companyName?: string;
    companyAddress?: string;
  };
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
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'PAST' | 'MAINTENANCE';
  holdExpiresAt?: string | Date;
  countdownSeconds?: number;
}

export interface VenueAvailability {
  venueId: string;
  date: string;
  slots: SlotAvailability[];
  matrix48?: Array<{
    slotIndex: number;
    slot: string;
    startTime: string;
    endTime: string;
    status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'MAINTENANCE';
    price: number;
    holdExpiresAt?: string | Date;
    countdownSeconds?: number;
    isOperating?: boolean;
  }>;
  summary?: {
    total48: number;
    availableCount: number;
    heldCount: number;
    confirmedCount: number;
    maintenanceCount: number;
  };
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
  isRecurring?: boolean;
  recurringGroupId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  refundNote?: string;
  refundedAt?: string;
  createdAt?: string;
}

export interface CheckRecurringDto {
  venueId: string;
  startDate: string;
  weekCount: number;
  daysOfWeek?: number[];
  startTime: string;
  endTime: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CheckRecurringResult {
  hasConflict: boolean;
  conflictCount: number;
  totalSessions: number;
  totalPrice: number;
  checkedDates: Array<{
    date: string;
    isAvailable: boolean;
    conflictReason?: string;
  }>;
}

export interface WalkInRecurringDto extends CheckRecurringDto {
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  note?: string;
}

// Bản đồ phân rã Sân Ghép về đơn vị cơ sở (Leaf Units) tương thích với Backend
export const PITCH_LEAF_MAP: Record<string, string[]> = {
  'F1': ['F1'],
  'F2': ['F2'],
  'F3': ['F3'],
  'F4': ['F4'],
  'F5': ['F5'],
  'F6': ['F6'],
  'S7-A': ['F1', 'F2'],
  'S7-B': ['F3', 'F4'],
  'S7-C': ['F5', 'F6'],
  'S11': ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
};

export function getVenueLeaves(venueName: string): string[] {
  const upper = venueName.toUpperCase();
  for (const key of Object.keys(PITCH_LEAF_MAP)) {
    if (upper.includes(key)) {
      return PITCH_LEAF_MAP[key];
    }
  }
  return [venueName];
}

export function findLinkedVenues(targetVenue: Venue, allVenues: Venue[]): Venue[] {
  const targetLeaves = getVenueLeaves(targetVenue.name);
  return allVenues.filter((v) => {
    if (v._id === targetVenue._id) return false;
    const vLeaves = getVenueLeaves(v.name);
    return targetLeaves.some((leaf) => vLeaves.includes(leaf));
  });
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

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  public setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
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

  public async logout() {
    if (typeof window !== 'undefined') {
      try {
        await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
      } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
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

    // Cơ chế Silent Refresh: Tự động dùng Refresh Token cấp Access Token mới khi nhận mã 401
    if (response.status === 401 && !isRetry && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken, deviceId: 'admin-web-client' }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.accessToken) {
              this.setToken(refreshData.accessToken);
              if (refreshData.refreshToken) {
                this.setRefreshToken(refreshData.refreshToken);
              }
              // Thử lại request ban đầu với token mới (Request Retry)
              return this.request<T>(endpoint, options, true);
            }
          }
        } catch (e) {
          console.error('Silent refresh failed:', e);
        }
      }
      // Không thể refresh -> Hết hạn phiên làm việc
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }

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
  async login(phone: string, password: string): Promise<{ accessToken: string; refreshToken?: string; user: User }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, deviceName: 'Web Admin Dashboard' }),
    });
    const token = res.accessToken || res.access_token || '';
    this.setToken(token);
    if (res.refreshToken) {
      this.setRefreshToken(res.refreshToken);
    }
    this.setUser(res.user);
    return { accessToken: token, refreshToken: res.refreshToken, user: res.user };
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

  // --- BOOKINGS & WALK-IN ---
  async createWalkInBooking(data: {
    venueId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    customerName: string;
    customerPhone: string;
    paymentMethod: 'CASH' | 'VIETQR' | string;
    note?: string;
  }): Promise<Booking> {
    return this.request<Booking>('/bookings/walk-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- RECURRING BOOKINGS (FR-04, US-027) ---
  async checkRecurringBooking(dto: CheckRecurringDto): Promise<CheckRecurringResult> {
    return this.request<CheckRecurringResult>('/bookings/recurring/check', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async createWalkInRecurringBooking(dto: WalkInRecurringDto): Promise<{
    recurringGroupId: string;
    totalSessions: number;
    totalPrice: number;
    bookings: Booking[];
  }> {
    return this.request('/bookings/recurring/walk-in', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getRecurringGroupBookings(groupId: string): Promise<Booking[]> {
    return this.request<Booking[]>(`/bookings/recurring/${groupId}`);
  }

  async getBookings(params?: {
    venueId?: string;
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Booking[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.venueId) searchParams.append('venueId', params.venueId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.date) searchParams.append('date', params.date);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<{ items: Booking[]; total: number }>(`/bookings${query}`);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async restoreLatePayment(id: string, paymentDetails?: any): Promise<{
    success: boolean;
    action: 'CONFIRMED' | 'REFUND_PENDING' | 'ALREADY_CONFIRMED';
    reason?: string;
    refundRate?: number;
    refundAmount?: number;
    conflictingUnit?: string;
    booking: Booking;
    message: string;
  }> {
    return this.request(`/bookings/${id}/restore-late-payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentDetails }),
    });
  }

  // --- CHECKIN ---
  async scanCheckin(qrToken: string): Promise<{
    message: string;
    booking: Booking;
    user?: any;
    venue?: any;
  }> {
    return this.request('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }

  async manualCheckin(bookingId: string, note?: string): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
    bookingId: string;
    bookingCode?: string;
    ticketCode?: string;
    checkedInAt: string;
    venueName?: string;
    timeSlot?: string;
    customerName?: string;
    customerPhone?: string;
    checkinMethod: string;
  }> {
    return this.request('/checkin/manual', {
      method: 'POST',
      body: JSON.stringify({ bookingId, note }),
    });
  }

  async lookupCheckinBookings(query?: string, date?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (date) params.append('date', date);
    const qs = params.toString();
    return this.request<any[]>(`/checkin/lookup${qs ? `?${qs}` : ''}`);
  }

  async getBookingQr(id: string): Promise<any> {
    return this.request<any>(`/bookings/${id}/qr`);
  }

  // --- GYM & MEMBERSHIP PASS ---
  async getAllGymPasses(): Promise<any[]> {
    return this.request<any[]>('/membership-pass/admin/all');
  }

  async checkInGymPass(data: { passId?: string; qrToken?: string }): Promise<any> {
    return this.request<any>('/membership-pass/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- MATCHMAKING ---
  async getMatchRequests(sport?: string): Promise<any[]> {
    const query = sport ? `?sport=${sport}` : '';
    return this.request<any[]>(`/match-requests${query}`);
  }

  async cancelMatchRequest(id: string): Promise<any> {
    return this.request<any>(`/match-requests/${id}/cancel`, {
      method: 'POST',
    });
  }

  // --- REFUNDS ---
  async getRefundPending(): Promise<any[]> {
    return this.request<any[]>('/admin/refund-pending');
  }

  async processRefund(bookingId: string, note?: string): Promise<any> {
    return this.request<any>(`/admin/refund/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  }

  async autoRefund(bookingId: string, reason?: string): Promise<any> {
    return this.request<any>(`/admin/refund/${bookingId}/auto`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

export const api = new ApiService();
