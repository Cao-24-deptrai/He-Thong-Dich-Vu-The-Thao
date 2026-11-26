// admin/src/app/about/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  ShieldCheck,
  Building2,
  CalendarPlus,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

const STATS = [
  { value: '3+', label: 'Tổ hợp cơ sở tại TP.HCM' },
  { value: '43', label: 'Sân thi đấu đạt chuẩn quốc tế' },
  { value: '100', label: 'Máy tính đấu trường Esports' },
  { value: '50.000+', label: 'Lượt vận động viên mỗi năm' },
  { value: '99.9%', label: 'Xác thực qua cửa xoay tự động' },
  { value: '24/7', label: 'Đặt sân và giữ chỗ tức thì' },
];

const HIGHLIGHTS = [
  {
    title: 'Mặt Sân Đạt Tiêu Chuẩn Quốc Tế',
    desc: 'Mặt cỏ nhân tạo đạt chuẩn FIFA, thảm cầu lông 5 lớp theo quy chuẩn BWF, cùng cụm sân Pickleball và Tennis phủ Acrylic chống trơn trượt tối đa.',
  },
  {
    title: 'Cửa Xoay Tự Động Quét Mã QR',
    desc: 'Hệ thống kiểm soát vé thông minh tại lối vào sân, nhận diện mã QR chỉ trong 1 giây, bảo đảm không xảy ra tình trạng chồng lấn khung giờ.',
  },
  {
    title: 'Chính Sách Hoàn Tiền Minh Bạch',
    desc: 'Hủy vé và hoàn tiền tự động qua số tài khoản ngân hàng. Bảo đảm quyền lợi người chơi trong các trường hợp thời tiết mưa bão ngoài ý muốn.',
  },
  {
    title: 'Khu Vực Thi Đấu Thể Thao Điện Tử',
    desc: 'Không gian máy cấu hình cao với màn hình tần số quét 240Hz, phục vụ các giải đấu thể thao điện tử phong trào và bán chuyên nghiệp.',
  },
  {
    title: 'Tiện Ích Phục Vụ Toàn Diện',
    desc: 'Khu vực căn tin nước uống, tủ giữ đồ thông minh, phòng tắm nước nóng và khu khởi động chung sạch sẽ, thoáng mát.',
  },
  {
    title: 'Kết Nối Cộng Đồng Người Chơi',
    desc: 'Môi trường thể thao gắn kết người chơi từ khắp các quận huyện, hỗ trợ tìm bạn cùng chơi và tham gia các trận đấu giao lưu cuối tuần.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12 pb-20 max-w-5xl mx-auto font-sans">
      {/* 1. HERO SECTION */}
      <div className="p-8 sm:p-12 rounded-3xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-center space-y-4">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#E3E8E6] dark:border-white/10 text-xs text-[#3B4540] dark:text-[#D1D5DB] bg-white dark:bg-[#121512]">
          <span className="font-heading font-semibold uppercase tracking-wider text-[11px]">Hệ Thống Thể Thao Phanta Sports</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-heading font-black tracking-tight text-[#171C1A] dark:text-white uppercase leading-tight max-w-3xl mx-auto">
          Tổ Hợp Thể Thao & Đặt Sân Trực Tuyến Hiện Đại
        </h1>

        <p className="text-sm sm:text-base text-[#3B4540] dark:text-[#D1D5DB] max-w-2xl mx-auto leading-relaxed">
          Phanta Sports xây dựng nền tảng đặt sân thể thao minh bạch, hỗ trợ người chơi chủ động chọn khung giờ, thanh toán không dùng tiền mặt và vào sân nhanh chóng qua cổng tự động.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/booking"
            className="px-6 py-3 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-black text-xs uppercase tracking-wider transition"
          >
            Đặt Sân Thi Đấu Ngay
          </Link>

          <Link
            href="/my-tickets"
            className="px-6 py-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#171C1A] dark:text-white font-heading font-bold text-xs uppercase tracking-wider transition"
          >
            Kiểm Tra Vé Của Tôi
          </Link>
        </div>
      </div>

      {/* 2. STATS GRID - CÂN BẰNG RESPONSIVE */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {STATS.map((s, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-center space-y-1 shadow-sm"
          >
            <div className="text-2xl sm:text-3xl font-heading font-black text-[#00B562] dark:text-[#9CFF93]">{s.value}</div>
            <div className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-tight mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 3. HIGHLIGHTS & TIÊU CHUẨN KỸ THUẬT */}
      <div className="space-y-6">
        <div className="border-b border-[#E3E8E6] dark:border-white/10 pb-3">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-[#171C1A] dark:text-white uppercase tracking-tight">
            Tiêu Chuẩn Cơ Sở Vật Chất & Vận Hành
          </h2>
          <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1">
            Mọi mặt sân đều được kiểm định chất lượng định kỳ để mang lại trải nghiệm thi đấu an toàn cho hội viên.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] space-y-2 shadow-sm"
            >
              <h3 className="font-heading font-bold text-base text-[#171C1A] dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. ĐỊA ĐIỂM HOẠT ĐỘNG */}
      <div className="p-6 sm:p-8 rounded-3xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E8E6] dark:border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-black text-[#171C1A] dark:text-white uppercase tracking-tight">
              Địa Điểm Tổ Hợp Phanta Sports
            </h2>
            <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-0.5">
              Thời gian mở cửa phục vụ: 06:00 - 23:00 tất cả các ngày trong tuần
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-flex items-center space-x-1.5 text-xs font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93]"
          >
            <span>Xem lịch sân trống</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] space-y-1">
            <h4 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white uppercase">Cơ Sở 1 - Nam Sài Gòn</h4>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB]">Đường Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh</p>
            <p className="text-[11px] text-[#00B562] dark:text-[#9CFF93] pt-1">Bao gồm: Sân bóng đá mini, Cầu lông, Pickleball và Gym</p>
          </div>

          <div className="p-4 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] space-y-1">
            <h4 className="font-heading font-bold text-sm text-[#171C1A] dark:text-white uppercase">Cơ Sở 2 - Khu Công Nghệ Cao</h4>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB]">Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</p>
            <p className="text-[11px] text-[#00B562] dark:text-[#9CFF93] pt-1">Bao gồm: Sân bóng đá 7 người, Tennis, Bóng rổ và Cyber Arena</p>
          </div>
        </div>
      </div>
    </div>
  );
}
