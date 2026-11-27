// admin/src/app/home/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarPlus,
  Ticket,
  RotateCcw,
  Headphones,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Phone
} from 'lucide-react';
import { api, User, Booking } from '@/lib/api';

const FEATURED_SPORTS = [
  {
    id: 'FOOTBALL',
    name: 'Bóng Đá Sân Cỏ Nhân Tạo',
    types: 'Sân 5 Futsal - Sân 7 Mini - Sân 11 Tiêu chuẩn',
    badge: 'Phổ biến nhất',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
    desc: 'Mặt cỏ nhân tạo đạt chứng chỉ FIFA Quality Pro, dàn đèn LED chiếu sáng 500 Lux chống chói thi đấu buổi tối.',
    priceFrom: '200.000 đ/giờ',
  },
  {
    id: 'BADMINTON',
    name: 'Cầu Lông Thảm Chuyên Nghiệp',
    types: 'Thảm BWF 5 lớp - Sân đơn - Sân đôi',
    badge: 'Tiêu chuẩn BWF',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    desc: 'Thảm vinyl giảm chấn thương, độ bám sân cao, chiều cao trần nhà 9m thông thoáng đúng tiêu chuẩn thi đấu.',
    priceFrom: '90.000 đ/giờ',
  },
  {
    id: 'PICKLEBALL',
    name: 'Pickleball Thi Đấu',
    types: 'Sơn phủ Acrylic 8 lớp - Tiêu chuẩn QT',
    badge: 'Bộ môn mới',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80',
    desc: 'Mặt sân nhám ma sát cao chống trơn trượt, khu vực vạch kẻ rõ ràng theo quy định Liên đoàn Pickleball.',
    priceFrom: '140.000 đ/giờ',
  },
  {
    id: 'TENNIS',
    name: 'Quần Vợt Tennis Chuyên Nghiệp',
    types: 'Mặt sân cứng Hardcourt - Đất nện',
    badge: 'Cao cấp',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
    desc: 'Khu khán đài có mái che, giàn đèn chuẩn thi đấu, hỗ trợ dịch vụ nhặt bóng và căng vợt tại cụm sân.',
    priceFrom: '250.000 đ/giờ',
  },
  {
    id: 'BASKETBALL',
    name: 'Bóng Rổ Thi Đấu',
    types: 'Sàn gỗ trong nhà - Sân ngoài trời',
    badge: 'Tiêu chuẩn FIBA',
    image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&q=80',
    desc: 'Trụ bóng rổ thủy lực tiêu chuẩn, bảng rổ kính cường lực 12mm chịu lực va đập cao, an toàn khi tranh chấp bóng.',
    priceFrom: '180.000 đ/giờ',
  },
  {
    id: 'ESPORTS',
    name: 'Khu Gaming Thể Thao Điện Tử',
    types: 'Cấu hình i7 Gen 14 - RTX 4070 - Màn hình 240Hz',
    badge: 'Esports Stadium',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    desc: 'Phòng máy cách âm, đường truyền cáp quang nội bộ ổn định, trang bị ghế gaming công thái học cao cấp.',
    priceFrom: '15.000 đ/giờ',
  },
];

