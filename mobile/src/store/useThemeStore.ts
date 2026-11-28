import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  pendingMode: ThemeMode | null;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  commitThemeTransition: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  pendingMode: null,
  toggleTheme: () =>
    set((state) => {
      if (state.pendingMode !== null) return state;
      return { pendingMode: state.mode === 'dark' ? 'light' : 'dark' };
    }),
  setTheme: (mode) =>
    set((state) => {
      if (mode === state.mode) return state;
      return { pendingMode: mode };
    }),
  commitThemeTransition: () =>
    set((state) => ({
      mode: state.pendingMode ?? state.mode,
      pendingMode: null,
    })),
}));
