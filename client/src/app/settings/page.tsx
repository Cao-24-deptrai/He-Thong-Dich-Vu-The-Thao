'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sun,
  Moon,
  Receipt,
  Bell,
  FileText,
  Shield,
  Cookie,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export default function CustomerSettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [activePolicy, setActivePolicy] = useState<'tos' | 'privacy' | 'cookie' | null>('tos');

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(current);
  }, []);

  const handleThemeChange = (next: 'light' | 'dark') => {
    setTheme(next);
    localStorage.setItem('phanta_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="space-y-1">
        <Link
          href="/home"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#758A80] dark:text-[#A1A79F] hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại trang chủ</span>
        </Link>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl uppercase tracking-tight text-[#171C1A] dark:text-white">
          Cài đặt
        </h1>
      </div>

      {/* 1. Giao diện Sáng / Tối */}
      <section className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-5 sm:p-6 space-y-4">
        <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-[#171C1A] dark:text-white">
          Giao diện hiển thị
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex items-center justify-center space-x-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all ${
              theme === 'light'
                ? 'border-[#00B562] bg-[#E6F8F0] text-[#00B562]'
                : 'border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB]'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Chế độ Sáng</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex items-center justify-center space-x-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all ${
              theme === 'dark'
                ? 'border-[#9CFF93] bg-[#22261E] text-[#9CFF93]'
                : 'border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB]'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Chế độ Tối</span>
          </button>
        </div>
      </section>

      {/* 2. Quản lý giao dịch */}
      <section className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-5 sm:p-6 space-y-3">
        <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-[#171C1A] dark:text-white">
          Giao dịch & Hóa đơn
        </h2>
        <Link
          href="/my-tickets"
          className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5 hover:border-[#00B562] dark:hover:border-[#9CFF93] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Receipt className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
            <div>
              <p className="text-xs font-semibold text-[#171C1A] dark:text-white">
                Quản lý giao dịch & Vé đã đặt
              </p>
              <p className="text-[11px] text-[#758A80] dark:text-[#A1A79F]">
                Xem lịch sử thanh toán VietQR, trạng thái vé và mã check-in
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#758A80]" />
        </Link>
      </section>

      {/* 3. Cài đặt thông báo */}
      <section className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-5 sm:p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-[#171C1A] dark:text-white">
            Thông báo
          </h2>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-xs font-semibold text-[#171C1A] dark:text-white">Nhắc lịch qua Email</p>
            <p className="text-[11px] text-[#758A80] dark:text-[#A1A79F]">
              Nhận thông báo xác nhận đặt sân và nhắc giờ ra sân trước 1 tiếng
            </p>
          </div>
          <input
            type="checkbox"
            checked={emailNotif}
            onChange={(e) => setEmailNotif(e.target.checked)}
            className="w-4 h-4 accent-[#00B562]"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-xs font-semibold text-[#171C1A] dark:text-white">Thông báo SMS / Zalo</p>
            <p className="text-[11px] text-[#758A80] dark:text-[#A1A79F]">
              Nhận tin nhắn khi có thay đổi lịch sân hoặc hoàn tiền
            </p>
          </div>
          <input
            type="checkbox"
            checked={smsNotif}
            onChange={(e) => setSmsNotif(e.target.checked)}
            className="w-4 h-4 accent-[#00B562]"
          />
        </label>
      </section>

      {/* 4. Điều khoản, Bảo mật & Cookie */}
      <section className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-5 sm:p-6 space-y-3">
        <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-[#171C1A] dark:text-white">
          Pháp lý & Quyền riêng tư
        </h2>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActivePolicy(activePolicy === 'tos' ? null : 'tos')}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              activePolicy === 'tos'
                ? 'border-[#00B562] bg-[#E6F8F0] text-[#00B562] dark:border-[#9CFF93] dark:bg-[#22261E] dark:text-[#9CFF93]'
                : 'border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Điều khoản sử dụng (ToS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePolicy(activePolicy === 'privacy' ? null : 'privacy')}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              activePolicy === 'privacy'
                ? 'border-[#00B562] bg-[#E6F8F0] text-[#00B562] dark:border-[#9CFF93] dark:bg-[#22261E] dark:text-[#9CFF93]'
                : 'border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Chính sách bảo mật</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePolicy(activePolicy === 'cookie' ? null : 'cookie')}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              activePolicy === 'cookie'
                ? 'border-[#00B562] bg-[#E6F8F0] text-[#00B562] dark:border-[#9CFF93] dark:bg-[#22261E] dark:text-[#9CFF93]'
                : 'border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB]'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Chính sách Cookie</span>
          </button>
        </div>

        {activePolicy === 'tos' && (
          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
            Người dùng có trách nhiệm cung cấp thông tin chính xác khi đặt sân và tuân thủ quy định an toàn tại cơ sở. Các lượt giữ chỗ chưa thanh toán sẽ tự động hủy sau 10 phút.
          </div>
        )}
        {activePolicy === 'privacy' && (
          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
            Phanta chỉ thu thập Họ tên, Số điện thoại và Email phục vụ xác thực đặt sân, xuất vé QR và hỗ trợ hoàn tiền. Chúng tôi không chia sẻ dữ liệu cá nhân cho bên thứ ba.
          </div>
        )}
        {activePolicy === 'cookie' && (
          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
            Hệ thống sử dụng bộ nhớ cục bộ (localStorage/cookie) để duy trì phiên đăng nhập và ghi nhớ chế độ hiển thị Sáng/Tối của bạn.
          </div>
        )}
      </section>
    </div>
  );
}
