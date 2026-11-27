'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type PosTheme = 'dark' | 'light';

interface PosThemeContextValue {
  theme: PosTheme;
  toggleTheme: () => void;
  setTheme: (theme: PosTheme) => void;
}

const PosThemeContext = createContext<PosThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'phanta_pos_theme';

export function PosThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<PosTheme>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved);
    }
  }, []);

  const setTheme = (next: PosTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <PosThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div
        data-pos-theme={theme}
        className="phanta-pos-theme min-h-screen w-full transition-colors duration-200"
      >
        {children}
      </div>
    </PosThemeContext.Provider>
  );
}

export function usePosTheme() {
  return useContext(PosThemeContext);
}
