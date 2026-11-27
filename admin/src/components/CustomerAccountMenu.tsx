'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  Settings,
  Bell,
  Ticket,
  LogOut,
} from 'lucide-react';
import { User } from '@/lib/api';

interface CustomerAccountMenuProps {
  user: User;
  onLogout: () => void;
}

export default function CustomerAccountMenu({ user, onLogout }: CustomerAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (user.fullName || user.phone || 'U')
    .trim()
    .split(/\s+/)
    .slice(-1)[0]
    ?.charAt(0)
    .toUpperCase();

  const renderAvatar = (sizeClass = 'w-9 h-9 text-sm') => {
    if (user.avatarUrl) {
      return (
        <img
          src={user.avatarUrl}
          alt={user.fullName || 'Avatar'}
          className={`${sizeClass} rounded-full object-cover border border-[#00B562]/40 dark:border-[#9CFF93]/40`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-[#E6F8F0] dark:bg-[#22261E] text-[#00B562] dark:text-[#9CFF93] border border-[#00B562]/30 dark:border-[#9CFF93]/30 flex items-center justify-center font-heading font-bold select-none`}
      >
        {initials || <UserIcon className="w-4 h-4" />}
      </div>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Mở menu tài khoản"
        className="rounded-full p-0.5 hover:ring-2 hover:ring-[#00B562]/40 dark:hover:ring-[#9CFF93]/40 transition-all focus:outline-none"
      >
        {renderAvatar('w-9 h-9 text-sm')}
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] shadow-xl z-50 overflow-hidden">
          {/* Ô 1: Avatar, Tên, Email đăng ký */}
          <div className="p-4 flex items-center space-x-3 border-b border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512]">
            {renderAvatar('w-11 h-11 text-base shrink-0')}
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-sm text-[#171C1A] dark:text-white truncate">
                {user.fullName || user.phone}
              </p>
              <p className="text-xs text-[#758A80] dark:text-[#A1A79F] truncate">
                {user.email ? user.email : 'Chưa có email'}
              </p>
            </div>
          </div>

          {/* Ô 2: Xem thông tin cá nhân & Ô 3: Cài đặt */}
          <div className="p-1.5 border-b border-[#E3E8E6] dark:border-white/10 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
            >
              <UserIcon className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
              <span>Xem thông tin cá nhân</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
              <span>Cài đặt</span>
            </Link>
          </div>

          {/* Các ô tiếp theo: Thông báo, Lịch sử đặt sân */}
          <div className="p-1.5 border-b border-[#E3E8E6] dark:border-white/10 space-y-0.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
            >
              <Bell className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
              <span>Thông báo</span>
            </Link>

            <Link
              href="/my-tickets"
              onClick={() => setOpen(false)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
            >
              <Ticket className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
              <span>Lịch sử đặt sân</span>
            </Link>
          </div>

          {/* Đăng xuất */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
