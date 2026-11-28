// admin/src/app/forgot-password/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { api } from '@/lib/api';
import AuthSplitShell from '@/components/AuthSplitShell';
import {
  confirmPhoneOtpAndGetIdToken,
  createInvisibleRecaptcha,
  isFirebaseConfigured,
  sendPhoneOtp,
  sendResetPasswordEmailLink,
  translateFirebaseError,
} from '@/lib/firebase';

type ResetTab = 'phone' | 'email';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isCustomerDomain, setIsCustomerDomain] = useState(true);
  const [activeTab, setActiveTab] = useState<ResetTab>('phone');

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Email Reset Link state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCustomerDomain(!window.location.hostname.startsWith('admin.'));
    }
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const switchTab = (tab: ResetTab) => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số VN, vd: 0912345678).');
      return;
    }

    if (!isFirebaseConfigured()) {
      setError('Hệ thống chưa cấu hình Firebase Web SDK (NEXT_PUBLIC_FIREBASE_*).');
      return;
    }

    setLoading(true);
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      const verifier = createInvisibleRecaptcha('firebase-recaptcha-container');
      recaptchaRef.current = verifier;

      const result = await sendPhoneOtp(cleanPhone, verifier);
      setConfirmationResult(result);
      setResendCooldown(60);
      setSuccessMsg('Mã xác thực OTP 6 số đã được gửi tới số điện thoại của bạn.');
    } catch (err: any) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      setError(err?.code ? translateFirebaseError(err) : err?.message || 'Không thể gửi mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!confirmationResult) {
      setError('Vui lòng yêu cầu gửi mã OTP trước.');
      return;
    }
    if (otpCode.trim().length !== 6) {
      setError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const idToken = await confirmPhoneOtpAndGetIdToken(confirmationResult, otpCode);
      const res = await api.resetPasswordByPhone(idToken, newPassword);
      setSuccessMsg(res.message || 'Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(
        err?.code
          ? translateFirebaseError(err)
          : err?.message || 'Xác thực OTP hoặc đặt lại mật khẩu thất bại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email đã đăng ký.');
      return;
    }

    if (!isFirebaseConfigured()) {
      setError('Hệ thống chưa cấu hình Firebase Web SDK (NEXT_PUBLIC_FIREBASE_*).');
      return;
    }

    setLoading(true);
    try {
      await api.prepareEmailReset(cleanEmail);
      await sendResetPasswordEmailLink(cleanEmail);
      setEmailSent(true);
      setSuccessMsg(
        `Liên kết đặt lại mật khẩu đã được gửi đến ${cleanEmail}. Vui lòng kiểm tra hộp thư (kể cả mục Spam) và bấm vào liên kết để đặt mật khẩu mới.`,
      );
    } catch (err: any) {
      setError(
        err?.code
          ? translateFirebaseError(err)
          : err?.message || 'Không thể gửi email đặt lại mật khẩu.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isCustomerDomain) {
    return (
      <AuthSplitShell
        badge="Bảo Mật Quản Trị"
        heroTitle="Cổng Điều Hành Nội Bộ Phanta Sports"
        heroDescription="Vì lý do an toàn hệ thống, tài khoản Quản trị viên và Nhân viên quầy không được phép tự đặt lại mật khẩu trực tuyến."
        title="Quên Mật Khẩu"
        subtitle="Chính sách bảo mật dành cho cổng quản trị."
      >
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
          Tài khoản Admin / Staff / Manager vui lòng liên hệ Quản trị viên tối cao để được cấp lại mật khẩu nội bộ.
        </div>
        <Link
          href="/login"
          className="block w-full text-center py-3 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-bold text-sm uppercase tracking-wider"
        >
          Quay lại Đăng nhập
        </Link>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell
      badge="Khôi Phục Tài Khoản"
      heroTitle="Đặt Lại Mật Khẩu Nhanh Chóng & An Toàn"
      heroDescription="Hỗ trợ xác thực qua mã OTP SMS hoặc liên kết khôi phục gửi về Email đã đăng ký của bạn thông qua Firebase Authentication."
      title="Quên Mật Khẩu"
      subtitle="Chọn phương thức xác nhận qua Số điện thoại (OTP) hoặc Email."
    >
      {/* Tabs chọn kênh khôi phục */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F1F3F2] dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10">
        <button
          type="button"
          onClick={() => switchTab('phone')}
          className={`py-2.5 px-3 rounded-lg font-heading font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'phone'
              ? 'bg-white dark:bg-[#0C0F0C] text-[#00B562] dark:text-[#9CFF93] shadow-sm'
              : 'text-[#758A80] dark:text-[#A1A79F] hover:text-[#171C1A] dark:hover:text-white'
          }`}
        >
          OTP Số điện thoại
        </button>
        <button
          type="button"
          onClick={() => switchTab('email')}
          className={`py-2.5 px-3 rounded-lg font-heading font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'email'
              ? 'bg-white dark:bg-[#0C0F0C] text-[#00B562] dark:text-[#9CFF93] shadow-sm'
              : 'text-[#758A80] dark:text-[#A1A79F] hover:text-[#171C1A] dark:hover:text-white'
          }`}
        >
          Link qua Email
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-[#00B562]/30 bg-[#00B562]/10 text-[#00914E] dark:text-[#9CFF93] text-xs leading-relaxed">
          {successMsg}
        </div>
      )}

      {activeTab === 'phone' ? (
        !confirmationResult ? (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
                Số điện thoại đã đăng ký
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="vd: 0912345678"
                className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-bold text-sm uppercase tracking-wider transition disabled:opacity-50"
            >
              {loading ? 'Đang gửi mã OTP...' : 'Gửi Mã OTP Xác Thực'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white">
                  Mã OTP 6 số
                </label>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendPhoneOtp()}
                  className="text-xs font-semibold text-[#00B562] dark:text-[#9CFF93] disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : 'Gửi lại mã'}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập 6 chữ số OTP"
                className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm tracking-widest placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-bold text-sm uppercase tracking-wider transition disabled:opacity-50"
            >
              {loading ? 'Đang cập nhật mật khẩu...' : 'Xác Nhận & Đặt Lại Mật Khẩu'}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleSendEmailResetLink} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white mb-2">
              Email đã đăng ký tài khoản
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vd: nguyenvana@gmail.com"
              className="w-full px-4 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-bold text-sm uppercase tracking-wider transition disabled:opacity-50"
          >
            {loading
              ? 'Đang gửi liên kết...'
              : emailSent
              ? 'Gửi Lại Liên Kết Đặt Lại Mật Khẩu'
              : 'Gửi Link Đặt Lại Mật Khẩu Qua Email'}
          </button>
        </form>
      )}

      {/* Container ẩn cho Firebase RecaptchaVerifier */}
      <div id="firebase-recaptcha-container" />

      <div className="pt-4 border-t border-[#E3E8E6] dark:border-white/10 text-center text-xs text-[#3B4540] dark:text-[#D1D5DB]">
        Nhớ lại mật khẩu rồi?{' '}
        <Link
          href="/login"
          className="font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93] hover:underline"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthSplitShell>
  );
}
