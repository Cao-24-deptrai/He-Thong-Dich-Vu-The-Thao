'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePosTheme } from '@/lib/pos-theme';

export default function SignupPage() {
  const router = useRouter();
  const { theme, toggleTheme } = usePosTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await api.register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
      });

      setSuccess('Đăng ký tài khoản thành công. Đang chuyển về trang đăng nhập...');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
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
            ĐĂNG KÝ TÀI KHOẢN
          </h1>
          <p className="mt-1.5 text-sm text-[var(--pos-text-sub)]">
            Tạo tài khoản mới trên hệ thống Phanta Sports
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

          {success && (
            <div
              role="status"
              className="p-3.5 rounded-xl text-xs font-medium border"
              style={{
                backgroundColor: 'var(--pos-accent-soft)',
                borderColor: 'var(--pos-border)',
                color: 'var(--pos-accent)',
              }}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="signup-fullname"
                className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
              >
                Họ và tên
              </label>
              <input
                id="signup-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn An"
                className="phanta-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="signup-phone"
                  className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
                >
                  Số điện thoại
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="phanta-input w-full px-3.5 py-2.5 text-sm font-tabular"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
                >
                  Email (tùy chọn)
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@example.com"
                  className="phanta-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
                >
                  Mật khẩu
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="phanta-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-confirm"
                  className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5"
                >
                  Xác nhận mật khẩu
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="phanta-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="phanta-btn-primary w-full py-3 px-4 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-[var(--pos-text-sub)]">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="font-semibold text-[var(--pos-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] rounded"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-[var(--pos-text-sub)]">
        Phanta Sports Complex - Đăng ký tài khoản mới
      </div>
    </div>
  );
}
