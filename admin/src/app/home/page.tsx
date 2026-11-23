// admin/src/app/home/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  Ticket,
  RotateCcw,
  Headphones,
  Info,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Flame,
  Award,
  ArrowRight,
  QrCode,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api, User, Booking } from '@/lib/api';

const FEATURED_SPORTS = [
  {
    id: 'FOOTBALL',
    name: 'Bóng Đá Sân Cỏ Nhân Tạo',
    types: 'Sân 5 Futsal • Sân 7 Mini • Sân 11 Tiêu chuẩn',
    badge: 'HOT NHẤT',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: '⚽',
    desc: 'Cỏ nhân tạo đạt chuẩn FIFA Quality Pro, hệ thống chiếu sáng LED chống lóa 500 Lux thi đấu ban đêm cực rõ.',
    priceFrom: '200.000 đ/h',
  },
  {
    id: 'BADMINTON',
    name: 'Cầu Lông Thảm Chuyên Nghiệp',
    types: 'Thảm BWF 5 lớp • Sân đơn & Sân đôi',
    badge: 'TIÊU CHUẨN BWF',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: '🏸',
    desc: 'Mặt thảm vinyl chống trơn trượt, độ nảy và bám sàn hoàn hảo, trần cao 9m thông thoáng tiêu chuẩn quốc gia.',
    priceFrom: '90.000 đ/h',
  },
  {
    id: 'PICKLEBALL',
    name: 'Pickleball Quốc Tế',
    types: 'Sơn phủ Acrylic 8 lớp • Tiêu chuẩn USA Pickleball',
    badge: 'XU HƯỚNG 2026',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    icon: '🏓',
    desc: 'Bộ môn thời thượng kết hợp tennis và bóng bàn, mặt sân sơn nhám giảm chấn thương đầu gối và mắt cá.',
    priceFrom: '140.000 đ/h',
  },
  {
    id: 'TENNIS',
    name: 'Quần Vợt Tennis Chuyên Nghiệp',
    types: 'Mặt cứng Hardcourt & Đất nện Clay',
    badge: 'CAO CẤP',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: '🎾',
    desc: 'Khu vực khán đài có mái che, giàn đèn tiêu chuẩn giải Grand Slam, dịch vụ nhặt bóng và căng cước tại chỗ.',
    priceFrom: '250.000 đ/h',
  },
  {
    id: 'BASKETBALL',
    name: 'Bóng Rổ Thi Đấu',
    types: 'Sân bóng rổ Indoor sàn gỗ & Outdoor cao cấp',
    badge: 'TIÊU CHUẨN FIBA',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: '🏀',
    desc: 'Trụ bóng rổ nâng hạ điện lực tử, bảng rổ kính cường lực 12mm chịu lực va đập và dunk bóng an toàn.',
    priceFrom: '180.000 đ/h',
  },
  {
    id: 'ESPORTS',
    name: 'Gaming Stadium 100 Máy',
    types: 'Core i7 Gen 14 • RTX 4070 • Màn hình 240Hz',
    badge: 'ESPORTS VIP',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: '🎮',
    desc: 'Phòng thi đấu cách âm, đường truyền cáp quang chuyên dụng chống giật lag, ghế gaming bọc da công thái học.',
    priceFrom: '15.000 đ/h',
  },
];

const FACILITIES = [
  {
    name: 'Phanta Sports Complex - Cơ sở Quận 7',
    address: 'Số 480 Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM',
    courts: '12 Sân bóng đá, 8 Sân cầu lông, 4 Sân Pickleball',
    hotline: '0988 240 106',
  },
  {
    name: 'Phanta Sports Arena - Cơ sở Thủ Đức',
    address: 'Khu Công Nghệ Cao, Xa lộ Hà Nội, TP. Thủ Đức, TP.HCM',
    courts: '10 Sân bóng đá, 6 Sân tennis, Khu Gaming 100 máy',
    hotline: '0988 280 906',
  },
  {
    name: 'Phanta Athletic Park - Cơ sở Tân Bình',
    address: 'Số 152 Cộng Hòa, Phường 12, Quận Tân Bình, TP.HCM',
    courts: '8 Sân Pickleball, 6 Sân cầu lông, Canteen & GYM Fitness',
    hotline: '0988 190 705',
  },
];

