'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getHomeRouteByRole } from '@/lib/api';
import { usePosTheme } from '@/lib/pos-theme';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = usePosTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(phone.trim(), password);
      if (res.user.role === 'CUSTOMER' || res.user.role === 'PT') {
        await api.logout();
        throw new Error('Tài khoản này không có quyền truy cập quầy thu ngân Web POS.');
      }
      router.push(getHomeRouteByRole(res.user.role));
    } catch (err: any) {
      const errData = err?.data || {};
      if (errData.errorCode === 'ACCOUNT_LOCKED') {
        setError(
          `Tài khoản tạm thời bị khóa do nhập sai mật khẩu 5 lần. Vui lòng thử lại sau ${
            errData.remainingMinutes || 15
          } phút.`,
        );
      } else if (typeof errData.attemptsLeft === 'number') {
        setError(
          `Số điện thoại hoặc mật khẩu không đúng. Bạn còn ${errData.attemptsLeft} lần thử trước khi tài khoản bị khóa 15 phút.`,
        );
      } else {
        setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra số điện thoại và mật khẩu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto flex justify-end">
        <button
          type="button"
          onClick={toggleTheme}
          className="phanta-btn-secondary px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
        >
          {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="text-center mb-6">
          <img
            src="/Phanta Sports Booking Emblem.png"
            alt="Logo Phanta Sports"
            width={64}
            height={64}
            className="w-16 h-16 mx-auto rounded-full object-cover mb-4 border border-[var(--pos-border)] bg-white"
          />
          <h1 className="font-barlow font-extrabold text-2xl sm:text-3xl tracking-tight text-[var(--pos-text-heading)]">
            PHANTA WEB POS
          </h1>
          <p className="mt-1.5 text-sm text-[var(--pos-text-sub)]">
            Đăng nhập quầy thu ngân và điều hành dịch vụ
          </p>
        </div>

        <div className="phanta-card p-6 sm:p-8 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl text-xs font-medium border"
              style={{
                backgroundColor: 'var(--pos-danger-soft)',
                borderColor: 'var(--pos-danger-border)',
                color: 'var(--pos-danger)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-phone"
                className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
              >
                Số điện thoại hoặc mã tài khoản
              </label>
              <input
                id="login-phone"
                type="text"
                required
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="phanta-input w-full px-3.5 py-2.5 text-sm font-tabular"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
              >
                Mật khẩu
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="phanta-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="phanta-btn-primary w-full py-3 px-4 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập quầy POS'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--pos-border-subtle)] text-center text-xs text-[var(--pos-text-sub)]">
            Chưa có tài khoản?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[var(--pos-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] rounded"
            >
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-[var(--pos-text-sub)]">
        Phanta Sports Complex - Hệ thống Web POS quầy thu ngân
      </div>
    </div>
  );
}
