import { create } from 'zustand';
import { User } from '../types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (phone: string, pass: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  register: (phone: string, pass: string, name: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null, token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: api.getToken(),
  isLoading: false,
  error: null,

  hydrate: async () => {
    const token = api.getToken();
    if (!token) return;
    try {
      const user = await api.getAuthMe();
      set({ user, token });
    } catch {
      api.setToken(null);
      set({ user: null, token: null });
    }
  },

  setUser: (user, token) => {
    api.setToken(token);
    set({ user, token });
  },

  login: async (phone, pass) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(phone, pass);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Đăng nhập thất bại', isLoading: false });
      throw err;
    }
  },

  sendOtp: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      await api.sendOtp(phone);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Không thể gửi mã OTP', isLoading: false });
      throw err;
    }
  },

  verifyOtp: async (phone, code) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.verifyOtp(phone, code);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Mã OTP không hợp lệ', isLoading: false });
      throw err;
    }
  },

  register: async (phone, pass, name, email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(phone, pass, name, email);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Đăng ký thất bại', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await api.logout();
    set({ user: null, token: null, error: null });
  },
}));
