// admin/src/app/layout.tsx
'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Users
} from 'lucide-react';
import { api, User } from '@/lib/api';

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

  useEffect(() => {
    setMounted(true);
    const currentUser = api.getUser();
    setUser(currentUser);

    // If not logged in and not on login page, redirect to login
    if (!currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    api.logout();
  };

  // On login page, render full screen without layout sidebar
  if (pathname === '/login') {
    return (
      <html lang="vi">
        <body>{children}</body>
      </html>
    );
  }

  const navItems = [
    {
      href: '/facilities',
      label: 'Cơ sở & Sân bãi',
      icon: Building2,
      description: 'Quản lý cơ sở, sân và bảng giá',
    },
    {
      href: '/walk-in',
      label: 'Đặt tại Quầy (Walk-in)',
      icon: CalendarPlus,
      description: 'Lịch sân & đặt chỗ tại chỗ',
    },
    {
      href: '/checkin',
      label: 'Quét Check-in QR',
      icon: QrCode,
      description: 'Xác thực vé vào sân bằng QR',
    },
    {
      href: '/refunds',
      label: 'Xử lý Hoàn tiền',
      icon: RotateCcw,
      description: 'Booking thanh toán muộn (Refund Pending)',
    },
    {
      href: '/gym',
      label: 'Hội Viên Gym',
      icon: Dumbbell,
      description: 'Quản lý gói tập & soát vé (Mục 6.1)',
    },
    {
      href: '/matchmaking',
      label: 'Cáp Kèo Thể Thao',
      icon: Users,
      description: 'Giao lưu & tìm đồng đội (Mục 6.3)',
    },
  ];

  return (
    <html lang="vi">
      <head>
        <title>Hệ Thống Quản Trị Sân Thể Thao & Esports • Neo-Athletic</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#090D16] text-slate-100 flex min-h-screen relative selection:bg-cyan-500 selection:text-black">
        {/* Ambient Top Glow Orbs */}
        <div className="fixed top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 bg-[#0d121f]/95 border-r border-slate-800/80 backdrop-blur-xl shrink-0 z-20">
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              ⚡
            </div>
            <div>
              <h1 className="font-black text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
                SPORTS ARENA
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v2.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Tactical Command & POS
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              VẬN HÀNH & ĐIỀU HÀNH
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-start space-x-3 px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border-l-4 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-sm tracking-tight">{item.label}</div>
                    <div className={`text-[11px] mt-0.5 ${isActive ? 'text-cyan-200/70' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
            {mounted && user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700/80 shrink-0 shadow-inner">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate text-white">{user.fullName || user.phone}</p>
                    <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                      [{user.role}]
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Đang tải tài khoản...</div>
            )}
          </div>
        </aside>

        {/* Mobile menu header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d121f]/95 backdrop-blur-md text-white p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black text-sm">⚡</span>
            <span className="font-black text-sm tracking-tight">SPORTS ARENA</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#090D16]/98 pt-20 p-6 flex flex-col justify-between">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl ${
                      isActive ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold' : 'text-slate-300 bg-slate-900/80 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{user?.fullName || user?.phone}</p>
                <p className="text-[10px] text-cyan-400 font-mono">[{user?.role}]</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full relative z-10">
          {children}
        </main>
      </body>

    </html>
  );
}
