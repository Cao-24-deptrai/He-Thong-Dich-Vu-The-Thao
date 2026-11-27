// admin/src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api, User } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import PhoneCompletionBanner from '@/components/PhoneCompletionBanner';
import ThemeToggle from '@/components/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!agreedTerms) {
      setError('Bạn cần đồng ý với Điều khoản dịch vụ và Quy định sân bãi.');
      return;
    }

    setLoading(true);

    try {
      await api.register(cleanPhone, password, fullName.trim(), email.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        router.push('/booking');
      }, 1500);
    } catch (err: any) {
      console.error('Register error:', err);
      const msg = err.data?.message || err.message || 'Đăng ký không thành công. Vui lòng thử lại.';
      if (typeof msg === 'string' && (msg.toLowerCase().includes('email') || msg.includes('email_1'))) {
        setError('Địa chỉ email này đã được sử dụng cho tài khoản khác. Vui lòng đăng nhập hoặc sử dụng email khác.');
      } else if (
        typeof msg === 'string' &&
        (msg.toLowerCase().includes('phone') ||
          msg.toLowerCase().includes('số điện thoại') ||
          msg.includes('phone_1') ||
          msg.includes('E11000'))
      ) {
        setError('Số điện thoại này đã được đăng ký trên hệ thống. Vui lòng chuyển sang đăng nhập.');
      } else {
        setError(typeof msg === 'string' ? msg : 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-white dark:bg-[#0C0F0C] text-[#171C1A] dark:text-[#F3F4F6] flex font-sans">
      {/* CỘT TRÁI: SPLIT SCREEN ẢNH THỂ THAO THỰC TẾ (CỐ ĐỊNH CHIỀU CAO THEO TRÌNH DUYỆT, KHÔNG CUỘN) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen sticky top-0 relative bg-[#121512] flex-col justify-between p-12 overflow-hidden shrink-0 select-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F0C] via-[#0C0F0C]/60 to-transparent" />

        <div className="relative z-10">
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-[#00B562] dark:text-[#9CFF93]">
            Tài Khoản Hội Viên Thể Thao
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase text-white leading-tight tracking-tight">
            Gia Nhập Cộng Đồng Phanta Sports
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Đăng ký tài khoản để giữ chỗ trực tuyến trong 10 phút, tích lũy điểm thi đấu và nhận vé điện tử QR vào sân tức thì.
          </p>
          <div className="pt-2 text-xs text-slate-400 font-medium">
            Thao tác nhanh gọn - Bảo mật thông tin cá nhân - Hỗ trợ 24/7
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG KÝ (CHỈ CUỘN PHẦN NỘI DUNG BÊN PHẢI) */}
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Nút chuyển đổi Light / Dark mode ở góc phải */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="my-auto py-8 w-full max-w-md mx-auto space-y-6">
          {/* Header Form & Logo 2 */}
          <div className="space-y-3 text-center sm:text-left">
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
                Tạo Tài Khoản Mới
              </h1>
              <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1">
                Điền thông tin bên dưới hoặc đăng ký nhanh qua Google.
              </p>
            </div>
          </div>

          {pendingGoogleUser ? (
            <PhoneCompletionBanner
              user={pendingGoogleUser}
              allowSkip
              title="Hoàn tất số điện thoại liên hệ"
              description={`Chào ${pendingGoogleUser.fullName}! Bạn có thể bổ sung SĐT ngay để đặt sân hoặc bỏ qua để cập nhật sau.`}
              onUpdated={() => {
                window.location.href = '/booking';
              }}
              onSkip={() => {
                window.location.href = '/home';
              }}
            />
          ) : (
            <>
              {success && (
                <div className="p-4 rounded-xl border border-[#00B562]/30 bg-[#00B562]/10 text-[#00B562] dark:text-[#9CFF93] text-xs">
                  Đăng ký tài khoản thành công! Đang chuyển hướng đến trang đặt sân...
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <GoogleSignInButton
                label="Đăng ký nhanh với Google"
                disabled={loading}
                onSuccess={({ user, requiresPhoneCompletion }) => {
                  setError(null);
                  if (requiresPhoneCompletion) {
                    setPendingGoogleUser(user);
                  } else {
                    window.location.href = '/booking';
                  }
                }}
                onError={(msg) => setError(msg)}
              />

              <div className="relative flex items-center justify-center gap-3">
                <span className="flex-1 min-w-[16px] border-t border-[#E3E8E6] dark:border-white/10" />
                <span className="text-center text-[11px] uppercase tracking-wider font-semibold text-[#758A80] dark:text-[#A1A79F] bg-white dark:bg-[#0C0F0C] sm:whitespace-nowrap">
                  Hoặc điền thông tin
                </span>
                <span className="flex-1 min-w-[16px] border-t border-[#E3E8E6] dark:border-white/10" />
              </div>

              {/* Form đăng ký - Không dùng icon rườm rà */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-1.5">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="vd: 0988 240 106"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-1.5">
                    Họ và tên người chơi *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="vd: Nguyễn Văn A"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-1.5">
                    Địa chỉ email (nhận hóa đơn điện tử)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vd: nguyenvana@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-1.5">
                      Mật khẩu *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-1.5">
                      Xác nhận lại mật khẩu *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 rounded border-[#E3E8E6] text-[#00B562] focus:ring-[#00B562]"
                  />
                  <label htmlFor="terms" className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
                    Tôi đồng ý với{' '}
                    <Link href="/about" className="text-[#00B562] dark:text-[#9CFF93] underline">
                      Quy định sân bãi
                    </Link>{' '}
                    và{' '}
                    <Link href="/support" className="text-[#00B562] dark:text-[#9CFF93] underline">
                      Chính sách hoàn tiền
                    </Link>{' '}
                    của Phanta Sports.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-black text-sm uppercase tracking-wider transition disabled:opacity-50"
                >
                  {loading ? 'Đang khởi tạo tài khoản...' : 'Tạo Tài Khoản'}
                </button>
              </form>

              <div className="pt-4 border-t border-[#E3E8E6] dark:border-white/10 text-center text-xs text-[#3B4540] dark:text-[#D1D5DB]">
                Đã có tài khoản trước đó?{' '}
                <Link
                  href="/login"
                  className="font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93] hover:underline"
                >
                  Đăng nhập tại đây
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
