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

    const isAuthPath =
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password';

    // 1. Nếu là tài khoản khách hàng CUSTOMER -> Chuyển sang Cổng Web Khách
    if (currentUser?.role === 'CUSTOMER') {
      const clientHome =
        typeof window !== 'undefined' && window.location.hostname.includes('phanta.id.vn')
          ? 'https://phanta.id.vn/home'
          : 'http://localhost:3001/home';
      window.location.href = clientHome;
      return;
    }

    // 2. Nếu chưa đăng nhập -> Chuyển về trang đăng nhập nội bộ
    if (!currentUser && !isAuthPath) {
      router.replace('/login');
      return;
    }

    // 3. Phân quyền cho nhân viên quầy (STAFF):
    if (currentUser?.role === 'STAFF') {
      const allowedStaffRoutes = ['/pos', '/walk-in', '/checkin', '/canteen', '/rentals'];
      const isAllowed = allowedStaffRoutes.some(
        (r) => pathname === r || pathname.startsWith(r + '/')
      );
      if (!isAllowed && !isAuthPath) {
        router.replace('/pos/checkin-walkin');
        return;
      }
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
  const isPosPortal = pathname === '/pos' || pathname.startsWith('/pos/');

  interface NavSubItem {
    href: string;
    label: string;
    icon: any;
    description: string;
    roles?: string[];
  }

  interface NavGroup {
    id: string;
    label: string;
    icon: any;
    description: string;
    items: NavSubItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: 'operations',
      label: 'Vận Hành & Đặt Sân',
      icon: CalendarPlus,
      description: 'Lịch sân, walk-in, check-in QR & hoàn tiền',
      items: [
        {
          href: '/pos/checkin-walkin',
          label: 'Web POS Thu Ngân (Mới)',
          icon: QrCode,
          description: 'Giao diện POS quầy, chốt ca, F1-F8',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/facilities',
          label: 'Quản Lý Sân Bãi',
          icon: Building2,
          description: 'Quản lý danh sách sân, bảng giá và cơ sở',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/walk-in',
          label: 'Đặt tại Quầy (Walk-in)',
          icon: CalendarPlus,
          description: 'Lịch sân & đặt chỗ tại chỗ',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/checkin',
          label: 'Quét Check-in QR',
          icon: QrCode,
          description: 'Xác thực vé vào sân bằng QR',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/refunds',
          label: 'Xử lý Hoàn tiền',
          icon: RotateCcw,
          description: 'Booking thanh toán muộn (Refund Pending)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'services',
      label: 'Dịch Vụ & Bộ Môn',
      icon: Dumbbell,
      description: 'Gym, PT, giải đấu, gaming & cáp kèo',
      items: [
        {
          href: '/gym',
          label: 'Hội Viên Gym',
          icon: Dumbbell,
          description: 'Quản lý gói tập & soát vé (Mục 6.1)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/pt-classes',
          label: 'PT & Lớp Học',
          icon: Award,
          description: 'Hồ sơ HLV & Lớp học nhóm (M11)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/tournaments',
          label: 'Giải Đấu Thể Thao',
          icon: Trophy,
          description: 'Sơ đồ nhánh đấu & Tỷ số (M16)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/gaming',
          label: 'Khu Gaming 100 Máy',
          icon: Gamepad2,
          description: 'Sơ đồ sàn 2D & Điều khiển (M14)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/matchmaking',
          label: 'Cáp Kèo Thể Thao',
          icon: Users,
          description: 'Giao lưu & tìm đồng đội (Mục 6.3)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'retail',
      label: 'Bán Lẻ & Tiện Ích',
      icon: Coffee,
      description: 'POS Canteen, dụng cụ & vouchers',
      items: [
        {
          href: '/canteen',
          label: 'POS Canteen',
          icon: Coffee,
          description: 'Bán lẻ & ca thu ngân (M12)',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/rentals',
          label: 'Cho Thuê Dụng Cụ',
          icon: PackageCheck,
          description: 'Thuê dụng cụ theo slot (M13)',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/vouchers',
          label: 'Mã Giảm Giá & Combo',
          icon: Ticket,
          description: 'Vouchers & gói ưu đãi (M15)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'finance',
      label: 'Tài Chính & CSKH',
      icon: Receipt,
      description: 'Hóa đơn VAT, đánh giá & thông báo',
      items: [
        {
          href: '/invoices',
          label: 'Hóa Đơn Điện Tử',
          icon: Receipt,
          description: 'Hóa đơn VAT & tra cứu (M08)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/reviews',
          label: 'Đánh Giá Dịch Vụ',
          icon: Star,
          description: 'Phản hồi khách hàng (FR-16)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/notifications',
          label: 'Thông Báo',
          icon: Bell,
          description: 'Push FCM & Zalo ZNS (M09)',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'system',
      label: 'Hệ Thống & Báo Cáo',
      icon: BarChart3,
      description: 'Thống kê doanh thu & thiết bị IoT',
      items: [
        {
          href: '/analytics',
          label: 'Báo Cáo & Thống Kê',
          icon: BarChart3,
          description: 'Doanh thu & tỷ lệ lấp đầy (M17)',
          roles: ['ADMIN', 'OWNER'],
        },
        {
          href: '/bridge',
          label: 'Bridge Agent & IoT',
          icon: Cpu,
          description: 'Thiết bị quầy & Cửa xoay (M22)',
          roles: ['ADMIN', 'OWNER'],
        },
      ],
    },
  ];

  const filteredNavGroups = navGroups
    .map((group) => {
      const validItems = group.items.filter((item) => {
        if (user?.role === 'STAFF' && item.href === '/facilities') {
          return false;
        }
        if (item.roles && user && !item.roles.includes(user.role)) {
          return false;
        }
        return true;
      });
      return {
        ...group,
        items: validItems,
      };
    })
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const activeGroup = filteredNavGroups.find((group) =>
      group.items.some((item) => pathname.startsWith(item.href))
    );
    if (activeGroup) {
      setExpandedGroupId(activeGroup.id);
    }
  }, [pathname, user?.role]);

  return (
    <html lang="vi" data-theme="light">
      <head>
        <title>
          {isPosPortal
            ? 'Phanta Sports - Hệ Thống Web POS Quầy Thu Ngân'
            : isAuthPage
            ? 'Sports & Esports Booking - Đăng nhập'
            : 'Hệ Thống Quản Trị Sân Thể Thao & Esports'}
        </title>
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
          isPosPortal
            ? 'min-h-screen bg-[#0C0F0C] text-[#F3F4F6] font-body'
            : isAuthPage
            ? 'bg-slate-900 text-slate-100 min-h-screen font-body'
            : 'bg-[#0C0F0C] text-[#F3F4F6] flex min-h-screen relative font-body'
        }
      >
        {isPosPortal ? (
          children
        ) : isAuthPage ? (
          children
        ) : (
          <>
            {/* Desktop Sidebar (Admin Operations) */}
            <aside className="hidden md:flex flex-col w-72 bg-[#121512] border-r border-white/10 shrink-0 z-20">
              {/* Brand Header */}
              <div className="p-6 border-b border-white/10 flex items-center space-x-3.5">
                <div className="w-10 h-10 relative shrink-0">
                  <Image
                    src="/Phanta Sports Booking Emblem.png"
                    alt="Phanta Sports Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-heading font-black text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
                    PHANTA SPORTS
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#9CFF93]/20 text-[#9CFF93] border border-[#9CFF93]/30">
                      OPS
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                    Quản Trị Vận Hành & POS
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 font-heading">
                  DANH MỤC QUẢN TRỊ
                </div>
                {filteredNavGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const isExpanded = expandedGroupId === group.id;
                  const isGroupActive = group.items.some((it) => pathname.startsWith(it.href));

                  return (
                    <div key={group.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                          isGroupActive
                            ? 'bg-[#191C14] text-white font-bold border border-[#9CFF93]/30'
                            : isExpanded
                            ? 'bg-[#191C14]/60 text-slate-200 border border-white/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#191C14]/40 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isGroupActive
                              ? 'bg-[#9CFF93] text-black font-black'
                              : isExpanded
                              ? 'bg-[#9CFF93]/20 text-[#9CFF93] border border-[#9CFF93]/30'
                              : 'bg-white/5 text-slate-400'
                          }`}>
                            <GroupIcon className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold tracking-tight truncate">
                              {group.label}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-normal">
                              {group.items.length} mục chức năng
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[#9CFF93]' : 'text-slate-500'
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="ml-3.5 pl-3 border-l-2 border-white/10 space-y-1 py-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-start space-x-2.5 px-3 py-2 rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-[#9CFF93]/15 text-[#9CFF93] font-bold border-l-2 border-[#9CFF93]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${isActive ? 'text-[#9CFF93]' : 'text-slate-500'}`} />
                                <div className="min-w-0">
                                  <div className="text-xs tracking-tight truncate leading-tight">{item.label}</div>
                                  <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-[#9CFF93]/70' : 'text-slate-500'}`}>
                                    {item.description}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* User info & logout */}
              <div className="p-4 border-t border-white/10 bg-[#0C0F0C]">
                {mounted && user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#9CFF93] border border-white/10 shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-white">{user.fullName || user.phone}</p>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-black tracking-wider uppercase bg-[#9CFF93]/20 text-[#9CFF93] rounded-md border border-[#9CFF93]/30">
                          [{user.role}]
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Đăng xuất"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#121512]/95 backdrop-blur-md text-white p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Image
                  src="/Phanta Sports Booking Emblem.png"
                  alt="Phanta Sports Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
                <span className="font-heading font-black text-sm tracking-tight">PHANTA OPS</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-300 hover:text-white"
                aria-label="Mở menu quản trị"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-40 bg-[#0C0F0C]/98 pt-20 p-6 flex flex-col justify-between overflow-y-auto">
                <nav className="space-y-2 overflow-y-auto pb-4">
                  {filteredNavGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const isExpanded = expandedGroupId === group.id;
                    const isGroupActive = group.items.some((it) => pathname.startsWith(it.href));

                    return (
                      <div key={group.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                            isGroupActive
                              ? 'bg-[#191C14] text-white font-bold border border-[#9CFF93]/40'
                              : isExpanded
                              ? 'bg-[#191C14]/60 text-slate-200 border border-white/10'
                              : 'text-slate-300 bg-[#191C14]/40 border border-white/5'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isGroupActive
                                ? 'bg-[#9CFF93] text-black font-black'
                                : 'bg-white/10 text-[#9CFF93]'
                            }`}>
                              <GroupIcon className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-semibold tracking-tight truncate">
                                {group.label}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {group.items.length} mục chức năng
                              </div>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#9CFF93]' : 'text-slate-500'
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="ml-4 pl-3 border-l-2 border-white/10 space-y-1.5 py-1">
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = pathname.startsWith(item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                                    isActive
                                      ? 'bg-[#9CFF93]/15 border border-[#9CFF93]/40 text-[#9CFF93] font-bold'
                                      : 'text-slate-300 bg-white/5 border border-white/5'
                                  }`}
                                >
                                  <Icon className="w-4 h-4 text-[#9CFF93] shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold truncate">{item.label}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{user?.fullName || user?.phone}</p>
                    <p className="text-[10px] text-[#9CFF93] font-mono">[{user?.role}]</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold"
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
          </>
        )}
      </body>
    </html>
  );
}
