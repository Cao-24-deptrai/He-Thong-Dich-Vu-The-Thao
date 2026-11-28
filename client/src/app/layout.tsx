// admin/src/app/layout.tsx
'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  CalendarPlus, 
  QrCode, 
  RotateCcw, 
  LogOut, 
  User as UserIcon, 
  Activity,
  Menu,
  X,
  Dumbbell,
  Users,
  Award,
  Trophy,
  Gamepad2,
  Cpu,
  Receipt,
  Bell,
  Coffee,
  BarChart3,
  PackageCheck,
  Star,
  Ticket,
  ChevronDown,
  MapPin,
  Home,
  HelpCircle,
  Info
} from 'lucide-react';
import { api, User } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import MobileBottomNav from '@/components/MobileBottomNav';
import PhoneCompletionBanner from '@/components/PhoneCompletionBanner';
import CustomerAccountMenu from '@/components/CustomerAccountMenu';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  useEffect(() => {
    setMounted(true);
    const currentUser = api.getUser();
    setUser(currentUser);

    // Đồng bộ thông tin mới nhất từ database về thiết bị
    if (api.getToken()) {
      api
        .getMyProfile()
        .then((fresh) => {
          if (fresh) setUser(fresh);
        })
        .catch(() => {});
    }

    const handleUserUpdated = () => {
      setUser(api.getUser());
    };
    window.addEventListener('phanta_user_updated', handleUserUpdated);
    return () => window.removeEventListener('phanta_user_updated', handleUserUpdated);
  }, []);

  useEffect(() => {
    const currentUser = api.getUser();
    setUser(currentUser);

    if (currentUser && currentUser.role !== 'CUSTOMER') {
      api.logout();
      const adminUrl =
        typeof window !== 'undefined' && window.location.hostname.includes('phanta.id.vn')
          ? 'https://admin.phanta.id.vn/login?notice=staff_redirect'
          : 'http://localhost:3002/login?notice=staff_redirect';
      window.location.href = adminUrl;
      return;
    }

    const customerRoutesList = ['/home', '/booking', '/my-tickets', '/support', '/about', '/profile', '/settings', '/notifications', '/policies', '/rules'];
    const isCustomerRoute = customerRoutesList.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );
    const authPublicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicAuthPath = authPublicRoutes.includes(pathname);

    if (!isCustomerRoute && !isPublicAuthPath) {
      router.replace('/home');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  const customerNavLinks = [
    { href: '/home', label: 'Trang chính' },
    { href: '/booking', label: 'Đặt sân' },
    { href: '/my-tickets', label: 'Vé của tôi' },
    { href: '/support', label: 'Hỗ trợ' },
    { href: '/about', label: 'Giới thiệu' },
  ];

  return (
    <html lang="vi" data-theme="light">
      <head>
        <title>Phanta Sports - Đặt Sân Thể Thao Trực Tuyến</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/Phanta Sports Booking Emblem.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,500;0,600;0,700;0,800;0,900;1,700&family=Lexend:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('phanta_theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={
          isAuthPage
            ? 'bg-slate-900 text-slate-100 min-h-screen font-body'
            : 'bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col min-h-screen relative font-body transition-colors duration-200'
        }
      >
        {isAuthPage ? (
          children
        ) : (
          <>
            {/* Playo-Style Customer Header */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0C0F0C]/95 border-b border-[#E3E8E6] dark:border-white/10 backdrop-blur-md transition-colors">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
                {/* Brand Logo & Geolocation */}
                <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
                  <Link href="/home" className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 relative shrink-0 dark:bg-[#F3F4F6] dark:rounded-lg dark:p-1 flex items-center justify-center">
                      <Image
                        src="/PHANTAtransparent.png"
                        alt="Phanta Sports Logo"
                        width={40}
                        height={40}
                        className="object-contain"
                        priority
                      />
                    </div>
                    <div className="leading-none">
                      <span className="font-heading font-black text-xl tracking-tight text-[#171C1A] dark:text-white uppercase">
                        PHANTA
                      </span>
                      <span className="font-heading font-bold text-xs tracking-wider text-[#00B562] dark:text-[#9CFF93] block">
                        SPORTS
                      </span>
                    </div>
                  </Link>

                  {/* Geolocation pill (Playo style) */}
                  <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#E3E8E6] dark:border-white/10 text-xs text-[#3B4540] dark:text-[#D1D5DB] bg-[#F8F9FA] dark:bg-[#191C14]">
                    <MapPin className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
                    <span className="font-medium">TP. Hồ Chí Minh</span>
                  </div>
                </div>

                {/* Desktop Navigation Links */}
                <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
                  {customerNavLinks.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/home' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`text-sm tracking-tight transition-colors py-1 relative ${
                          isActive
                            ? 'text-[#00B562] dark:text-[#9CFF93] font-semibold'
                            : 'text-[#3B4540] dark:text-[#D1D5DB] hover:text-[#171C1A] dark:hover:text-white font-normal'
                        }`}
                      >
                        {item.label}
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00B562] dark:bg-[#9CFF93] rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Right Controls: Theme Toggle + Auth */}
                <div className="flex items-center space-x-3">
                  <ThemeToggle />

                  <div className="hidden sm:block w-px h-5 bg-[#E3E8E6] dark:bg-white/10" />

                  {mounted && user ? (
                    <CustomerAccountMenu user={user} onLogout={handleLogout} />
                  ) : (
                    <Link
                      href="/login"
                      className="font-heading font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg bg-[#00B562] hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:hover:bg-[#1ED760] dark:text-[#0C0F0C] transition-colors"
                    >
                      Đăng nhập
                    </Link>
                  )}
                </div>
              </div>
            </header>

            {/* Customer Page Body */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 relative z-10 pb-20 md:pb-8">
              {mounted && user && user.role === 'CUSTOMER' && !user.phone && (
                <PhoneCompletionBanner
                  user={user}
                  onUpdated={(updatedUser) => setUser(updatedUser)}
                />
              )}
              {children}
            </main>

            {/* Mobile Bottom Navigation (Sticky 5 Tabs) */}
            <MobileBottomNav user={user} />

            {/* Customer Footer (Unslop & Humanizer) */}
            <footer className="border-t border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#0C0F0C] text-[#3B4540] dark:text-[#A1A79F] transition-colors py-10 px-4 sm:px-6 lg:px-8 pb-24 md:pb-10">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand info */}
                <div className="md:col-span-1 space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 relative shrink-0 dark:bg-[#F3F4F6] dark:rounded-lg dark:p-1">
                      <Image
                        src="/PHANTAtransparent.png"
                        alt="Phanta Sports Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-heading font-black text-lg text-[#171C1A] dark:text-white uppercase tracking-tight">
                      PHANTA SPORTS
                    </span>
                  </div>
                </div>

                {/* Quick links */}
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#171C1A] dark:text-white">
                    Dịch vụ
                  </h3>
                  <ul className="space-y-1.5 text-xs">
                    <li>
                      <Link href="/booking" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Đặt sân trực tuyến
                      </Link>
                    </li>
                    <li>
                      <Link href="/my-tickets" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Tra cứu vé đã đặt
                      </Link>
                    </li>
                    <li>
                      <Link href="/home#sports" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Danh mục các bộ môn
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Policies & Support */}
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#171C1A] dark:text-white">
                    Chính sách & Hỗ trợ
                  </h3>
                  <ul className="space-y-1.5 text-xs">
                    <li>
                      <Link href="/support" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Trung tâm trợ giúp
                      </Link>
                    </li>
                    <li>
                      <Link href="/policies" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Chính sách của Phanta
                      </Link>
                    </li>
                    <li>
                      <Link href="/rules" className="hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors">
                        Quy định sân bãi
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Facilities & Contact */}
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#171C1A] dark:text-white">
                    Liên hệ
                  </h3>
                  <div className="text-xs space-y-1 text-[#758A80] dark:text-[#A1A79F]">
                    <p>Hotline: <strong className="text-[#171C1A] dark:text-white">0988 240 106</strong></p>
                    <p>Giờ hoạt động: 06:00 - 23:00</p>
                    <p>Địa điểm: Quận 7 và TP. Thủ Đức, TP. Hồ Chí Minh</p>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright (Hyphen only, no floating dot) */}
              <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#E3E8E6] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#758A80] dark:text-[#A1A79F]">
                <p>© 2026 Phanta Sports - Bản quyền thuộc về Phanta Sports.</p>
                <p className="mt-2 sm:mt-0">Tiêu chuẩn kỹ thuật BWF - FIFA - FIBA</p>
              </div>
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
