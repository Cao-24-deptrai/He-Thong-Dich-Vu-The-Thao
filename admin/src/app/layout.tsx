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
  Cpu
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
      router.replace('/login');
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
      href: '/matchmaking',
      label: 'Cáp Kèo Thể Thao',
      icon: Users,
      description: 'Giao lưu & tìm đồng đội (Mục 6.3)',
    },
  ];

  return (
    <html lang="vi">
      <head>
        <title>Hệ Thống Quản Trị Sân Thể Thao & Esports — Neo-Athletic</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#090D16] text-slate-100 flex min-h-screen relative selection:bg-cyan-500 selection:text-black">
        {/* Ambient Top Glow Orbs */}
        <div className="fixed top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 bg-[#0d121f]/95 border-r border-slate-800/80 backdrop-blur-xl shrink-0 z-20">
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-cyan-500/20">
              P
            </div>
            <div>
              <span className="font-black text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                PHANTA
              </span>
              <span className="text-[10px] block font-mono text-cyan-400 tracking-widest font-semibold uppercase">
                Staff Desk Core
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-normal">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Footer Card */}
          <div className="p-3 border-t border-slate-800/80">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.fullName || user?.phone || 'Nhân viên'}
                  </p>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                    {user?.role || 'STAFF'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Top Navbar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0d121f]/95 border-b border-slate-800 backdrop-blur-xl flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center font-bold text-black text-sm">
              P
            </div>
            <span className="font-bold text-sm tracking-wide text-white">PHANTA</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 bg-[#090D16]/98 z-20 p-4 overflow-y-auto">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-cyan-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-slate-800/50 mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span>Đăng xuất</span>
              </button>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