export default function CustomerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [refundPendingCount, setRefundPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = api.getUser();
    setUser(currentUser);

    if (currentUser) {
      api.getMyBookings()
        .then((bookings) => {
          // Lấy đơn CONFIRMED gần nhất
          const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED');
          if (activeBookings.length > 0) {
            setUpcomingBooking(activeBookings[0]);
          }
          // Đếm đơn chờ hoàn tiền
          const pendingRefunds = bookings.filter((b) => b.status === 'REFUND_PENDING');
          setRefundPendingCount(pendingRefunds.length);
        })
        .catch((err) => console.error('Error fetching bookings:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0d1527] to-[#07131e] p-6 sm:p-10 lg:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ Thống Đặt Sân Thể Thao Tự Động 24/7</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Nâng Tầm Trải Nghiệm{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Thể Thao Đỉnh Cao
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Chào mừng {user ? <strong className="text-cyan-300 font-bold">{user.fullName || user.phone}</strong> : 'bạn'} đến với Phanta Sports. 
            Đặt sân nhanh chóng, giữ chỗ thời gian thực, quét mã VietQR tự động và vào sân tức thì với vé QR thông minh.
          </p>

          {/* Quick CTAs */}
          <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
            <Link
              href="/booking"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Đặt Sân Ngay</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/my-tickets"
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-sm transition hover:text-white"
            >
              <Ticket className="w-4 h-4 text-cyan-400" />
              <span>Vé Của Tôi</span>
            </Link>

            <Link
              href="/support"
              className="inline-flex items-center space-x-2 px-4 py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-sm transition"
            >
              <Headphones className="w-4 h-4 text-emerald-400" />
              <span>Trung Tâm Hỗ Trợ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. UPCOMING TICKET / REFUND ALERT WIDGET */}
      {user && (upcomingBooking || refundPendingCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingBooking && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Vé Sắp Diễn Ra</span>
                </div>
                <h4 className="text-base font-bold text-white">{upcomingBooking.venueId?.name || 'Sân thể thao'}</h4>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {upcomingBooking.bookingDate} ({upcomingBooking.startTime} - {upcomingBooking.endTime})
                </p>
              </div>

              <Link
                href="/my-tickets"
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center space-x-1.5 transition shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span>Xem Mã QR</span>
              </Link>
            </div>
          )}

          {refundPendingCount > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Yêu Cầu Hoàn Tiền</span>
                </div>
                <h4 className="text-base font-bold text-white">Bạn có {refundPendingCount} đơn chờ đối soát</h4>
                <p className="text-xs text-slate-400">Ban quản lý đang tiến hành chuyển tiền hoàn theo tài khoản của bạn</p>
              </div>

              <Link
                href="/my-tickets"
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition shrink-0"
              >
                <span>Xem Trạng Thái</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 3. FOUR CORE MODULES QUICK ACCESS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/booking"
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">Đặt Sân Trực Tuyến</h3>
            <p className="text-[11px] text-slate-400 mt-1">48 slot 30 phút, giữ chỗ và thanh toán VietQR tự động</p>
          </div>
          <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
            <span>Chọn sân ngay</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/my-tickets"
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition-all duration-200 group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Vé & Mã QR Check-in</h3>
            <p className="text-[11px] text-slate-400 mt-1">Lịch sử đặt sân, mã QR vào cổng và quản lý vé</p>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <span>Xem vé của bạn</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/my-tickets"
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 transition-all duration-200 group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">Chính Sách Hoàn Tiền</h3>
            <p className="text-[11px] text-slate-400 mt-1">Hủy sân trước 24h hoàn 100%, hủy từ 2h - 24h hoàn 50%</p>
          </div>
          <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
            <span>Yêu cầu hoàn tiền</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/support"
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-blue-500/40 transition-all duration-200 group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">Hỗ Trợ & Khiếu Nại</h3>
            <p className="text-[11px] text-slate-400 mt-1">Hotline trực tiếp, FAQ giải đáp thắc mắc và liên hệ</p>
          </div>
          <div className="text-[11px] text-blue-400 font-bold flex items-center gap-1">
            <span>Gửi phản hồi</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 4. FEATURED SPORTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-rose-500" />
              Các Bộ Môn Thể Thao Tiêu Chuẩn
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Sân bãi chất lượng cao, trang thiết bị thi đấu đạt chuẩn quốc tế</p>
          </div>

          <Link
            href="/booking"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Xem tất cả sân</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_SPORTS.map((sport) => (
            <div
              key={sport.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{sport.icon}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${sport.badgeColor}`}>
                    {sport.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{sport.name}</h3>
                <p className="text-xs text-cyan-300/80 font-medium mt-0.5">{sport.types}</p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{sport.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Giá từ</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{sport.priceFrom}</span>
                </div>
                <Link
                  href={`/booking`}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Đặt sân</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SPORTS COMPLEXES & BRANCHES */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Hệ Thống Tổ Hợp Sân Phanta Sports
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Các cụm sân thể thao hiện đại tọa lạc tại các vị trí thuận tiện giao thông, bãi đỗ xe rộng rãi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FACILITIES.map((f, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <h4 className="text-sm font-bold text-white leading-tight">{f.name}</h4>
              <p className="text-xs text-slate-400 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{f.address}</span>
              </p>
              <div className="text-[11px] text-cyan-300 font-medium pt-1">
                {f.courts}
              </div>
              <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                Hotline: {f.hotline}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TRANSPARENT REFUND COMMITMENT BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cam Kết Minh Bạch 100%</span>
          </div>
          <h3 className="text-xl font-bold text-white">Chính Sách Hủy Đơn & Hoàn Tiền Linh Hoạt</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Bạn có việc bận đột xuất? Chỉ cần hủy vé trước 24h để nhận hoàn 100% học phí hoặc cọc sân. 
            Mọi quy trình được xử lý trực tiếp ngay tại trang <strong className="text-cyan-300">Vé của tôi</strong> mà không cần thủ tục rườm rà.
          </p>
        </div>

        <Link
          href="/my-tickets"
          className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0"
        >
          Quản Lý Vé & Hoàn Tiền
        </Link>
      </div>
    </div>
  );
}
