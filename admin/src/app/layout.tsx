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
        <title>Hệ Thống Quản Trị Sân Thể Thao & Esports</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-slate-100 flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white border-r border-slate-800 shrink-0">
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Sports Booking</h1>
              <p className="text-xs text-slate-400">Admin & Staff Portal</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Vận Hành & Quản Lý
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-start space-x-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60">
            {mounted && user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate text-white">{user.fullName || user.phone}</p>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Đang tải tài khoản...</div>
            )}
          </div>
        </aside>

        {/* Mobile menu modal/header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold">Sports Booking Admin</span>
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
          <div className="md:hidden fixed inset-0 z-40 bg-slate-900 pt-20 p-6 flex flex-col justify-between">
            <nav className="space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-xl ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.fullName || user?.phone}</p>
                <p className="text-xs text-blue-400">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-600/20 text-rose-300 rounded-lg"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