export default function CustomerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [refundPendingCount, setRefundPendingCount] = useState<number>(0);
  const [facilities, setFacilities] = useState<any[]>([]);

  useEffect(() => {
    api
      .getFacilities()
      .then((list) => {
        if (Array.isArray(list)) setFacilities(list);
      })
      .catch(() => {});

    const currentUser = api.getUser();
    setUser(currentUser);

    if (currentUser) {
      api.getMyBookings()
        .then((bookings) => {
          const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED');
          if (activeBookings.length > 0) {
            setUpcomingBooking(activeBookings[0]);
          }
          const pendingRefunds = bookings.filter((b) => b.status === 'REFUND_PENDING');
          setRefundPendingCount(pendingRefunds.length);
        })
        .catch((err) => console.error('Error fetching bookings:', err));
    }
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* 1. HERO SECTION (MIRRORED PLAYO LAYOUT) */}
      <section className="bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* CỘT TRÁI (55%): CỤM ẢNH THỂ THAO 4 MÔN VỚI LOGO EMBLEM Ở TRUNG TÂM */}
          <div className="lg:col-span-7 relative order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 relative rounded-2xl overflow-hidden p-2 bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5">
              {/* Ảnh 1: Bóng đá */}
              <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80"
                  alt="Sân bóng đá Phanta"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 30vw"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Ảnh 2: Cầu lông */}
              <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80"
                  alt="Sân cầu lông Phanta"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 30vw"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Ảnh 3: Tennis / Pickleball */}
              <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80"
                  alt="Sân Pickleball Phanta"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 30vw"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Ảnh 4: Bóng rổ */}
              <div className="relative h-44 sm:h-52 rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&q=80"
                  alt="Sân bóng rổ Phanta"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 30vw"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* HUY HIỆU TRUNG TÂM MANG LOGO PHANTA */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#F3F4F6] border-4 border-[#00B562] dark:border-[#9CFF93] shadow-lg flex items-center justify-center p-2.5">
                  <div className="w-full h-full relative">
                    <Image
                      src="/PHANTAtransparent.png"
                      alt="Phanta Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (45%): TIÊU ĐỀ LỚN, MÔ TẢ VÀ NÚT HÀNH ĐỘNG */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            {/* Tiêu đề lớn Barlow */}
            <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-[#171C1A] dark:text-white uppercase tracking-tight leading-[1.1]">
              ĐẶT SÂN THỂ THAO.<br />
              THAM GIA TRẬN ĐẤU.<br />
              <span className="text-[#00B562] dark:text-[#9CFF93]">TÌM BẠN CHƠI CÙNG.</span>
            </h1>

            {/* Mô tả sứ mạng & giá trị mang lại (Humanizer) */}
            <p className="text-sm sm:text-base text-[#758A80] dark:text-[#A1A79F] leading-relaxed">
              Phanta ra đời để việc ra sân mỗi ngày trở nên nhẹ nhàng hơn: không còn cảnh gọi điện dò hỏi giờ trống hay chờ đợi xác nhận thủ công. Chúng tôi kết nối bạn với cộng đồng cùng đam mê, giúp bạn giữ trọn nhịp vận động và tận hưởng từng trận đấu.
            </p>

            {/* Cặp nút hành động */}
            <div className="pt-2 flex flex-wrap gap-3 sm:gap-4 items-center">
              <Link
                href="/booking"
                className="font-heading font-bold text-sm uppercase tracking-wide inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-[#00B562] hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:hover:bg-[#1ED760] dark:text-[#0C0F0C] transition-colors shadow-sm"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Đặt Sân Ngay</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <a
                href="#facilities"
                className="font-heading font-semibold text-sm tracking-wide inline-flex items-center space-x-2 px-5 py-3.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] transition-colors"
              >
                <Building2 className="w-4 h-4 text-[#758A80] dark:text-[#A1A79F]" />
                <span>Xem danh sách cơ sở</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THÔNG BÁO VÉ SẮP TỚI & YÊU CẦU HOÀN TIỀN (KHÔNG CHẤM CHỚP) */}
      {user && (upcomingBooking || refundPendingCount > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingBooking && (
            <div className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-[#191C14] border border-[#00B562]/30 dark:border-[#9CFF93]/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#00B562] dark:text-[#9CFF93]">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-heading font-bold uppercase tracking-wider">Vé sắp diễn ra</span>
                </div>
                <h4 className="font-heading font-bold text-base text-[#171C1A] dark:text-white">
                  {upcomingBooking.venueId?.name || 'Sân thể thao'}
                </h4>
                <p className="text-xs text-[#758A80] dark:text-[#A1A79F]">
                  Ngày {upcomingBooking.bookingDate} ({upcomingBooking.startTime} - {upcomingBooking.endTime})
                </p>
              </div>

              <Link
                href="/my-tickets"
                className="px-4 py-2 rounded-lg bg-[#00B562] hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:hover:bg-[#1ED760] dark:text-[#0C0F0C] text-xs font-heading font-bold tracking-wider flex items-center space-x-1.5 transition-colors shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Xem mã QR</span>
              </Link>
            </div>
          )}

          {refundPendingCount > 0 && (
            <div className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-[#191C14] border border-amber-300 dark:border-amber-600/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="font-heading font-bold uppercase tracking-wider">Yêu cầu hoàn tiền</span>
                </div>
                <h4 className="font-heading font-bold text-base text-[#171C1A] dark:text-white">
                  Bạn có {refundPendingCount} đơn chờ đối soát
                </h4>
                <p className="text-xs text-[#758A80] dark:text-[#A1A79F]">
                  Ban quản lý đang tiến hành chuyển tiền hoàn theo tài khoản của bạn
                </p>
              </div>

              <Link
                href="/my-tickets"
                className="px-4 py-2 rounded-lg border border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-heading font-bold tracking-wider flex items-center space-x-1.5 transition-colors shrink-0"
              >
                <span>Xem trạng thái</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 3. BỐN LỐI TẮT TRỌNG TÂM (UNSLOP - NO ARBITRARY HOVER JUMPS) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/booking"
          className="p-5 rounded-2xl bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 hover:border-[#00B562] dark:hover:border-[#9CFF93] transition-colors flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 flex items-center justify-center text-[#00B562] dark:text-[#9CFF93]">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">Đặt Sân Trực Tuyến</h3>
            <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-1 leading-relaxed">
              Khung giờ 30 phút, thanh toán VietQR tự động
            </p>
          </div>
          <div className="text-xs text-[#00B562] dark:text-[#9CFF93] font-semibold flex items-center gap-1">
            <span>Chọn sân</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/my-tickets"
          className="p-5 rounded-2xl bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 hover:border-[#00B562] dark:hover:border-[#9CFF93] transition-colors flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 flex items-center justify-center text-[#00B562] dark:text-[#9CFF93]">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">Vé & Mã Check-in</h3>
            <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-1 leading-relaxed">
              Mã QR động 60 giây và lịch sử đặt sân
            </p>
          </div>
          <div className="text-xs text-[#00B562] dark:text-[#9CFF93] font-semibold flex items-center gap-1">
            <span>Xem vé</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/my-tickets"
          className="p-5 rounded-2xl bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 hover:border-[#00B562] dark:hover:border-[#9CFF93] transition-colors flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 flex items-center justify-center text-[#00B562] dark:text-[#9CFF93]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">Chính Sách Hoàn Tiền</h3>
            <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-1 leading-relaxed">
              Hủy trước 24 giờ hoàn 100%, hủy từ 2-24 giờ hoàn 50%
            </p>
          </div>
          <div className="text-xs text-[#00B562] dark:text-[#9CFF93] font-semibold flex items-center gap-1">
            <span>Chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/support"
          className="p-5 rounded-2xl bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 hover:border-[#00B562] dark:hover:border-[#9CFF93] transition-colors flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 flex items-center justify-center text-[#00B562] dark:text-[#9CFF93]">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">Trung Tâm Hỗ Trợ</h3>
            <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-1 leading-relaxed">
              Hotline cơ sở, tra cứu giao dịch và gửi phản hồi
            </p>
          </div>
          <div className="text-xs text-[#00B562] dark:text-[#9CFF93] font-semibold flex items-center gap-1">
            <span>Liên hệ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </section>

      {/* 4. CÁC BỘ MÔN PHỔ BIẾN (POPULAR SPORTS - PLAYO STYLE) */}
      <section id="sports" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#E3E8E6] dark:border-white/10 pb-4">
          <div>
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#00B562] dark:text-[#9CFF93]">
              Danh mục bộ môn
            </span>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#171C1A] dark:text-white uppercase tracking-tight mt-1">
              Các Môn Thể Thao Phổ Biến
            </h2>
          </div>
          <Link
            href="/booking"
            className="text-xs font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93] hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả sân</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_SPORTS.map((sport) => (
            <div
              key={sport.id}
              className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] overflow-hidden flex flex-col justify-between transition-colors"
            >
              <div>
                {/* Ảnh môn thể thao */}
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={sport.image}
                    alt={sport.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute top-3 right-3 text-[11px] font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/90 text-[#171C1A] dark:bg-black/70 dark:text-white backdrop-blur-sm">
                    {sport.badge}
                  </span>
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-xs text-slate-200 block">Giá từ</span>
                    <span className="font-heading font-bold text-base text-[#9CFF93]">
                      {sport.priceFrom}
                    </span>
                  </div>
                </div>

                {/* Nội dung môn */}
                <div className="p-5 space-y-2.5">
                  <h3 className="font-heading font-bold text-lg text-[#171C1A] dark:text-white leading-snug">
                    {sport.name}
                  </h3>
                  <div className="text-xs font-medium text-[#00B562] dark:text-[#9CFF93]">
                    {sport.types}
                  </div>
                  <p className="text-xs text-[#758A80] dark:text-[#A1A79F] leading-relaxed">
                    {sport.desc}
                  </p>
                </div>
              </div>

              {/* Nút đặt sân */}
              <div className="p-5 pt-0">
                <Link
                  href={`/booking?sport=${sport.id}`}
                  className="w-full text-center py-2.5 px-4 rounded-xl border border-[#E3E8E6] dark:border-white/15 text-[#171C1A] dark:text-white hover:bg-[#00B562] hover:text-white hover:border-[#00B562] dark:hover:bg-[#9CFF93] dark:hover:text-[#0C0F0C] dark:hover:border-[#9CFF93] font-heading font-bold text-xs uppercase tracking-wider transition-colors inline-block"
                >
                  Chọn sân {sport.name.split(' ')[0]}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. DANH SÁCH CƠ SỞ (FACILITIES) */}
      <section id="facilities" className="space-y-6">
        <div className="border-b border-[#E3E8E6] dark:border-white/10 pb-4">
          <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#00B562] dark:text-[#9CFF93]">
            Cơ sở tổ hợp
          </span>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#171C1A] dark:text-white uppercase tracking-tight mt-1">
            Hệ Thống Cụm Sân Tại TP. Hồ Chí Minh
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {facilities.length === 0 ? (
            <div className="col-span-full p-8 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-center text-xs text-[#758A80] dark:text-[#A1A79F]">
              Đang tải danh sách cơ sở từ hệ thống...
            </div>
          ) : (
            facilities.map((facility, idx) => (
              <div
                key={facility._id || facility.name}
                className="p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00B562]/10 dark:bg-[#9CFF93]/10 text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center font-heading font-black text-sm">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </div>
                  <h3 className="font-heading font-bold text-base text-[#171C1A] dark:text-white">
                    {facility.name}
                  </h3>
                  <p className="text-xs text-[#758A80] dark:text-[#A1A79F] flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93] shrink-0 mt-0.5" />
                    <span>{facility.address || 'TP. Hồ Chí Minh'}</span>
                  </p>
                  {facility.description && (
                    <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] font-medium">
                      {facility.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E3E8E6] dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#758A80] dark:text-[#A1A79F]">
                    Hotline: {facility.phone || facility.hotline || '0988 240 106'}
                  </span>
                  <Link
                    href={`/booking${facility._id ? `?facilityId=${facility._id}` : ''}`}
                    className="font-heading font-bold text-[#00B562] dark:text-[#9CFF93] hover:underline uppercase text-[11px]"
                  >
                    Đặt tại cơ sở này
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
