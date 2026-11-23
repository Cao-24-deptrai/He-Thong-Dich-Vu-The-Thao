// admin/src/app/about/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Info,
  Sparkles,
  Award,
  ShieldCheck,
  Zap,
  MapPin,
  Users,
  Trophy,
  Gamepad2,
  CalendarPlus,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Coffee,
  Ticket
} from 'lucide-react';

const STATS = [
  { value: '3+', label: 'Tổ hợp cơ sở tại TP.HCM' },
  { value: '30+', label: 'Sân thi đấu tiêu chuẩn QT' },
  { value: '100', label: 'Máy Gaming Arena cấu hình cao' },
  { value: '50.000+', label: 'Lượt thi đấu mỗi năm' },
  { value: '99.9%', label: 'Xác thực vé QR cổng xoay IoT' },
  { value: '24/7', label: 'Đặt sân & thanh toán VietQR' },
];

const HIGHLIGHTS = [
  {
    icon: Trophy,
    title: 'Sân Bãi Chuẩn Quốc Tế',
    desc: 'Mặt cỏ nhân tạo FIFA Quality Pro, thảm cầu lông BWF 5 lớp, mặt sân Pickleball & Tennis sơn phủ Acrylic giảm chấn thương thể thao tối đa.',
  },
  {
    icon: Cpu,
    title: 'Công Nghệ Vận Hành IoT',
    desc: 'Hệ thống cửa xoay tự động soát vé bằng mã QR, nhận diện tức thì trong 1 giây, ma trận 48 slot thời gian thực ngăn ngừa 100% trùng lịch.',
  },
  {
    icon: ShieldCheck,
    title: 'Hoàn Tiền Minh Bạch 100%',
    desc: 'Chính sách hủy vé & hoàn cọc tự động qua STK ngân hàng. Cam kết bảo đảm quyền lợi hội viên trong mọi điều kiện thời tiết.',
  },
  {
    icon: Gamepad2,
    title: 'Đấu Trường Esports 100 Máy',
    desc: 'Khu vực thi đấu thể thao điện tử chuẩn giải đấu, máy tính cấu hình Core i7, GPU RTX 4070, màn hình 240Hz phục vụ cộng đồng game thủ.',
  },
  {
    icon: Coffee,
    title: 'Tiện Ích All-In-One',
    desc: 'Tích hợp căng tin đồ uống POS hiện đại, cho thuê trang phục & dụng cụ thể thao cao cấp, phòng thay đồ và tắm nước nóng sạch sẽ.',
  },
  {
    icon: Users,
    title: 'Cộng Đồng Thể Thao Năng Động',
    desc: 'Nơi kết nối hàng ngàn người yêu thể thao, giao lưu cáp kèo, tổ chức các giải đấu phong trào và câu lạc bộ rèn luyện sức khỏe.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0d1627] to-[#07131e] p-6 sm:p-12 text-center space-y-4 shadow-2xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>Về Phanta Sports Ecosystem</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Tổ Hợp Thể Thao & Đấu Trường Công Nghệ Số{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Neo-Athletic
          </span>
        </h1>

        <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Phanta Sports tiên phong kết hợp giữa thể thao truyền thống và giải trí thể thao điện tử công nghệ cao. 
          Sứ mệnh của chúng tôi là kiến tạo môi trường rèn luyện thể chất thông minh, minh bạch và tiện nghi hàng đầu cho cộng đồng.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/booking"
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center space-x-1.5"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Trải Nghiệm Đặt Sân Ngay</span>
          </Link>

          <Link
            href="/my-tickets"
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            <span>Tra Cứu Vé & Hoàn Tiền</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {STATS.map((s, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-1"
          >
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">{s.value}</div>
            <div className="text-[11px] text-slate-400 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 3. HIGHLIGHTS & ADVANTAGES */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Giá Trị Khác Biệt Tại Phanta Sports</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Hạ tầng thi đấu được thiết kế bài bản theo chuẩn hiệp hội thể thao chuyên nghiệp
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HIGHLIGHTS.map((h, idx) => {
            const Icon = h.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition flex flex-col space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{h.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed flex-1">{h.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. FACILITY LOCATIONS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Mạng Lưới Tổ Hợp Phanta Sports
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Phục vụ hàng chục ngàn lượt tập luyện mỗi tháng tại các trục đường chính TP.HCM
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
              Cơ sở Quận 7
            </span>
            <h4 className="text-sm font-bold text-white">Phanta Sports Complex Q7</h4>
            <p className="text-xs text-slate-400">Số 480 Huỳnh Tấn Phát, Phường Tân Phú, Quận 7</p>
            <p className="text-xs font-mono text-cyan-400 font-bold pt-1">Hotline: 0988 240 106</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase">
              Cơ sở Thủ Đức
            </span>
            <h4 className="text-sm font-bold text-white">Phanta Sports Arena Thủ Đức</h4>
            <p className="text-xs text-slate-400">Khu Công Nghệ Cao, Xa lộ Hà Nội, TP. Thủ Đức</p>
            <p className="text-xs font-mono text-cyan-400 font-bold pt-1">Hotline: 0988 280 906</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
              Cơ sở Tân Bình
            </span>
            <h4 className="text-sm font-bold text-white">Phanta Athletic Park Tân Bình</h4>
            <p className="text-xs text-slate-400">Số 152 Cộng Hòa, Phường 12, Quận Tân Bình</p>
            <p className="text-xs font-mono text-cyan-400 font-bold pt-1">Hotline: 0988 190 705</p>
          </div>
        </div>
      </div>
    </div>
  );
}
