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
  courtCode?: string;
  isComposite?: boolean;
  baseUnitCodes?: string[];
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

export interface Closure {
  _id?: string;
  facilityId: string;
  resourceIds: string[];
  fromAt: string;
  toAt: string;
  reason: 'MAINTENANCE' | 'EVENT' | 'WEATHER' | 'OTHER';
  notes?: string;
  isActive?: boolean;
}

export interface PriceRuleItem {
  _id?: string;
  appliesTo: string;
  band: 'OFFPEAK' | 'PEAK' | 'NIGHT';
  dayOfWeek?: number[];
  startTime: string;
  endTime: string;
  pricePerHour: number;
  surchargePerHour?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
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


export interface Voucher {
  _id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  totalBudget: number;
  usedBudget: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  applicableSports?: string[];
  applicableVenues?: string[];
  applicableCustomerTiers?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVoucherPayload {
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  totalBudget?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startDate: string;
  endDate: string;
  applicableSports?: string[];
  applicableVenues?: string[];
  applicableCustomerTiers?: string[];
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

  // --- PRICE RULES & CLOSURES (BR-04, SRS v2.0) ---
  async getPriceRules(appliesTo?: string): Promise<PriceRuleItem[]> {
    const query = appliesTo ? `?appliesTo=${appliesTo}` : '';
    return this.request<PriceRuleItem[]>(`/facilities/price-rules${query}`);
  }

  async createPriceRule(data: Partial<PriceRuleItem>): Promise<PriceRuleItem> {
    return this.request<PriceRuleItem>('/facilities/price-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClosures(facilityId?: string, resourceId?: string): Promise<Closure[]> {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (resourceId) params.append('resourceId', resourceId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Closure[]>(`/facilities/closures${query}`);
  }

  async createClosure(data: Partial<Closure>): Promise<Closure> {
    return this.request<Closure>('/facilities/closures', {
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

  // --- GYM REAL-TIME CAPACITY & TURNSTILE (Epic E11: BR-26, BR-27, BR-29, BR-30) ---
  async getGymCapacity(): Promise<{
    insideCount: number;
    maxCapacity: number;
    isFull: boolean;
    occupancyPercentage: number;
    availableSpots: number;
  }> {
    return this.request<any>('/gym/capacity');
  }

  async scanGymTurnstile(payload: {
    qrCode: string;
    direction: 'IN' | 'OUT';
    gateId?: string;
  }): Promise<any> {
    return this.request<any>('/gym/turnstile/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async overrideGymCapacity(payload: { count: number; reason: string }): Promise<any> {
    return this.request<any>('/gym/turnstile/override', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resetGymCapacity(): Promise<any> {
    return this.request<any>('/gym/turnstile/reset', {
      method: 'POST',
    });
  }

  async getGymTurnstileLogs(limit: number = 20): Promise<any[]> {
    return this.request<any[]>(`/gym/turnstile/logs?limit=${limit}`);
  }

  async getGymPlans(): Promise<any[]> {
    return this.request<any[]>('/gym/plans');
  }

  // --- POOL TICKETS & EMERGENCIES (Epic E11: BR-31, AC-87) ---
  async getPoolStatus(): Promise<any> {
    return this.request<any>('/pool/status');
  }

  async scanPoolTicket(payload: { ticketCode: string; poolCode: 'POOL_50M' | 'POOL_25M' }): Promise<any> {
    return this.request<any>('/pool/turnstile/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkoutPool(payload: { poolCode: 'POOL_50M' | 'POOL_25M' }): Promise<any> {
    return this.request<any>('/pool/turnstile/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async emergencyClosePool(payload: { poolCode: 'POOL_50M' | 'POOL_25M'; reason: string }): Promise<any> {
    return this.request<any>('/pool/emergency-close', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reopenPool(payload: { poolCode: 'POOL_50M' | 'POOL_25M' }): Promise<any> {
    return this.request<any>('/pool/reopen', {
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

  // --- LEDGER & EXCEL EXPORT (Giai đoạn 4.3) ---
  async getBookingsLedger(params?: {
    search?: string;
    status?: string;
    sportCategory?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.sportCategory) query.append('sportCategory', params.sportCategory);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/admin/bookings${qs}`);
  }

  getExcelExportUrl(params?: {
    search?: string;
    status?: string;
    sportCategory?: string;
  }): string {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.sportCategory) query.append('sportCategory', params.sportCategory);
    const token = this.getToken();
    if (token) query.append('token', token);

    return `${API_BASE_URL}/admin/export/bookings?${query.toString()}`;
  }

  // --- VOUCHERS & KHUYẾN MÃI (Epic E13) ---
  async getVouchers(onlyActive?: boolean): Promise<Voucher[]> {
    const qs = onlyActive ? '?onlyActive=true' : '';
    return this.request<Voucher[]>(`/vouchers${qs}`);
  }

  async getVoucherByCode(code: string): Promise<Voucher> {
    return this.request<Voucher>(`/vouchers/${code}`);
  }

  async createVoucher(payload: CreateVoucherPayload): Promise<Voucher> {
    return this.request<Voucher>('/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async validateVoucher(code: string, orderAmount: number, sportType?: string): Promise<any> {
    return this.request<any>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount, sportType }),
    });
  }

  async applyVoucher(code: string, orderAmount: number, bookingId?: string): Promise<any> {
    return this.request<any>('/vouchers/apply', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount, bookingId }),
    });
  }

}

export const api = new ApiService();
