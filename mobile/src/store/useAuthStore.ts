// mobile/src/store/useAuthStore.ts
import { create } from 'zustand';
import { User } from '../types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, pass: string) => Promise<void>;
  register: (phone: string, pass: string, name: string, email?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null, token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: api.getToken(),
  isLoading: false,
  error: null,

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

  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, error: null });
  },
}));
