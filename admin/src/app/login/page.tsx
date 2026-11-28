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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustomerDomain, setIsCustomerDomain] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);

  useEffect(() => {
    setIsCustomerDomain(false);
  }, []);

  const redirectAfterLogin = (user?: User) => {
    if (user?.role === 'CUSTOMER') {
      if (typeof window !== 'undefined') {
        api.clearAuthTokens();
        const clientLoginUrl = window.location.hostname.includes('phanta.id.vn')
          ? 'https://phanta.id.vn/login?notice=customer_redirect'
          : 'http://localhost:3001/login?notice=customer_redirect';
        window.location.href = clientLoginUrl;
      }
    } else if (user?.role === 'STAFF') {
      window.location.href = '/pos/checkin-walkin';
    } else {
      window.location.href = '/facilities';
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(identifier, password, false);
      redirectAfterLogin(res?.user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin đăng nhập hoặc mật khẩu.');
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
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F0C] via-[#0C0F0C]/60 to-transparent" />

        <div className="relative z-10">
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-[#00B562] dark:text-[#9CFF93]">
            Phanta Sports Network
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase text-white leading-tight tracking-tight">
            Nền Tảng Đặt Sân & Quản Lý Trận Đấu
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Kết nối hơn 40 sân thi đấu đạt chuẩn quốc tế tại TP. Hồ Chí Minh. Xác thực mã vào cổng tự động qua cửa xoay và minh bạch hoàn tiền.
          </p>
          <div className="pt-2 text-xs text-slate-400 font-medium">
            Bóng đá - Cầu lông - Pickleball - Tennis - Bóng rổ - Cyber Arena
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
                  ? 'Nhập số điện thoại, email hoặc tiếp tục bằng Google để quản lý lịch đặt sân.'
                  : 'Đăng nhập bằng số điện thoại, email hoặc tài khoản nội bộ dành cho Quản trị viên & Nhân viên.'}
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
              {/* Thông báo lỗi */}
              {error && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Form đăng nhập - Tinh gọn */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
                    Số điện thoại, Email hoặc mã tài khoản
                  </label>
                  <input
                    type="text"
                    name="login_identifier"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nhập SĐT, email hoặc mã tài khoản (vd: 240106)"
                    className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white">
                      Mật khẩu
                    </label>
                  </div>
                  <input
                    type="password"
                    name="login_password"
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
