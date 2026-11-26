// admin/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedInfo, setLockedInfo] = useState<{ remainingMinutes?: number; lockedUntil?: string } | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLockedInfo(null);
    setAttemptsLeft(null);
    setLoading(true);

    try {
      const res = await api.login(phone, password);

      const isCustomerDomain =
        typeof window !== 'undefined' &&
        !window.location.hostname.startsWith('admin.');

      if (res?.user?.role === 'CUSTOMER') {
        if (!isCustomerDomain && window.location.hostname.includes('phanta.id.vn')) {
          window.location.href = 'https://phanta.id.vn/home';
        } else {
          window.location.href = '/home';
        }
      } else if (res?.user?.role === 'STAFF') {
        window.location.href = '/walk-in';
      } else {
        window.location.href = '/facilities';
      }
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
    <div className="min-h-screen bg-white dark:bg-[#0C0F0C] text-[#171C1A] dark:text-[#F3F4F6] flex font-sans">
      {/* CỘT TRÁI: SPLIT SCREEN ẢNH THỂ THAO THỰC TẾ (ẨN TRÊN MOBILE, HIỂN THỊ TỪ LG) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#121512] flex-col justify-between p-12 overflow-hidden">
        {/* Ảnh nền thể thao độ nét cao */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F0C] via-[#0C0F0C]/60 to-transparent" />

        {/* Nội dung trên cột ảnh - Không dùng icon rườm rà */}
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

      {/* CỘT PHẢI: FORM ĐĂNG NHẬP TINH GỌN VỚI LOGO 2 (PHANTA.png) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
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
                Nhập số điện thoại của bạn để quản lý lịch đặt sân và vé thi đấu.
              </p>
            </div>
          </div>

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
                <Link
                  href="/support"
                  className="text-xs text-[#3B4540] dark:text-[#D1D5DB] hover:text-[#00B562] transition"
                >
                  Quên mật khẩu?
                </Link>
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

          {/* Điều hướng đăng ký */}
          <div className="pt-4 border-t border-[#E3E8E6] dark:border-white/10 text-center text-xs text-[#3B4540] dark:text-[#D1D5DB]">
            Chưa có tài khoản thành viên?{' '}
            <Link
              href="/register"
              className="font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93] hover:underline"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
