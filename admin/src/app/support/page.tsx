// admin/src/app/support/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Headphones,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  ChevronDown,
  RotateCcw,
  CreditCard,
  QrCode,
  ShieldAlert,
  Send,
  CheckCircle2,
  Calendar,
  MessageSquare
} from 'lucide-react';

const FAQS = [
  {
    q: 'Quy trình và thời gian nhận tiền hoàn khi hủy vé như thế nào?',
    a: 'Khi bạn nhấn "Hủy vé & Hoàn tiền" tại trang Vé của tôi và cung cấp thông tin STK ngân hàng, hệ thống sẽ đối soát tự động theo mốc thời gian (Trước 24h hoàn 100%, từ 2h-24h hoàn 50%). Ban quản trị sẽ chuyển khoản hoàn tiền trực tiếp về STK của bạn trong vòng tối đa 24 giờ làm việc.',
    category: 'HOÀN TIỀN',
  },
  {
    q: 'Tôi đã quét mã VietQR và bị trừ tiền ngân hàng nhưng hệ thống chưa báo CONFIRMED?',
    a: 'Đôi khi đường truyền liên ngân hàng bị trễ vài giây đến vài phút. Hệ thống Phanta Sports có cơ chế Late Webhook Recovery tự động: khi ngân hàng xác nhận, vé sẽ tự động chuyển sang CONFIRMED. Nếu slot của bạn bị người khác giữ trước khi tiền về, hệ thống sẽ tự động chuyển đơn sang REFUND_PENDING để hoàn 100% tiền lại cho bạn.',
    category: 'THANH TOÁN',
  },
  {
    q: 'Làm thế nào để quét mã QR check-in khi đến sân thi đấu?',
    a: 'Tại trang "Vé của tôi", bạn nhấn nút "Xem mã QR vào cổng" trên vé tương ứng. Bạn chỉ cần đưa màn hình điện thoại vào mắt quét của cổng xoay IoT tự động hoặc đưa cho nhân viên tại quầy lễ tân để được xác thực vào sân trong 1 giây.',
    category: 'VÉ & CỔNG',
  },
  {
    q: 'Tôi có thể đổi khung giờ hoặc đổi sân sau khi đã thanh toán không?',
    a: 'Để đảm bảo tính công bằng cho các khách hàng khác, hệ thống không hỗ trợ đổi giờ trực tiếp trên slot đã thanh toán. Bạn vui lòng thực hiện "Hủy vé & Hoàn tiền" trên vé cũ theo chính sách hoàn tiền, sau đó tiến hành đặt khung giờ mới tại trang Đặt sân.',
    category: 'LỊCH THI ĐẤU',
  },
  {
    q: 'Nếu gặp trời mưa hoặc sự cố bất khả kháng tại sân ngoài trời thì sao?',
    a: 'Nếu có mưa to hoặc bão bất khả kháng được xác nhận bởi ban quản lý sân, hệ thống sẽ hoàn 100% chi phí đặt sân hoặc hỗ trợ dời lịch thi đấu miễn phí cho toàn bộ khách hàng trong khung giờ bị ảnh hưởng.',
    category: 'SỰ CỐ THỜI TIẾT',
  },
];

export default function CustomerSupportPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    bookingCode: '',
    subject: 'Hỗ trợ hoàn tiền',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setFormData({
        fullName: '',
        phone: '',
        bookingCode: '',
        subject: 'Hỗ trợ hoàn tiền',
        message: '',
      });
    }, 1000);
  };

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* 1. HEADER */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <Headphones className="w-3.5 h-3.5" />
          <span>Trung Tâm Chăm Sóc Khách Hàng 24/7</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Chúng Tôi Luôn Sẵn Sàng Hỗ Trợ Bạn
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Mọi thắc mắc về đặt sân, đối soát thanh toán VietQR, quy trình hoàn tiền hoặc khiếu nại chất lượng dịch vụ sẽ được giải quyết nhanh chóng.
        </p>
      </div>

      {/* 2. CHANNELS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 transition text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Hotline Khẩn Cấp 24/7</h3>
            <p className="text-xs text-slate-400 mt-0.5">Hỗ trợ đối soát thanh toán & hoàn tiền</p>
          </div>
          <div className="pt-2">
            <a
              href="tel:19006868"
              className="text-base font-black font-mono text-cyan-400 hover:text-cyan-300"
            >
              1900 6868 (Ext: 102)
            </a>
            <p className="text-[11px] text-slate-500 mt-0.5">Zalo CSKH: 0988 240 106</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Email CSKH & Khiếu Nại</h3>
            <p className="text-xs text-slate-400 mt-0.5">Phản hồi văn bản trong vòng 2 giờ</p>
          </div>
          <div className="pt-2">
            <a
              href="mailto:support@phanta.id.vn"
              className="text-sm font-bold text-emerald-400 hover:text-emerald-300 font-mono"
            >
              support@phanta.id.vn
            </a>
            <p className="text-[11px] text-slate-500 mt-0.5">Tiepnhan@phanta.id.vn</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Bộ Phận Hoàn Tiền</h3>
            <p className="text-xs text-slate-400 mt-0.5">Giải quyết yêu cầu hủy vé & đối soát</p>
          </div>
          <div className="pt-2">
            <Link
              href="/my-tickets"
              className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              <span>Vào Trang Vé & Hoàn Tiền</span>
              <span>→</span>
            </Link>
            <p className="text-[11px] text-slate-500 mt-0.5">Tự động 24/7</p>
          </div>
        </div>
      </div>

      {/* 3. FAQ ACCORDION */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            Câu Hỏi Thường Gặp (FAQ)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Các giải đáp nhanh về thanh toán, hủy đặt sân, chính sách hoàn tiền và soát vé
          </p>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left space-x-4 hover:bg-slate-850 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {faq.category}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SUPPORT FORM */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Gửi Yêu Cầu Hỗ Trợ Trực Tuyến
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Điền thông tin và mã booking của bạn. Nhân viên hỗ trợ sẽ liên hệ xử lý ngay lập tức.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Yêu Cầu Của Bạn Đã Được Gửi Thành Công!</h4>
            <p className="text-xs text-slate-300">
              Đội ngũ CSKH Phanta Sports đã tiếp nhận thông tin và sẽ liên hệ hỗ trợ bạn qua số điện thoại sớm nhất.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-cyan-300 hover:bg-slate-700"
            >
              Gửi yêu cầu khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Họ và tên của bạn:</label>
                <input
                  type="text"
                  required
                  placeholder="vd: Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Số điện thoại liên hệ:</label>
                <input
                  type="tel"
                  required
                  placeholder="vd: 0988xxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mã Booking (nếu có):</label>
                <input
                  type="text"
                  placeholder="vd: #240106 hoặc mã 6 số"
                  value={formData.bookingCode}
                  onChange={(e) => setFormData({ ...formData, bookingCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề hỗ trợ:</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Hỗ trợ hoàn tiền">Hỗ trợ đối soát hoàn tiền</option>
                  <option value="Sự cố thanh toán VietQR">Sự cố thanh toán VietQR</option>
                  <option value="Check-in mã QR">Lỗi quét mã QR tại cổng</option>
                  <option value="Khiếu nại cơ sở vật chất">Khiếu nại cơ sở vật chất</option>
                  <option value="Khác">Vấn đề khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nội dung chi tiết:</label>
              <textarea
                required
                rows={4}
                placeholder="Mô tả chi tiết tình huống bạn gặp phải để chúng tôi hỗ trợ nhanh nhất..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Đang gửi...' : 'Gửi Yêu Cầu Hỗ Trợ'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
