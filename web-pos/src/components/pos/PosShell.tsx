'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  QrCode,
  ShoppingCart,
  Dumbbell,
  Gamepad2,
  RotateCcw,
  Cpu,
  Wallet,
  PackageCheck,
  Printer,
  Sun,
  Moon,
  Search,
  ChevronsLeft,
  Menu,
  X,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api, CanteenShift, User } from '@/lib/api';
import { usePosTheme } from '@/lib/pos-theme';
import { useThermalReceipt } from './ThermalReceiptModal';

export interface ToastMessage {
  title: string;
  desc: string;
  variant?: 'success' | 'error';
}

const ToastContext = createContext<{
  showToast: (title: string, desc: string, variant?: 'success' | 'error') => void;
}>({
  showToast: () => {},
});

export function usePosToast() {
  return useContext(ToastContext);
}

const POS_NAV_ITEMS = [
  {
    href: '/pos/checkin-walkin',
    label: 'Soát vé và đặt walk-in',
    shortTitle: 'SOÁT VÉ VÀ ĐẶT CHỖ WALK-IN',
    hotkey: 'F1',
    icon: QrCode,
  },
  {
    href: '/pos/canteen',
    label: 'Canteen POS và bán lẻ',
    shortTitle: 'CANTEEN POS VÀ BÁN LẺ',
    hotkey: 'F2',
    icon: ShoppingCart,
  },
  {
    href: '/pos/gym',
    label: 'Hội viên Gym và soát vé',
    shortTitle: 'HỘI VIÊN GYM VÀ SOÁT VÉ',
    hotkey: 'F3',
    icon: Dumbbell,
  },
  {
    href: '/pos/gaming',
    label: 'Cyber Gaming 100 PC',
    shortTitle: 'CYBER GAMING 100 MÁY',
    hotkey: 'F4',
    icon: Gamepad2,
  },
  {
    href: '/pos/refunds',
    label: 'Xử lý hoàn tiền',
    shortTitle: 'XỬ LÝ HOÀN TIỀN',
    hotkey: 'F5',
    icon: RotateCcw,
  },
  {
    href: '/pos/bridge',
    label: 'Thiết bị quầy và IoT',
    shortTitle: 'THIẾT BỊ QUẦY VÀ IOT BRIDGE',
    hotkey: 'F6',
    icon: Cpu,
  },
  {
    href: '/pos/shift',
    label: 'Quản lý và chốt ca',
    shortTitle: 'QUẢN LÝ VÀ CHỐT CA THU NGÂN',
    hotkey: 'F7',
    icon: Wallet,
  },
  {
    href: '/pos/rentals',
    label: 'Thuê dụng cụ và thu cọc',
    shortTitle: 'THUÊ DỤNG CỤ VÀ THU TIỀN CỌC',
    hotkey: 'F8',
    icon: PackageCheck,
  },
];

