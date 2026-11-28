// admin/src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api, User } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import PhoneCompletionBanner from '@/components/PhoneCompletionBanner';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedInfo, setLockedInfo] = useState<{ remainingMinutes?: number; lockedUntil?: string } | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isCustomerDomain, setIsCustomerDomain] = useState(true);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCustomerDomain(!window.location.hostname.startsWith('admin.'));
    }
  }, []);

  const redirectAfterLogin = (user?: User) => {
    const isDomainAdmin =
      typeof window !== 'undefined' && window.location.hostname.startsWith('admin.');

    if (user?.role === 'CUSTOMER') {
      if (isDomainAdmin) {
        window.location.href = 'https://phanta.id.vn/home';
      } else {
        window.location.href = '/home';
      }
    } else {
      // Tài khoản STAFF / ADMIN / OWNER / MANAGER
      if (isDomainAdmin) {
        if (user?.role === 'STAFF') {
          window.location.href = '/pos/checkin-walkin';
        } else {
          window.location.href = '/facilities';
        }
      } else {
        // Nếu đăng nhập ở web khách -> xóa token và điều hướng sang domain admin
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('admin_user');
          const adminLoginUrl = window.location.hostname.includes('phanta.id.vn')
            ? 'https://admin.phanta.id.vn/login?notice=staff_redirect'
            : 'http://localhost:3002/login?notice=staff_redirect';
          window.location.href = adminLoginUrl;
        }
      }
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLockedInfo(null);
    setAttemptsLeft(null);
    setLoading(true);

    try {
      const res = await api.login(phone, password);
      redirectAfterLogin(res?.user);
    } catch (err: any) {
      console.error('Login error:', err);
      const errData = err.data || {};

      if (errData.errorCode === 'ACCOUNT_LOCKED') {
        setLockedInfo({
          remainingMinutes: errData.remainingMinutes || 15,
          lockedUntil: errData.lockedUntil,
        });
        setError(`Tài khoản tạm thời bị khóa do nhập sai mật khẩu 5 lần. Vui lòng thử lại sau ${errData.remainingMinutes || 15} phút.`);
      } else {
        if (typeof errData.attemptsLeft === 'number') {
          setAttemptsLeft(errData.attemptsLeft);
          setError(`Số điện thoại hoặc mật khẩu không chính xác. Bạn còn ${errData.attemptsLeft} lần thử trước khi tài khoản bị khóa 15 phút.`);
        } else {
          setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại số điện thoại hoặc mật khẩu.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white dark:bg-[#0C0F0C] text-[#171C1A] dark:text-[#F3F4F6] flex font-sans">
      {/* CỘT TRÁI: SPLIT SCREEN ẢNH THỂ THAO THỰC TẾ (CỐ ĐỊNH CHIỀU CAO THEO TRÌNH DUYỆT, KHÔNG CUỘN) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen sticky top-0 relative bg-[#121512] flex-col justify-between p-12 overflow-hidden shrink-0 select-none">
        {/* Ảnh nền thể thao độ nét cao */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity"
          style={{
            backgroundImage: `url('/auth-bg.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F0C] via-[#0C0F0C]/50 to-transparent" />

        <div className="relative z-10">
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-[#00B562] dark:text-[#9CFF93]">
            Tài Khoản Hội Viên Thể Thao
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase text-white leading-tight tracking-tight">
            Gia Nhập Cộng Đồng <br /> Phanta Sports
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Đăng ký tài khoản để giữ chỗ trực tuyến trong 10 phút, tích lũy điểm thi đấu và nhận vé điện tử QR vào sân tức thì.
          </p>
          <div className="pt-2 text-xs text-slate-400 font-medium">
            Thao tác nhanh gọn - Bảo mật thông tin cá nhân - Hỗ trợ 24/7
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG NHẬP (CHỈ CUỘN PHẦN NỘI DUNG BÊN PHẢI) */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Nút chuyển đổi Light / Dark mode ở góc phải */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="my-auto py-8 w-full max-w-md mx-auto space-y-8">
          {/* Header Form & Logo 2 */}
          <div className="space-y-4 text-center sm:text-left">
            <Link href="/home" className="inline-block">
              <Image
                src="/PHANTA.png"
                alt="Phanta Sports Logo"
                width={150}
                height={50}
                className="h-10 w-auto object-contain mx-auto sm:mx-0 dark:brightness-110"
                priority
              />
            </Link>

            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#171C1A] dark:text-white uppercase tracking-tight">
                Đăng Nhập
              </h1>
              <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1">
                {isCustomerDomain
                  ? 'Nhập số điện thoại hoặc tiếp tục bằng Google để quản lý lịch đặt sân.'
                  : 'Đăng nhập bằng tài khoản nội bộ dành cho Quản trị viên & Nhân viên.'}
              </p>
            </div>
          </div>

          {pendingGoogleUser ? (
            <PhoneCompletionBanner
              user={pendingGoogleUser}
              allowSkip
              title="Hoàn tất số điện thoại liên hệ"
              description={`Chào ${pendingGoogleUser.fullName}! Bạn có thể bổ sung SĐT ngay để đặt sân nhanh hơn hoặc bỏ qua để cập nhật sau.`}
              onUpdated={(updated) => redirectAfterLogin(updated)}
              onSkip={() => redirectAfterLogin(pendingGoogleUser)}
            />
          ) : (
            <>
              {/* Cảnh báo khóa tài khoản do Brute-force */}
              {lockedInfo && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="font-heading font-bold uppercase tracking-wider">
                    Tài khoản tạm thời bị khóa bảo vệ
                  </div>
                  <p className="leading-relaxed">
                    Hệ thống tạm khóa tài khoản trong {lockedInfo.remainingMinutes} phút để bảo mật chống đăng nhập trái phép.
                  </p>
                </div>
              )}

              {/* Cảnh báo số lần thử còn lại */}
              {!lockedInfo && attemptsLeft !== null && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
                  Mật khẩu chưa chính xác. Bạn còn <strong>{attemptsLeft} lần thử</strong> trước khi tài khoản bị khóa tạm thời.
                </div>
              )}

              {/* Thông báo lỗi */}
              {error && !lockedInfo && attemptsLeft === null && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Form đăng nhập - Tinh gọn, không icon rườm rà trong ô input */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
                    Số điện thoại hoặc tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại (vd: 0988240106 hoặc 240106)"
                    className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white">
                      Mật khẩu
                    </label>
                    {isCustomerDomain && (
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-[#00B562] dark:text-[#9CFF93] hover:underline transition"
                      >
                        Quên mật khẩu?
                      </Link>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-black text-sm uppercase tracking-wider transition disabled:opacity-50"
                >
                  {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
                </button>
              </form>

              {isCustomerDomain && (
                <div className="space-y-4">
                  <div className="relative flex items-center justify-center">
                    <span className="w-full border-t border-[#E3E8E6] dark:border-white/10" />
                    <span className="px-3 text-[11px] uppercase tracking-wider font-semibold text-[#758A80] dark:text-[#A1A79F] bg-white dark:bg-[#0C0F0C]">
                      Hoặc
                    </span>
                    <span className="w-full border-t border-[#E3E8E6] dark:border-white/10" />
                  </div>

                  <GoogleSignInButton
                    disabled={loading}
                    onSuccess={({ user, requiresPhoneCompletion }) => {
                      setError(null);
                      if (requiresPhoneCompletion) {
                        setPendingGoogleUser(user);
                      } else {
                        redirectAfterLogin(user);
                      }
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              )}

              {/* Điều hướng đăng ký */}
              {isCustomerDomain && (
                <div className="pt-4 border-t border-[#E3E8E6] dark:border-white/10 text-center text-xs text-[#3B4540] dark:text-[#D1D5DB]">
                  Chưa có tài khoản thành viên?{' '}
                  <Link
                    href="/register"
                    className="font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93] hover:underline"
                  >
                    Đăng ký ngay
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
