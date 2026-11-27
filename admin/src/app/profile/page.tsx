'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Camera,
  Check,
  X,
  Phone,
  Mail,
  User as UserIcon,
  Award,
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Clock,
} from 'lucide-react';
import { api, User } from '@/lib/api';

function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Không thể xử lý ảnh'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Tệp ảnh không hợp lệ'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
    reader.readAsDataURL(file);
  });
}

interface TierInfo {
  name: string;
  nextName: string | null;
  nextThreshold: number | null;
  badgeClass: string;
}

function getMembershipTier(totalSpend: number): TierInfo {
  if (totalSpend >= 15000000) {
    return {
      name: 'Kim Cương',
      nextName: null,
      nextThreshold: null,
      badgeClass:
        'bg-[#E6F8F0] text-[#00914E] border-[#00B562]/30 dark:bg-[#22261E] dark:text-[#9CFF93] dark:border-[#9CFF93]/30',
    };
  }
  if (totalSpend >= 5000000) {
    return {
      name: 'Vàng',
      nextName: 'Kim Cương',
      nextThreshold: 15000000,
      badgeClass:
        'bg-amber-50 text-amber-800 border-amber-300/60 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700/40',
    };
  }
  if (totalSpend >= 1000000) {
    return {
      name: 'Bạc',
      nextName: 'Vàng',
      nextThreshold: 5000000,
      badgeClass:
        'bg-slate-100 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-200 dark:border-white/15',
    };
  }
  return {
    name: 'Đồng',
    nextName: 'Bạc',
    nextThreshold: 1000000,
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
  };
}

const SPORT_OPTIONS = ['Bóng đá', 'Cầu lông', 'Pickleball', 'Tennis', 'Bóng rổ', 'Esports'];

