'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Ticket, HelpCircle, User as UserIcon } from 'lucide-react';
import { User } from '@/lib/api';

interface MobileBottomNavProps {
  user: User | null;
}

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/home',
      label: 'Trang chính',
      icon: Home,
      isActive: pathname === '/home' || pathname === '/',
    },
    {
      href: '/booking',
      label: 'Đặt sân',
      icon: Calendar,
      isActive: pathname.startsWith('/booking'),
    },
    {
      href: '/my-tickets',
      label: 'Vé của tôi',
      icon: Ticket,
      isActive: pathname.startsWith('/my-tickets'),
    },
    {
      href: '/support',
      label: 'Hỗ trợ',
      icon: HelpCircle,
      isActive: pathname.startsWith('/support'),
    },
    {
      href: user ? '/profile' : '/login',
      label: user ? 'Tài khoản' : 'Đăng nhập',
      icon: UserIcon,
      isActive: pathname.startsWith('/profile') || pathname === '/login' || pathname === '/register',
    },
  ];

  return (
    <nav
      aria-label="Điều hướng chính trên di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0C0F0C]/95 border-t border-[#E3E8E6] dark:border-white/10 backdrop-blur-md px-2 py-1 safe-area-bottom"
    >
      <div className="grid grid-cols-5 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-1 relative transition-colors ${
                item.isActive
                  ? 'text-[#00B562] dark:text-[#9CFF93] font-semibold'
                  : 'text-[#758A80] dark:text-[#A1A79F] hover:text-[#171C1A] dark:hover:text-white'
              }`}
            >
              {item.isActive && (
                <span className="absolute -top-1 w-8 h-0.5 bg-[#00B562] dark:bg-[#9CFF93] rounded-full" />
              )}
              <Icon className="w-5 h-5 mb-1 stroke-[1.75]" />
              <span className="text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
