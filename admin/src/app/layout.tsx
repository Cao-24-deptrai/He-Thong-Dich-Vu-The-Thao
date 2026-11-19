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
  Ticket
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

    // If not logged in and not on login/register page, redirect to register
    if (!currentUser && pathname !== '/login' && pathname !== '/register') {
      router.push('/register');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    api.logout();
  };

  // On login or register page, render full screen without layout sidebar
  if (pathname === '/login' || pathname === '/register') {
    return (
      <html lang="vi">
        <body>{children}</body>
      </html>
    );
  }

  // Customer portal layout (Header without admin sidebar)
  if (user?.role === 'CUSTOMER' || pathname.startsWith('/booking')) {
    return (
      <html lang="vi">
        <head>
          <title>Phanta Sports • Đặt Sân Thể Thao Trực Tuyến</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-[#090D16] text-slate-100 flex flex-col min-h-screen relative selection:bg-cyan-500 selection:text-black">
          {/* Top glow */}
          <div className="fixed top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Customer Top Header */}
          <header className="sticky top-0 z-50 bg-[#0d121f]/95 border-b border-slate-800/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link href="/booking" className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  ⚡
                </div>
                <div>
                  <h1 className="font-black text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
                    PHANTA SPORTS
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Member
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">Đặt Sân & Dịch Vụ Thể Thao Trực Tuyến</p>
                </div>
              </Link>

              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-tight">{user.fullName || user.phone}</p>
                        <span className="text-[10px] text-emerald-400 font-mono">Thành viên</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-400 bg-slate-900/60 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 rounded-xl transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Customer Page Body */}
          <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 relative z-10">
            {children}
          </main>
        </body>
      </html>
    );
  }

  const navItems = [
    {
      href: '/facilities',
      label: 'Quản Lý Sân Bãi',
      icon: Building2,
      description: 'Quản lý danh sách sân, bảng giá và cơ sở',
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
      href: '/pt-classes',
      label: 'PT & Lớp Học',
      icon: Award,
      description: 'Hồ sơ HLV & Lớp học nhóm (M11)',
    },
    {
      href: '/tournaments',
      label: 'Giải Đấu Thể Thao',
      icon: Trophy,
      description: 'Sơ đồ nhánh đấu & Tỷ số (M16)',
    },
    {
      href: '/gaming',
      label: 'Khu Gaming 100 Máy',
      icon: Gamepad2,
      description: 'Sơ đồ sàn 2D & Điều khiển (M14)',
    },
    {
      href: '/bridge',
      label: 'Bridge Agent & IoT',
      icon: Cpu,
      description: 'Thiết bị quầy & Cửa xoay (M22)',
    },
    {
      href: '/canteen',
      label: 'POS Canteen',
      icon: Coffee,
      description: 'Bán lẻ & ca thu ngân (M12)',
    },
    {
      href: '/rentals',
      label: 'Cho Thuê Dụng Cụ',
      icon: PackageCheck,
      description: 'Thuê dụng cụ theo slot (M13)',
    },
    {
      href: '/invoices',
      label: 'Hóa Đơn Điện Tử',
      icon: Receipt,
      description: 'Hóa đơn VAT & tra cứu (M08)',
    },
    {
      href: '/notifications',
      label: 'Thông Báo',
      icon: Bell,
      description: 'Push FCM & Zalo ZNS (M09)',
    },
    {
      href: '/vouchers',
      label: 'Mã Giảm Giá & Combo',
      icon: Ticket,
      description: 'Vouchers & gói ưu đãi (M15)',
    },
    {
      href: '/reviews',
      label: 'Đánh Giá Dịch Vụ',
      icon: Star,
      description: 'Phản hồi khách hàng (FR-16)',
    },
    {
      href: '/analytics',
      label: 'Báo Cáo & Thống Kê',
      icon: BarChart3,
      description: 'Doanh thu & tỷ lệ lấp đầy (M17)',
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
