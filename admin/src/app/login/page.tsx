// admin/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, Lock, Phone, AlertCircle, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('0999999999');
  const [password, setPassword] = useState('Admin@123456');
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
      // Chỉ cho phép các vai trò quản trị/vận hành quầy đăng nhập vào Web Admin
      if (res.user.role === 'CUSTOMER') {
        throw new Error('Tài khoản Khách hàng không có quyền truy cập trang Quản Trị này. Vui lòng sử dụng Ứng dụng Di động.');
      }

      // Điều hướng thông minh theo vai trò
      if (res.user.role === 'STAFF') {
        router.push('/walk-in');
      } else {
        router.push('/facilities');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errData = err.data || {};

      if (errData.errorCode === 'ACCOUNT_LOCKED') {
        setLockedInfo({
          remainingMinutes: errData.remainingMinutes || 15,
          lockedUntil: errData.lockedUntil,
        });
        setError(`Tài khoản đã bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng thử lại sau ${errData.remainingMinutes || 15} phút.`);
      } else {
        if (typeof errData.attemptsLeft === 'number') {
          setAttemptsLeft(errData.attemptsLeft);
          setError(`Số điện thoại hoặc mật khẩu không chính xác. Bạn còn ${errData.attemptsLeft} lần thử trước khi bị tạm khóa 15 phút.`);
        } else {
          setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuick = (quickPhone: string, quickPass: string) => {
    setPhone(quickPhone);
    setPassword(quickPass);
    setError(null);
    setLockedInfo(null);
    setAttemptsLeft(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-blue-500/25 mb-4">
          ⚡
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Sports & Esports Booking
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Cổng điều hành & quản lý tổ hợp thể thao (Admin & Staff Desk)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700">
          {/* Cảnh báo khóa tài khoản Brute-force */}
          {lockedInfo && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-amber-300">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold">Tài khoản đang bị tạm khóa bảo vệ!</div>
                <div className="text-xs text-amber-300/80 mt-1">
                  Do nhập sai mật khẩu 5 lần, tài khoản được bảo vệ chống xâm nhập trong{' '}
                  <span className="font-bold text-white">{lockedInfo.remainingMinutes} phút</span>.
                </div>
              </div>
            </div>
          )}

          {/* Cảnh báo số lần thử còn lại */}
          {!lockedInfo && attemptsLeft !== null && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold">Cảnh báo nhập sai mật khẩu</div>
                <div className="text-xs text-amber-300/80 mt-1">
                  Bạn còn <span className="font-bold text-rose-300">{attemptsLeft} lần thử</span> trước khi tài khoản bị khóa 15 phút.
                </div>
              </div>
            </div>
          )}

          {/* Lỗi thông thường */}
          {error && !lockedInfo && attemptsLeft === null && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Số điện thoại
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0999999999"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Đang xác thực...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </div>
              )}
            </button>
          </form>

          {/* Quick login buttons for testing */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Tài khoản mẫu đăng nhập nhanh
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuick('0999999999', 'Admin@123456')}
                className="px-2.5 py-2 text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-blue-500/50 rounded-lg text-slate-300 text-left transition"
              >
                <div className="font-semibold text-white flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">0999999999</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuick('0988888888', 'Staff@123456')}
                className="px-2.5 py-2 text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-slate-300 text-left transition"
              >
                <div className="font-semibold text-white flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lễ tân</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">0988888888</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuick('0911000003', 'Password@123')}
                className="px-2.5 py-2 text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-purple-500/50 rounded-lg text-slate-300 text-left transition"
              >
                <div className="font-semibold text-white flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Quản lý</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">0911000003</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
