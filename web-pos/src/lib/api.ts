const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type UserRole = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'OWNER' | 'ADMIN' | 'PT';

export interface User {
  _id: string;
  id?: string;
  phone?: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions?: string[];
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
}

export interface Facility {
  _id: string;
  name: string;
  address: string;
  sportType?: string;
  sportTypes?: string[];
  isActive?: boolean;
}

export interface Venue {
  _id: string;
  facilityId: string;
  name: string;
  venueType: string;
  type?: string;
  sportType?: string;
  defaultPrice: number;
  basePricePerHour?: number;
  isActive?: boolean;
}

export interface SlotAvailability {
  startTime: string;
  endTime: string;
  price: number;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'PAST' | 'MAINTENANCE';
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
    isOperating?: boolean;
  }>;
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
  ticketCode?: string;
  refundNote?: string;
  refundAmount?: number;
  refundRate?: number;
  refundedAt?: string;
  createdAt?: string;
}

export interface Equipment {
  _id: string;
  code: string;
  name: string;
  sportType: string;
  pricingType: 'PER_TURN' | 'HOURLY' | string;
  price: number;
  depositAmount: number;
  damageFee: number;
  lostFee: number;
  totalQuantity: number;
  rentedQuantity?: number;
  damagedQuantity?: number;
  availableQuantity: number;
  isActive?: boolean;
}

export interface RentalTicketItem {
  equipmentId: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  depositAmount?: number;
  condition?: string;
  penaltyFee?: number;
}

export interface RentalTicket {
  _id: string;
  ticketCode: string;
  customerPhone: string;
  customerName?: string;
  bookingId?: string;
  rentalHours: number;
  paymentMethod: string;
  status: 'RENTING' | 'RETURNED' | 'CANCELLED' | string;
  items: RentalTicketItem[];
  totalRentalPrice: number;
  totalDepositAmount: number;
  refundDepositAmount?: number;
  totalPenaltyFee?: number;
  notes?: string;
  createdAt?: string;
  returnedAt?: string;
}

export interface CanteenProduct {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  active?: boolean;
}

export interface CanteenShift {
  _id: string;
  cashierId: string;
  openingCash: number;
  closingCash?: number;
  status: 'OPEN' | 'CLOSED';
  openedAt?: string;
  createdAt?: string;
  closedAt?: string;
}

export interface GamingMachine {
  _id: string;
  machineCode: string;
  zone: string;
  hourlyRate: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'IN_USE' | 'MAINTENANCE';
  specs?: string;
  activeSession?: any;
}

export function getHomeRouteByRole(role?: UserRole | string): string {
  if (role === 'STAFF' || role === 'MANAGER' || role === 'OWNER' || role === 'ADMIN') {
    return '/pos/checkin-walkin';
  }
  return '/login';
}

class ApiService {
  public getToken(): string | null {
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

  public getRefreshToken(): string | null {
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
      try {
        if (!user) {
          localStorage.removeItem('admin_user');
        } else {
          localStorage.setItem('admin_user', JSON.stringify(user));
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  public getUser(): User | null {
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem('admin_user');
        if (!data || data === 'undefined' || data === 'null') return null;
        return JSON.parse(data);
      } catch {
        try {
          localStorage.removeItem('admin_user');
        } catch {
          // Ignore storage errors
        }
        return null;
      }
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

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(
        `Không kết nối được máy chủ API (${API_BASE_URL}). Vui lòng khởi động backend hoặc cấu hình NEXT_PUBLIC_API_URL.`,
      );
    }

    if (response.status === 401 && !isRetry && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken, deviceId: 'phanta-web-pos' }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.accessToken) {
              this.setToken(refreshData.accessToken);
              if (refreshData.refreshToken) {
                this.setRefreshToken(refreshData.refreshToken);
              }
              return this.request<T>(endpoint, options, true);
            }
          }
        } catch {
          // Silent refresh failed
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }

