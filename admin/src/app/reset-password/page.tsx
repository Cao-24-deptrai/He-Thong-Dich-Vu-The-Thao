// admin/src/app/reset-password/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import AuthSplitShell from '@/components/AuthSplitShell';
import {
  confirmResetAndGetIdToken,
  isFirebaseConfigured,
  translateFirebaseError,
  verifyResetCode,
} from '@/lib/firebase';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [checkingCode, setCheckingCode] = useState(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const validate = async () => {
      if (!oobCode) {
        setError('Liên kết đặt lại mật khẩu thiếu mã xác thực (oobCode).');
        setCheckingCode(false);
        return;
      }
      if (!isFirebaseConfigured()) {
        setError('Hệ thống chưa cấu hình Firebase Web SDK (NEXT_PUBLIC_FIREBASE_*).');
        setCheckingCode(false);
        return;
      }
      try {
        const email = await verifyResetCode(oobCode);
        if (active) {
          setVerifiedEmail(email);
        }
      } catch (err: any) {
        if (active) {
          setError(translateFirebaseError(err));
        }
      } finally {
        if (active) setCheckingCode(false);
      }
    };
    validate();
    return () => {
      active = false;
    };
  }, [oobCode]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await confirmResetAndGetIdToken(oobCode, newPassword);
      await api.completeEmailReset(idToken, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 1800);
    } catch (err: any) {
      setError(
        err?.code
          ? translateFirebaseError(err)
          : err?.message || 'Không thể đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell
      badge="Xác Nhận Đổi Mật Khẩu"
      heroTitle="Thiết Lập Mật Khẩu Mới Cho Tài Khoản"
      heroDescription="Sau khi xác nhận, mật khẩu mới sẽ được đồng bộ trực tiếp vào hệ thống Phanta Sports để bạn đăng nhập trên mọi thiết bị."
      title="Đặt Lại Mật Khẩu"
      subtitle={
        verifiedEmail
          ? `Đang đặt lại mật khẩu cho tài khoản ${verifiedEmail}`
          : 'Xác thực liên kết khôi phục tài khoản qua Email.'
      }
    >
      {checkingCode ? (
        <div className="p-6 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-center text-sm text-[#3B4540] dark:text-[#D1D5DB]">
          Đang kiểm tra tính hợp lệ của liên kết...
        </div>
      ) : success ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[#00B562]/30 bg-[#00B562]/10 text-[#00914E] dark:text-[#9CFF93] text-xs leading-relaxed">
            Đặt lại mật khẩu thành công và đã đồng bộ về hệ thống! Đang chuyển hướng về trang đăng nhập...
          </div>
          <Link
            href="/login"
            className="block w-full text-center py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-black text-sm uppercase tracking-wider"
          >
            Đăng Nhập Ngay
          </Link>
        </div>
      ) : error && !verifiedEmail ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs leading-relaxed">
            {error}
          </div>
          <Link
            href="/forgot-password"
            className="block w-full text-center py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-black text-sm uppercase tracking-wider"
          >
            Yêu Cầu Liên Kết Mới
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

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
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] hover:opacity-95 text-white dark:text-[#0C0F0C] font-heading font-black text-sm uppercase tracking-wider transition disabled:opacity-50"
          >
            {submitting ? 'Đang lưu mật khẩu...' : 'Cập Nhật Mật Khẩu Mới'}
          </button>
        </form>
      )}
    </AuthSplitShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0C0F0C] text-sm text-[#3B4540] dark:text-[#D1D5DB]">
          Đang tải trang đặt lại mật khẩu...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