export default function CustomerProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteSports, setFavoriteSports] = useState<string[]>(['Bóng đá', 'Cầu lông']);

  useEffect(() => {
    const stored = api.getUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
    setFullName(stored.fullName || '');
    setEmail(stored.email || '');
    setPhone(stored.phone || '');
    setAvatarUrl(stored.avatarUrl || '');

    try {
      const savedExtra = localStorage.getItem(`phanta_profile_extra_${stored.id}`);
      if (savedExtra) {
        const parsed = JSON.parse(savedExtra);
        if (typeof parsed.bio === 'string') setBio(parsed.bio);
        if (typeof parsed.coverUrl === 'string') setCoverUrl(parsed.coverUrl);
        if (Array.isArray(parsed.favoriteSports)) setFavoriteSports(parsed.favoriteSports);
      }
    } catch {
      // ignore storage error
    }

    api
      .getMyBookings()
      .then((list) => {
        if (Array.isArray(list)) setBookings(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải ảnh lên');
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1200);
      setCoverUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải ảnh bìa lên');
    }
  };

  const toggleSport = (sport: string) => {
    setFavoriteSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  };

  const handleCancelEdit = () => {
    if (!user) return;
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatarUrl || '');
    setError(null);
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      let updated = await api.updateMyProfile({
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      const cleanPhone = phone.replace(/[\s.\-()]/g, '');
      if (cleanPhone && cleanPhone !== (user.phone || '')) {
        updated = await api.updateMyPhone(cleanPhone);
      }

      try {
        localStorage.setItem(
          `phanta_profile_extra_${user.id}`,
          JSON.stringify({ bio: bio.trim(), coverUrl, favoriteSports }),
        );
      } catch {
        // ignore storage error
      }

      setUser(updated);
      window.dispatchEvent(new Event('phanta_user_updated'));
      setEditing(false);
      setSuccessMsg('Đã cập nhật thông tin cá nhân.');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Cập nhật thất bại. Vui lòng thử lại.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-sm text-[#758A80] dark:text-[#A1A79F]">
        Đang tải trang cá nhân...
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) =>
    ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.status),
  );
  const totalSpend = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
  const tier = getMembershipTier(totalSpend);
  const tierProgress = tier.nextThreshold
    ? Math.min(100, Math.round((totalSpend / tier.nextThreshold) * 100))
    : 100;

  const initials = (user.fullName || user.phone || 'U')
    .trim()
    .split(/\s+/)
    .slice(-1)[0]
    ?.charAt(0)
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/home"
          className="inline-flex items-center space-x-2 text-xs font-medium text-[#758A80] dark:text-[#A1A79F] hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-[#E6F8F0] dark:bg-[#121512] border border-[#00B562]/30 dark:border-[#9CFF93]/30 text-xs text-[#00B562] dark:text-[#9CFF93]">
          {successMsg}
        </div>
      )}

      {/* Khối Cover + Avatar + Tên (Social Profile Header) */}
      <div className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] overflow-hidden">
        {/* Ảnh bìa thể thao */}
        <div className="h-36 sm:h-48 w-full relative bg-[#121512] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{
              backgroundImage: `url('${
                coverUrl ||
                'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600&auto=format&fit=crop'
              }')`,
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-[#191C14] dark:via-[#191C14]/60 dark:to-transparent" />
          {editing && (
            <label
              htmlFor="cover-file-input"
              className="absolute top-3 right-3 z-20 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Đổi ảnh bìa</span>
              <input
                id="cover-file-input"
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {/* Phần Avatar nổi và thông tin chính */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="relative w-24 h-24 shrink-0 rounded-full ring-4 ring-white dark:ring-[#191C14] bg-white dark:bg-[#191C14]">
                {editing ? (
                  <label
                    htmlFor="avatar-file-input"
                    title="Chọn ảnh đại diện từ thiết bị"
                    className="block w-24 h-24 cursor-pointer group relative"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName || 'Avatar'}
                        className="w-24 h-24 rounded-full object-cover group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[#E6F8F0] dark:bg-[#22261E] text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center font-heading font-bold text-3xl select-none group-hover:opacity-80 transition-opacity">
                        {initials || <UserIcon className="w-9 h-9" />}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00B562] group-hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:text-[#0C0F0C] flex items-center justify-center shadow-sm transition-colors">
                      <Camera className="w-4 h-4" />
                    </span>
                    <input
                      id="avatar-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                  </label>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'Avatar'}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#E6F8F0] dark:bg-[#22261E] text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center font-heading font-bold text-3xl select-none">
                    {initials || <UserIcon className="w-9 h-9" />}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 sm:pt-0 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-heading font-semibold text-2xl text-[#171C1A] dark:text-white leading-tight">
                    {user.fullName || 'Thành viên Phanta'}
                  </h1>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tier.badgeClass}`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{tier.name}</span>
                  </span>
                </div>
                <p className="text-xs text-[#758A80] dark:text-[#A1A79F] leading-relaxed">
                  {bio || 'Chưa có tiểu sử. Hãy giới thiệu đôi nét về phong cách chơi thể thao của bạn.'}
                </p>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg(null);
                  setEditing(true);
                }}
                title="Chỉnh sửa thông tin cá nhân"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/15 bg-white dark:bg-[#121512] hover:border-[#00B562] dark:hover:border-[#9CFF93] text-xs font-medium text-[#171C1A] dark:text-white transition-colors self-start sm:self-end"
              >
                <Pencil className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>

          {/* Thanh chỉ số hoạt động & tiến độ hạng */}
          <div className="mt-6 pt-5 border-t border-[#E3E8E6] dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5">
              <p className="text-xs text-[#758A80] dark:text-[#A1A79F]">Số trận đã đặt</p>
              <p className="font-heading font-semibold text-xl text-[#171C1A] dark:text-white mt-0.5">
                {confirmedBookings.length} trận
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5">
              <p className="text-xs text-[#758A80] dark:text-[#A1A79F]">Chi tiêu tích lũy</p>
              <p className="font-heading font-semibold text-xl text-[#171C1A] dark:text-white mt-0.5">
                {totalSpend.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#758A80] dark:text-[#A1A79F]">
                  {tier.nextName ? `Tiến độ lên ${tier.nextName}` : 'Hạng cao nhất'}
                </span>
                <span className="font-medium text-[#00B562] dark:text-[#9CFF93]">{tierProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E3E8E6] dark:bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00B562] dark:bg-[#9CFF93] transition-all"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lưới 2 cột: Cột trái (Thông tin cá nhân / Form sửa) & Cột phải (Hoạt động gần đây) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Thông tin & Giới thiệu */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-6 space-y-5 h-fit"
        >
          <h2 className="font-heading font-semibold text-base text-[#171C1A] dark:text-white">
            Thông tin cá nhân
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 text-xs text-[#758A80] dark:text-[#A1A79F] mb-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Họ và tên</span>
              </label>
              {editing ? (
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên của bạn"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-sm text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562]"
                />
              ) : (
                <p className="text-sm font-medium text-[#171C1A] dark:text-white">
                  {user.fullName || 'Chưa cập nhật'}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2 text-xs text-[#758A80] dark:text-[#A1A79F] mb-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Số điện thoại</span>
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="vd: 0912345678"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-sm text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562]"
                />
              ) : (
                <p className="text-sm font-medium text-[#171C1A] dark:text-white">
                  {user.phone || 'Chưa cập nhật'}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2 text-xs text-[#758A80] dark:text-[#A1A79F] mb-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </label>
              {editing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vd: email@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-sm text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562]"
                />
              ) : (
                <p className="text-sm font-medium text-[#171C1A] dark:text-white">
                  {user.email || 'Chưa có email'}
                </p>
              )}
            </div>

            {editing && (
              <div>
                <label className="block text-xs text-[#758A80] dark:text-[#A1A79F] mb-1.5">
                  Tiểu sử ngắn
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Giới thiệu vị trí sở trường hoặc khung giờ hay chơi..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-sm text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562] resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-[#758A80] dark:text-[#A1A79F] mb-2">
                Bộ môn yêu thích
              </label>
              <div className="flex flex-wrap gap-2">
                {(editing ? SPORT_OPTIONS : favoriteSports).map((sport) => {
                  const selected = favoriteSports.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleSport(sport)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-[#00B562]/40 bg-[#E6F8F0] text-[#00914E] dark:border-[#9CFF93]/40 dark:bg-[#22261E] dark:text-[#9CFF93]'
                          : 'border-[#E3E8E6] dark:border-white/10 text-[#758A80] dark:text-[#A1A79F]'
                      } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {sport}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E3E8E6] dark:border-white/10">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 text-xs font-medium text-[#3B4540] dark:text-[#D1D5DB] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#00B562] hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:hover:bg-[#1ED760] dark:text-[#0C0F0C] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Cột phải: Dòng hoạt động ra sân gần đây */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-base text-[#171C1A] dark:text-white">
              Hoạt động ra sân gần đây
            </h2>
            <Link
              href="/my-tickets"
              className="text-xs font-medium text-[#00B562] dark:text-[#9CFF93] hover:underline"
            >
              Xem tất cả vé
            </Link>
          </div>

          {(() => {
            const completedActivities = bookings.filter((b) =>
              ['CHECKED_IN', 'COMPLETED'].includes(b.status),
            );
            if (completedActivities.length === 0) {
              return (
                <div className="py-10 text-center space-y-2">
                  <Ticket className="w-8 h-8 mx-auto text-[#758A80] dark:text-[#A1A79F] opacity-60" />
                  <p className="text-sm font-medium text-[#171C1A] dark:text-white">
                    Chưa có hoạt động ra sân nào
                  </p>
                  <p className="text-xs text-[#758A80] dark:text-[#A1A79F]">
                    Các lượt đặt sân sau khi bạn check-in và hoàn tất trận đấu sẽ hiển thị tại đây.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/booking"
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-[#00B562] text-white dark:bg-[#9CFF93] dark:text-[#0C0F0C] text-xs font-semibold"
                    >
                      Đặt sân ngay
                    </Link>
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {completedActivities.slice(0, 5).map((b) => {
                  const venueName = b.venueId?.name || 'Sân thể thao Phanta';
                  const dateStr = b.bookingDate
                    ? new Date(b.bookingDate).toLocaleDateString('vi-VN')
                    : '';
                  return (
                    <div
                      key={b._id}
                      className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <p className="font-heading font-semibold text-sm text-[#171C1A] dark:text-white flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
                          <span>{venueName}</span>
                        </p>
                        <p className="text-xs text-[#758A80] dark:text-[#A1A79F] flex items-center space-x-3">
                          <span className="inline-flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{dateStr}</span>
                          </span>
                          <span className="inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {b.startTime} - {b.endTime}
                            </span>
                          </span>
                        </p>
                      </div>

                      <span className="text-xs font-semibold text-[#171C1A] dark:text-white">
                        {(Number(b.totalPrice) || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