export default function PosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = usePosTheme();
  const { openReceipt } = useThermalReceipt();

  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<CanteenShift | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [clock, setClock] = useState({ time: '--:--:--', date: '--/--/----' });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((title: string, desc: string, variant: 'success' | 'error' = 'success') => {
    setToast({ title, desc, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadShift = useCallback(async () => {
    try {
      const current = await api.getCurrentShift();
      setShift(current);
    } catch {
      setShift(null);
    }
  }, []);

  useEffect(() => {
    const currentUser = api.getUser();
    if (!currentUser || currentUser.role === 'CUSTOMER' || currentUser.role === 'PT') {
      router.replace('/login');
      return;
    }
    setUser(currentUser);
    loadShift();

    if (api.getToken()) {
      api
        .getMyProfile()
        .then((fresh) => {
          if (fresh) setUser(fresh);
        })
        .catch(() => {});
    }

    const onShiftUpdated = () => loadShift();
    window.addEventListener('phanta-shift-updated', onShiftUpdated);
    return () => window.removeEventListener('phanta-shift-updated', onShiftUpdated);
  }, [router, loadShift]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setClock({
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      });
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const fnIndex = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'].indexOf(e.key);
      if (fnIndex !== -1 && POS_NAV_ITEMS[fnIndex]) {
        e.preventDefault();
        router.push(POS_NAV_ITEMS[fnIndex].href);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('cashier-search-input') as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const activeItem = POS_NAV_ITEMS.find((item) => pathname === item.href) || POS_NAV_ITEMS[0];
  const initials = (user?.fullName || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'NV';

  const handleGlobalSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const q = searchValue.trim();
    if (!q) return;
    window.dispatchEvent(new CustomEvent('phanta-pos-search', { detail: q }));
    showToast('Tra cứu nhanh', `Đang tìm mã hoặc từ khóa "${q}"`);
    setSearchValue('');
  };

  const renderNavLinks = (isMobile: boolean) => (
    <nav className="space-y-1 text-xs" aria-label="Điều hướng phân hệ POS">
      {POS_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        const collapsedDesktop = !isMobile && sidebarCollapsed;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isMobile) setMobileDrawerOpen(false);
            }}
            aria-current={active ? 'page' : undefined}
            title={collapsedDesktop ? `${item.label} (${item.hotkey})` : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
              collapsedDesktop ? 'justify-center px-0' : ''
            } ${
              active
                ? 'bg-[var(--pos-accent-soft)] text-[var(--pos-accent)] border-l-[3px] border-[var(--pos-accent)]'
                : 'text-[var(--pos-text-sub)] hover:bg-[var(--pos-bg-card-inner)] hover:text-[var(--pos-text-heading)]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsedDesktop && (
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">{item.label}</span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-sub)] border border-[var(--pos-border-subtle)] font-tabular shrink-0">
                  {item.hotkey}
                </kbd>
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="h-screen w-full flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex shrink-0 h-full bg-[var(--pos-bg-sidebar)] border-r border-[var(--pos-border)] flex-col justify-between z-30 select-none transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-[76px]' : 'w-[280px]'
          }`}
        >
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Brand */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <div className={`flex items-center gap-3 overflow-hidden ${sidebarCollapsed ? 'mx-auto' : ''}`}>
                <img
                  src="/Phanta Sports Booking Emblem.png"
                  alt="Logo Phanta Sports"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--pos-border)] bg-white"
                />
                {!sidebarCollapsed && (
                  <div className="leading-tight truncate">
                    <div className="font-barlow font-extrabold text-lg tracking-wider text-[var(--pos-text-heading)]">
                      PHANTA
                    </div>
                    <div className="text-[11px] font-bold text-[var(--pos-accent)] tracking-wide">
                      POS THU NGÂN
                    </div>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label="Thu gọn thanh bên"
                  className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)] hover:bg-[var(--pos-bg-card-inner)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Shift Widget */}
            {!sidebarCollapsed && (
              <div className="p-3 rounded-xl bg-[var(--pos-bg-card-inner)] border border-[var(--pos-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold gap-2">
                  <span
                    className="truncate"
                    style={{ color: shift?._id ? 'var(--pos-accent)' : 'var(--pos-warning)' }}
                  >
                    {shift?._id ? `Ca #${shift._id.slice(-6).toUpperCase()} đang mở` : 'Chưa mở ca thu ngân'}
                  </span>
                  <span
                    className="text-[10px] font-barlow font-bold px-1.5 py-0.5 rounded border shrink-0"
                    style={{
                      backgroundColor: 'var(--pos-orange-soft)',
                      color: 'var(--pos-orange)',
                      borderColor: 'var(--pos-orange-border)',
                    }}
                  >
                    QUẦY 1
                  </span>
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-semibold text-[var(--pos-text-heading)] truncate">
                    Thu ngân: {user?.fullName || 'Nhân viên'}
                  </div>
                  <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular mt-0.5">
                    Quỹ đầu ca: {(shift?.openingCash ?? 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            )}

            {renderNavLinks(false)}
          </div>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-[var(--pos-border-subtle)]">
            <div
              className={`flex items-center gap-2.5 p-2 rounded-xl bg-[var(--pos-bg-card-inner)] border border-[var(--pos-border-subtle)] ${
                sidebarCollapsed ? 'justify-center px-1' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--pos-accent-soft)] text-[var(--pos-accent)] border border-[var(--pos-border)] flex items-center justify-center font-barlow font-bold text-xs shrink-0">
                {initials}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="truncate leading-tight flex-1">
                    <div className="text-xs font-semibold text-[var(--pos-text-heading)] truncate">
                      {user?.fullName || user?.phone || 'Nhân viên'}
                    </div>
                    <div className="text-[11px] text-[var(--pos-text-sub)]">
                      {user?.role || 'STAFF'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => api.logout()}
                    aria-label="Đăng xuất"
                    title="Đăng xuất"
                    className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-danger)] hover:bg-[var(--pos-bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile / Tablet Drawer */}
        {mobileDrawerOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/70 flex"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileDrawerOpen(false);
            }}
          >
            <div className="w-72 max-w-[85vw] h-full bg-[var(--pos-bg-sidebar)] border-r border-[var(--pos-border)] p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/Phanta Sports Booking Emblem.png"
                      alt="Logo Phanta Sports"
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover border border-[var(--pos-border)] bg-white"
                    />
                    <div>
                      <div className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)]">
                        PHANTA
                      </div>
                      <div className="text-[11px] font-bold text-[var(--pos-accent)]">
                        POS THU NGÂN
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-label="Đóng menu"
                    className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {renderNavLinks(true)}
              </div>

              <div className="pt-4 border-t border-[var(--pos-border-subtle)]">
                <button
                  type="button"
                  onClick={() => api.logout()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border"
                  style={{
                    backgroundColor: 'var(--pos-danger-soft)',
                    borderColor: 'var(--pos-danger-border)',
                    color: 'var(--pos-danger)',
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Column */}
        <main className="flex-1 h-full min-w-0 flex flex-col overflow-hidden bg-[var(--pos-bg-page)]">
          {/* Topbar */}
          <header className="h-16 shrink-0 bg-[var(--pos-bg-header)] border-b border-[var(--pos-border)] px-4 sm:px-6 flex items-center justify-between gap-3 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Mở menu điều hướng"
                className="lg:hidden p-2 rounded-xl bg-[var(--pos-bg-card-inner)] border border-[var(--pos-border-subtle)] text-[var(--pos-text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                className="hidden lg:flex p-2 rounded-xl bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)] border border-[var(--pos-border-subtle)] hover:border-[var(--pos-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                <ChevronsLeft
                  className={`w-4 h-4 transition-transform duration-200 ${
                    sidebarCollapsed ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <h1 className="font-barlow font-extrabold text-base sm:text-lg text-[var(--pos-text-heading)] uppercase tracking-wide truncate">
                {activeItem.shortTitle}
              </h1>
            </div>

            {/* Quick Search */}
            <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md items-center relative">
              <Search className="w-4 h-4 text-[var(--pos-text-sub)] absolute left-3 pointer-events-none" />
              <input
                id="cashier-search-input"
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleGlobalSearchSubmit}
                placeholder="Quét mã vé, hóa đơn hoặc SĐT (Ctrl+K)"
                aria-label="Tìm kiếm nhanh mã vé, hóa đơn hoặc số điện thoại"
                className="phanta-input w-full pl-9 pr-16 py-2 text-xs"
              />
              <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--pos-bg-card)] text-[var(--pos-text-sub)] border border-[var(--pos-border-subtle)] font-tabular pointer-events-none">
                Enter
              </kbd>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
                style={{
                  backgroundColor: 'var(--pos-accent-soft)',
                  color: 'var(--pos-accent)',
                  borderColor: 'var(--pos-border)',
                }}
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>ESC/POS sẵn sàng</span>
              </div>

              <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-xl bg-[var(--pos-bg-card-inner)] border border-[var(--pos-border-subtle)]">
                <span className="font-tabular text-xs font-bold text-[var(--pos-text-heading)]">
                  {clock.time}
                </span>
                <span className="font-tabular text-[10px] text-[var(--pos-text-sub)]">
                  {clock.date}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                className="p-2 rounded-xl bg-[var(--pos-bg-card-inner)] border border-[var(--pos-border)] text-[var(--pos-text-heading)] hover:border-[var(--pos-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => openReceipt()}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                style={{
                  backgroundColor: 'var(--pos-accent-soft)',
                  color: 'var(--pos-accent)',
                  borderColor: 'var(--pos-border)',
                }}
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Máy in 80mm</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] bg-[var(--pos-bg-card)] text-[var(--pos-text-sub)] border border-[var(--pos-border-subtle)] font-tabular">
                  F9
                </kbd>
              </button>
            </div>
          </header>

          {/* Scrollable Workspace */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto w-full">{children}</div>
          </div>
        </main>

        {/* Toast */}
        {toast && (
          <div
            role="status"
            className="fixed bottom-5 right-5 z-50 max-w-sm phanta-card px-4 py-3 flex items-start gap-3"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: toast.variant === 'error' ? 'var(--pos-danger-soft)' : 'var(--pos-accent-soft)',
                color: toast.variant === 'error' ? 'var(--pos-danger)' : 'var(--pos-accent)',
                borderColor: toast.variant === 'error' ? 'var(--pos-danger-border)' : 'var(--pos-border)',
              }}
            >
              {toast.variant === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-barlow font-bold text-sm text-[var(--pos-text-heading)]">
                {toast.title}
              </div>
              <div className="text-xs text-[var(--pos-text-sub)] mt-0.5">{toast.desc}</div>
            </div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
