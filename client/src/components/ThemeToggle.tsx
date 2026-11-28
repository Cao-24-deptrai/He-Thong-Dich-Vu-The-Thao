'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('phanta_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('phanta_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 opacity-0" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển chế độ giao diện sáng hoặc tối"
      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#171C1A] dark:text-[#F3F4F6] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-[#3B4540]" />
      ) : (
        <Sun className="w-4 h-4 text-[#9CFF93]" />
      )}
    </button>
  );
}