    const rawText = await response.text();
    let data: any = null;
    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Lỗi HTTP ${response.status}`;
      const err = new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg)) as any;
      err.status = response.status;
      err.data = data || {};
      throw err;
    }

    return data as T;
  }

  private persistAuthSession(res: any): { accessToken: string; refreshToken?: string; user: User } {
    const token = res?.accessToken || res?.access_token || '';
    const rawUser = res?.user ? { ...res.user, _id: res.user._id || res.user.id || '' } : res?.user;
    if (token) this.setToken(token);
    if (res?.refreshToken) this.setRefreshToken(res.refreshToken);
    if (rawUser) this.setUser(rawUser);
    return {
      accessToken: token,
      refreshToken: res?.refreshToken,
      user: rawUser,
    };
  }

  // --- AUTH ---
  async login(phone: string, password: string): Promise<{ accessToken: string; refreshToken?: string; user: User }> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, deviceName: 'Phanta Web POS' }),
    });
    return this.persistAuthSession(res);
  }

  async register(payload: {
    phone: string;
    password: string;
    fullName: string;
    email?: string;
    role?: UserRole;
  }): Promise<{ accessToken?: string; refreshToken?: string; user?: User; message?: string }> {
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.accessToken && res?.user) {
      return this.persistAuthSession(res);
    }
    return res;
  }

  async getMyProfile(): Promise<User> {
    const user = await this.request<User>('/users/me');
    if (user) {
      const current = this.getUser();
      const merged = { ...(current || {}), ...user } as User;
      this.setUser(merged);
      return merged;
    }
    return user;
  }

  // --- FACILITIES & VENUES ---
  async getFacilities(): Promise<Facility[]> {
    return this.request<Facility[]>('/facilities');
  }

  async getVenues(facilityId?: string): Promise<Venue[]> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return this.request<Venue[]>(`/venues${query}`);
  }

  async getVenueAvailability(venueId: string, date: string): Promise<VenueAvailability> {
    return this.request<VenueAvailability>(`/venues/${venueId}/availability?date=${date}`);
  }

  // --- WALK-IN BOOKING & CHECK-IN ---
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

  async scanCheckin(qrToken: string): Promise<{ message: string; booking: Booking }> {
    return this.request<{ message: string; booking: Booking }>('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }

  async manualCheckin(bookingId: string, note?: string): Promise<any> {
    return this.request<any>('/checkin/manual', {
      method: 'POST',
      body: JSON.stringify({ bookingId, note }),
    });
  }

  // --- REFUNDS ---
  async getRefundPending(): Promise<Booking[]> {
    return this.request<Booking[]>('/admin/refund-pending');
  }

  async processRefund(bookingId: string, note?: string): Promise<{ message: string; booking: Booking }> {
    return this.request<{ message: string; booking: Booking }>(`/admin/refund/${bookingId}`, {
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

  // --- RENTALS ---
  async getEquipments(params?: { sportType?: string; search?: string; availableOnly?: boolean }): Promise<Equipment[]> {
    const qs = new URLSearchParams();
    if (params?.sportType) qs.append('sportType', params.sportType);
    if (params?.search) qs.append('search', params.search);
    if (params?.availableOnly) qs.append('availableOnly', 'true');
    return this.request<Equipment[]>(`/rentals/equipments${qs.toString() ? `?${qs.toString()}` : ''}`);
  }

  async getRentalTickets(params?: { status?: string; customerPhone?: string }): Promise<RentalTicket[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.customerPhone) qs.append('customerPhone', params.customerPhone);
    return this.request<RentalTicket[]>(`/rentals/tickets${qs.toString() ? `?${qs.toString()}` : ''}`);
  }

  async createRentalTicket(data: {
    customerPhone: string;
    customerName?: string;
    bookingId?: string;
    rentalHours: number;
    paymentMethod: 'CASH' | 'VIETQR';
    items: Array<{ equipmentId: string; quantity: number }>;
    notes?: string;
  }): Promise<RentalTicket> {
    return this.request<RentalTicket>('/rentals/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async returnRentalTicket(
    id: string,
    data: {
      items: Array<{ equipmentId: string; condition: 'GOOD' | 'DAMAGED' | 'LOST'; customPenaltyFee?: number }>;
      notes?: string;
    },
  ): Promise<RentalTicket> {
    return this.request<RentalTicket>(`/rentals/tickets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- GYM MEMBERSHIP ---
  async getAllGymPasses(): Promise<any[]> {
    return this.request<any[]>('/membership-pass/admin/all');
  }

  async checkInGymPass(payload: { passId?: string; qrToken?: string }): Promise<any> {
    return this.request<any>('/membership-pass/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- CANTEEN & CASHIER SHIFT ---
  async getCanteenProducts(): Promise<CanteenProduct[]> {
    return this.request<CanteenProduct[]>('/canteen/products');
  }

  async createCanteenOrder(payload: {
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: 'CASH' | 'TRANSFER';
  }): Promise<any> {
    return this.request<any>('/canteen/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCurrentShift(): Promise<CanteenShift | null> {
    const shift = await this.request<CanteenShift | null>('/canteen/shifts/current');
    return shift && shift._id ? shift : null;
  }

  async openShift(openingCash: number): Promise<CanteenShift> {
    return this.request<CanteenShift>('/canteen/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ openingCash }),
    });
  }

  async closeShift(shiftId: string, closingCash: number): Promise<CanteenShift> {
    return this.request<CanteenShift>(`/canteen/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify({ closingCash }),
    });
  }

  // --- GAMING 100 PC ---
  async getGamingMachines(zone?: string): Promise<GamingMachine[]> {
    const q = zone && zone !== 'ALL' ? `?zone=${encodeURIComponent(zone)}` : '';
    return this.request<GamingMachine[]>(`/gaming/machines${q}`);
  }

  async startGamingSession(payload: { machineCode: string; customerName?: string; prepaidHours?: number }): Promise<any> {
    return this.request<any>('/gaming/sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async endGamingSession(payload: { sessionCode: string; reason?: string }): Promise<any> {
    return this.request<any>('/gaming/sessions/end', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async switchGamingMachine(payload: { sessionCode: string; targetMachineCode: string }): Promise<any> {
    return this.request<any>('/gaming/sessions/switch-machine', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async remoteControlGaming(payload: { machineCode: string; command: string; message?: string }): Promise<any> {
    return this.request<any>('/gaming/remote-control', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
