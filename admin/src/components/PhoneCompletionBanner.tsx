// admin/src/components/PhoneCompletionBanner.tsx
'use client';

import React, { useState } from 'react';
import { Phone, CheckCircle2 } from 'lucide-react';
import { api, User } from '@/lib/api';

interface PhoneCompletionBannerProps {
  user: User;
  onUpdated: (updatedUser: User) => void;
  title?: string;
  description?: string;
  allowSkip?: boolean;
  onSkip?: () => void;
}

export default function PhoneCompletionBanner({
  user,
  onUpdated,
  title = 'Bổ sung số điện thoại để đặt sân & nhận vé QR',
  description = 'Tài khoản Google của bạn chưa có số điện thoại liên hệ. Vui lòng cập nhật để thuận tiện giữ sân, nhận thông báo và tra cứu tại quầy.',
  allowSkip = false,
  onSkip,
}: PhoneCompletionBannerProps) {
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setError('Số điện thoại không hợp lệ (10 chữ số VN, vd: 0912345678).');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateMyPhone(cleanPhone);
      setSaved(true);
      onUpdated(updated);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu số điện thoại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-[#00B562]/30 bg-[#E6F8F0] dark:bg-[#9CFF93]/10 text-[#00914E] dark:text-[#9CFF93] text-xs flex items-center space-x-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Đã cập nhật số điện thoại thành công!</span>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-[#00B562]/30 dark:border-[#9CFF93]/25 bg-[#E6F8F0]/70 dark:bg-[#191C14] space-y-3">
      <div className="flex items-start space-x-3">
        <div className="w-9 h-9 rounded-xl bg-[#00B562]/15 dark:bg-[#9CFF93]/15 flex items-center justify-center shrink-0 text-[#00B562] dark:text-[#9CFF93]">
          <Phone className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Nhập số điện thoại (vd: 0912345678)"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#0C0F0C] text-[#171C1A] dark:text-white text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-bold text-xs uppercase tracking-wider hover:opacity-95 transition disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu SĐT'}
          </button>
          {allowSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 text-xs font-medium text-[#3B4540] dark:text-[#D1D5DB] hover:bg-white dark:hover:bg-white/5 transition"
            >
              Để sau
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
