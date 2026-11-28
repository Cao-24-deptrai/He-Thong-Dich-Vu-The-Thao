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
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Calendar,
  Box,
  Wallet,
} from 'lucide-react';
import { api, User } from '@/lib/api';

const PAGE_TITLES: Record<string, string> = {
  '/analytics': 'Tổng quan doanh thu & vận hành',
  '/venue-3d': 'Sơ đồ 3D cụm sân tương tác',
  '/facilities': 'Quản lý cụm sân bãi',
  '/walk-in': 'Đặt sân tại quầy',
  '/checkin': 'Quét check-in QR',
  '/refunds': 'Xử lý hoàn tiền',
  '/gym': 'Hội viên Gym & soát vé',
  '/pt-classes': 'Huấn luyện viên & lớp học',
  '/tournaments': 'Giải đấu thể thao',
  '/gaming': 'Khu Cyber Gaming 100 máy',
  '/matchmaking': 'Cáp kèo thể thao',
  '/canteen': 'POS Canteen & F&B',
  '/rentals': 'Cho thuê dụng cụ',
  '/vouchers': 'Mã giảm giá & combo',
  '/invoices': 'Sổ cái & hóa đơn điện tử',
  '/reviews': 'Đánh giá dịch vụ',
  '/notifications': 'Trung tâm thông báo',
  '/bridge': 'Bridge Agent & thiết bị IoT',
};

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleGroup = (groupId: string) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('phanta_theme') as 'light' | 'dark' | null) || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedCollapsed = localStorage.getItem('phanta_sidebar_collapsed') === 'true';
    setSidebarCollapsed(savedCollapsed);

    const currentUser = api.getUser();
    setUser(currentUser);

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
      pathname === '/register' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password';

    if (currentUser?.role === 'CUSTOMER') {
      const clientHome =
        typeof window !== 'undefined' && window.location.hostname.includes('phanta.id.vn')
          ? 'https://phanta.id.vn/home'
          : 'http://localhost:3001/home';
      window.location.href = clientHome;
      return;
    }

    if (!currentUser && !isAuthPath) {
      router.replace('/login');
      return;
    }

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

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('phanta_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('phanta_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    badge?: string;
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
      id: 'macro',
      label: 'Quản trị vĩ mô',
      icon: BarChart3,
      description: 'Tổng quan doanh thu & sơ đồ 3D',
      items: [
        {
          href: '/analytics',
          label: 'Tổng quan điều hành',
          icon: BarChart3,
          description: 'Báo cáo KPI & hiệu quả tổ hợp',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/venue-3d',
          label: 'Sơ đồ 3D cụm sân',
          icon: Box,
          description: 'Không gian 3D & lịch Gantt',
          badge: '3D',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/invoices',
          label: 'Doanh thu & sổ cái',
          icon: Receipt,
          description: 'Hóa đơn VAT & đối soát',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'operations',
      label: 'Vận hành & đặt sân',
      icon: CalendarPlus,
      description: 'Cụm sân, walk-in, check-in QR & hoàn tiền',
      items: [
        {
          href: '/facilities',
          label: 'Quản lý sân bãi',
          icon: Building2,
          description: 'Danh sách sân, bảng giá & cơ sở',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/walk-in',
          label: 'Đặt tại quầy',
          icon: CalendarPlus,
          description: 'Lịch sân & đặt chỗ trực tiếp',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/checkin',
          label: 'Quét check-in QR',
          icon: QrCode,
          description: 'Xác thực vé vào sân bằng QR',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/refunds',
          label: 'Xử lý hoàn tiền',
          icon: RotateCcw,
          description: 'Giao dịch chờ hoàn tiền',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'services',
      label: 'Dịch vụ & bộ môn',
      icon: Dumbbell,
      description: 'Gym, PT, giải đấu, gaming & cáp kèo',
      items: [
        {
          href: '/gym',
          label: 'Hội viên gym',
          icon: Dumbbell,
          description: 'Gói tập & kiểm soát ra vào',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/pt-classes',
          label: 'PT & lớp học',
          icon: Award,
          description: 'Hồ sơ HLV & lớp học nhóm',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/tournaments',
          label: 'Giải đấu thể thao',
          icon: Trophy,
          description: 'Sơ đồ nhánh đấu & tỷ số',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/gaming',
          label: 'Khu gaming 100 máy',
          icon: Gamepad2,
          description: 'Sơ đồ sàn 2D & điều khiển',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/matchmaking',
          label: 'Cáp kèo thể thao',
          icon: Users,
          description: 'Giao lưu & tìm đồng đội',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'retail',
      label: 'Bán lẻ & tiện ích',
      icon: Coffee,
      description: 'Canteen, cho thuê & khuyến mãi',
      items: [
        {
          href: '/canteen',
          label: 'Quản lý canteen',
          icon: Coffee,
          description: 'Sản phẩm F&B & tồn kho',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/rentals',
          label: 'Cho thuê dụng cụ',
          icon: PackageCheck,
          description: 'Thuê vợt, bóng & phụ kiện',
          roles: ['ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
        },
        {
          href: '/vouchers',
          label: 'Mã giảm giá & combo',
          icon: Ticket,
          description: 'Voucher & gói ưu đãi',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
      ],
    },
    {
      id: 'system',
      label: 'Hệ thống & CSKH',
      icon: Cpu,
      description: 'Đánh giá, thông báo & IoT',
      items: [
        {
          href: '/reviews',
          label: 'Đánh giá dịch vụ',
          icon: Star,
          description: 'Phản hồi từ khách hàng',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/notifications',
          label: 'Thông báo hệ thống',
          icon: Bell,
          description: 'Cảnh báo & gửi tin FCM',
          roles: ['ADMIN', 'OWNER', 'MANAGER'],
        },
        {
          href: '/bridge',
          label: 'Bridge Agent & IoT',
          icon: Cpu,
          description: 'Thiết bị quầy & cửa xoay',
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

  const currentPageTitle =
    Object.entries(PAGE_TITLES).find(([route]) => pathname.startsWith(route))?.[1] ||
    'Trung tâm quản trị hệ thống Phanta';

  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const userInitials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'AD';

  const roleLabelMap: Record<string, string> = {
    OWNER: 'Chủ cơ sở (Owner)',
    ADMIN: 'Quản trị viên (Admin)',
    MANAGER: 'Quản lý cơ sở (Manager)',
    STAFF: 'Nhân viên quầy (Staff)',
  };

  return (
    <html lang="vi" data-theme="dark">
      <head>
        <title>
          {isPosPortal
            ? 'Phanta Sports - Hệ Thống Web POS Quầy Thu Ngân'
            : isAuthPage
            ? 'Sports & Esports Booking - Đăng nhập'
            : 'Phanta Sports OS - Trung tâm quản trị hệ thống'}
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
            __html: `(function(){try{var t=localStorage.getItem('phanta_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={
          isPosPortal
            ? 'min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] font-sans'
            : isAuthPage
            ? 'bg-slate-900 text-slate-100 min-h-screen font-sans'
            : 'bg-[var(--bg-page)] text-[var(--text-main)] flex h-screen w-screen overflow-hidden font-sans'
        }
      >
        {isPosPortal || isAuthPage ? (
          children
        ) : (
          <>
            {/* =========================================================
                COLLAPSIBLE SIDEBAR (ADMIN.HTML DESIGN SYSTEM)
                ========================================================= */}
            <aside
              id="main-sidebar"
              className={`hidden md:flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] shrink-0 z-40 transition-all duration-300 ${
                sidebarCollapsed ? 'w-[76px]' : 'w-64'
              }`}
            >
              {/* Brand Header & Collapse Arrow Underneath */}
              <div className="p-3 border-b border-[var(--border-color)] flex flex-col items-center">
                <div
                  className={`w-full flex items-center overflow-hidden px-1 py-1 ${
                    sidebarCollapsed ? 'justify-center' : 'gap-3'
                  }`}
                >
                  <div className="w-10 h-10 relative shrink-0 rounded-xl overflow-hidden bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex items-center justify-center">
                    <Image
                      src="/Phanta Sports Booking Emblem.png"
                      alt="Phanta Sports Emblem"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="min-w-0">
                      <div className="font-heading font-black text-xl text-[var(--text-heading)] tracking-wider leading-none mb-1">
                        PHANTA
                      </div>
                      <div className="text-[10px] font-bold text-[var(--pitch-green)] tracking-wider uppercase leading-none whitespace-nowrap">
                        ADMIN DASHBOARD
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow Toggle Button PLACED UNDER LOGO */}
                <button
                  type="button"
                  onClick={handleToggleSidebar}
                  title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                  className={`mt-2 flex items-center justify-center py-1.5 px-2 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--accent-badge)] border border-transparent hover:border-[var(--border-subtle)] transition-colors ${
                    sidebarCollapsed ? 'w-11 mx-auto' : 'w-full'
                  }`}
                >
                  {sidebarCollapsed ? (
                    <ChevronsRight className="w-4 h-4 shrink-0" />
                  ) : (
                    <>
                      <ChevronsLeft className="w-4 h-4 shrink-0" />
                      <span className="text-[11px] font-semibold ml-1.5">Thu gọn menu</span>
                    </>
                  )}
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
                {!sidebarCollapsed && (
                  <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Danh mục quản trị
                  </div>
                )}

                {filteredNavGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const isExpanded = expandedGroupId === group.id;
                  const isGroupActive = group.items.some((it) => pathname.startsWith(it.href));

                  if (sidebarCollapsed) {
                    return (
                      <div key={group.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          title={group.label}
                          className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-colors ${
                            isGroupActive
                              ? 'bg-[var(--accent-badge)] text-[var(--pitch-green)] border-l-[3px] border-[var(--pitch-green)]'
                              : 'text-[var(--text-sub)] hover:bg-[var(--bg-card-inner)] hover:text-[var(--text-heading)]'
                          }`}
                        >
                          <GroupIcon className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={group.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left ${
                          isGroupActive
                            ? 'bg-[var(--bg-card-inner)] text-[var(--text-heading)] font-bold border border-[var(--border-color)]'
                            : isExpanded
                            ? 'bg-[var(--bg-card-inner)]/60 text-[var(--text-main)] border border-[var(--border-subtle)]'
                            : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GroupIcon
                            className={`w-4 h-4 shrink-0 ${
                              isGroupActive ? 'text-[var(--pitch-green)]' : 'text-[var(--text-sub)]'
                            }`}
                          />
                          <span className="text-xs font-semibold truncate">{group.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            isExpanded
                              ? 'rotate-180 text-[var(--pitch-green)]'
                              : 'text-[var(--text-muted)]'
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="ml-2.5 pl-2.5 border-l border-[var(--border-subtle)] space-y-1 py-0.5">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                  isActive
                                    ? 'bg-[var(--accent-badge)] text-[var(--pitch-green)] font-bold border-l-[3px] border-[var(--pitch-green)]'
                                    : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                </div>
                                {item.badge && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--pitch-green)] text-black font-bold font-heading shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Bottom User Profile Card */}
              <div
                id="sidebar-user-card"
                className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]"
              >
                {mounted && user ? (
                  <div
                    className={`flex items-center ${
                      sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'
                    }`}
                  >
                    <div
                      className={`flex items-center overflow-hidden ${
                        sidebarCollapsed ? 'justify-center' : 'gap-2.5'
                      }`}
                    >
                      <div
                        title={user.fullName || user.phone}
                        className="w-9 h-9 rounded-full bg-[var(--pitch-green)] text-[#0C0F0C] font-extrabold flex items-center justify-center text-xs font-heading shrink-0"
                      >
                        {userInitials}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-heading)] truncate">
                            {user.fullName || user.phone}
                          </div>
                          <div className="text-[10px] text-[var(--text-sub)] truncate">
                            {roleLabelMap[user.role] || user.role}
                          </div>
                        </div>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <button
                        type="button"
                        onClick={handleLogout}
                        title="Đăng xuất"
                        className="p-1.5 text-[var(--text-sub)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] text-center">
                    {sidebarCollapsed ? '--' : 'Đang tải thông tin tài khoản'}
                  </div>
                )}
              </div>
            </aside>

            {/* =========================================================
                MAIN CONTENT CONTAINER (STICKY HEADER + FLUID BODY)
                ========================================================= */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[var(--bg-page)]">
              {/* Topbar */}
              <header className="min-h-[72px] sticky top-0 z-30 bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-color)] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)]"
                    aria-label="Mở menu quản trị"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                  <h1 className="font-heading font-black text-base sm:text-xl text-[var(--text-heading)] uppercase tracking-wider truncate">
                    {currentPageTitle}
                  </h1>
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <div className="hidden 2xl:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-main)]">
                    <Calendar className="w-4 h-4 text-[var(--pitch-green)]" />
                    <span className="font-medium">{todayFormatted}</span>
                  </div>

                  {/* Theme Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleTheme}
                    aria-label="Chuyển chế độ giao diện"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:border-[var(--pitch-green)] transition-colors"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Moon className="w-4 h-4 text-[var(--pitch-green)]" />
                        <span className="hidden sm:inline">Chế độ tối</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4 text-[var(--burnt-orange)]" />
                        <span className="hidden sm:inline">Chế độ sáng</span>
                      </>
                    )}
                  </button>

                  {/* Notifications Shortcut */}
                  <Link
                    href="/notifications"
                    title="Thông báo hệ thống"
                    className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:border-[var(--pitch-green)] transition-colors"
                  >
                    <Bell className="w-4 h-4 text-[var(--burnt-orange)]" />
                  </Link>

                  {/* Switch to Web POS */}
                  <Link
                    href="/pos/checkin-walkin"
                    className="phanta-btn-primary flex items-center gap-2 px-3.5 py-2 text-xs font-heading shadow-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Sang web thu ngân</span>
                  </Link>
                </div>
              </header>

              {/* Mobile Navigation Drawer */}
              {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-[var(--bg-sidebar)] pt-4 p-5 flex flex-col justify-between overflow-y-auto">
                  <div>
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src="/Phanta Sports Booking Emblem.png"
                          alt="Phanta Sports Logo"
                          width={32}
                          height={32}
                          className="object-contain rounded-lg"
                        />
                        <span className="font-heading font-black text-base text-[var(--text-heading)]">
                          PHANTA ADMIN
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-xl bg-[var(--bg-card-inner)] text-[var(--text-main)]"
                        aria-label="Đóng menu"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <nav className="space-y-2 pb-6">
                      {filteredNavGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isExpanded = expandedGroupId === group.id;
                        const isGroupActive = group.items.some((it) =>
                          pathname.startsWith(it.href)
                        );

                        return (
                          <div key={group.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                                isGroupActive
                                  ? 'bg-[var(--bg-card-inner)] text-[var(--text-heading)] font-bold border border-[var(--border-color)]'
                                  : 'text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-subtle)]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <GroupIcon className="w-4 h-4 text-[var(--pitch-green)] shrink-0" />
                                <span className="text-sm font-semibold truncate">{group.label}</span>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 shrink-0 transition-transform ${
                                  isExpanded ? 'rotate-180 text-[var(--pitch-green)]' : ''
                                }`}
                              />
                            </button>

                            {isExpanded && (
                              <div className="ml-4 pl-3 border-l border-[var(--border-subtle)] space-y-1 py-1">
                                {group.items.map((item) => {
                                  const Icon = item.icon;
                                  const isActive = pathname.startsWith(item.href);
                                  return (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${
                                        isActive
                                          ? 'bg-[var(--accent-badge)] text-[var(--pitch-green)] font-bold'
                                          : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
                                      }`}
                                    >
                                      <Icon className="w-4 h-4 shrink-0" />
                                      <span className="truncate">{item.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[var(--text-heading)] text-sm">
                        {user?.fullName || user?.phone}
                      </p>
                      <p className="text-[11px] text-[var(--pitch-green)] font-semibold">
                        {user?.role ? roleLabelMap[user.role] || user.role : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded-xl text-xs font-bold"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}

              {/* Page Content */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
                {children}
              </main>
            </div>
          </>
        )}
      </body>
    </html>
  );
}
