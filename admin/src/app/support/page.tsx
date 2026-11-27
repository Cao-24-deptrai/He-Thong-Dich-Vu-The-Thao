// admin/src/app/support/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Send
} from 'lucide-react';

const FAQS = [
  {
    q: 'Thời gian và quy trình xử lý hoàn tiền khi tôi hủy đặt sân như thế nào?',
    a: 'Khi bạn bấm Hủy vé tại mục Vé của tôi và cung cấp số tài khoản ngân hàng, hệ thống sẽ xác định tỷ lệ hoàn tiền theo thời điểm hủy (trước 24 giờ hoàn 100%, từ 2 đến 24 giờ hoàn 50%). Đội ngũ quản lý sẽ kiểm tra và chuyển khoản hoàn tiền trực tiếp vào tài khoản của bạn trong vòng tối đa 24 giờ làm việc.',
    category: 'HOÀN TIỀN',
  },
  {
    q: 'Tôi đã chuyển khoản qua VietQR nhưng hệ thống chưa ghi nhận vé thành công?',
    a: 'Đôi lúc giao dịch liên ngân hàng Napas có thể mất từ 1 đến 3 phút để đồng bộ. Hệ thống Phanta Sports có cơ chế tự động ghi nhận khi nhận được tín hiệu từ ngân hàng. Trong trường hợp slot bạn chọn đã có người khác thanh toán trước, hệ thống sẽ chuyển đơn sang trạng thái Chờ Hoàn Tiền để gửi lại 100% số tiền cho bạn.',
    category: 'THANH TOÁN',
  },
  {
    q: 'Làm thế nào để quét mã QR khi tôi đến sân thi đấu?',
    a: 'Bạn mở mục Vé của tôi trên điện thoại, chọn vé tương ứng và bấm Xem mã QR vào cổng. Sau đó, hướng màn hình vào mắt đọc tại cửa xoay tự động hoặc xuất trình cho nhân viên trực sân để được hỗ trợ qua cổng nhanh chóng.',
    category: 'VÉ VÀO CỔNG',
  },
  {
    q: 'Tôi có thể đổi giờ hoặc chuyển sang sân khác sau khi đã thanh toán không?',
    a: 'Để bảo đảm tính minh bạch và tránh giữ chỗ trùng lặp cho các khách hàng khác, hệ thống không áp dụng đổi lịch trực tiếp trên vé đã xuất. Bạn có thể chủ động hủy vé cũ theo chính sách hoàn tiền tương ứng, sau đó tiến hành chọn khung giờ mới trên hệ thống.',
    category: 'LỊCH THI ĐẤU',
  },
  {
    q: 'Chính sách xử lý trong trường hợp mưa bão hoặc sự cố bất khả kháng tại sân ngoài trời?',
    a: 'Nếu xảy ra thời tiết xấu không thể thi đấu theo xác nhận từ ban quản lý sân, Phanta Sports sẽ hoàn trả 100% chi phí đặt sân hoặc hỗ trợ dời lịch thi đấu sang ngày khác hoàn toàn miễn phí cho bạn.',
    category: 'THỜI TIẾT',
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
    <div className="space-y-12 pb-20 max-w-5xl mx-auto font-sans">
      {/* 1. HEADER */}
      <div className="text-center space-y-3 border-b border-[#E3E8E6] dark:border-white/10 pb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#E3E8E6] dark:border-white/10 text-xs text-[#3B4540] dark:text-[#D1D5DB] bg-[#F8F9FA] dark:bg-[#191C14]">
          <span className="font-heading font-semibold uppercase tracking-wider text-[11px]">Trung Tâm Hỗ Trợ Khách Hàng</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-[#171C1A] dark:text-white uppercase">
          Chúng Tôi Luôn Đồng Hành Cùng Bạn
        </h1>
        <p className="text-sm text-[#3B4540] dark:text-[#D1D5DB] max-w-xl mx-auto">
          Giải đáp thắc mắc về đặt sân, xác nhận giao dịch VietQR, quy trình hoàn tiền và phản ánh chất lượng dịch vụ tại các tổ hợp thi đấu.
        </p>
      </div>

      {/* 2. CHANNELS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center mx-auto">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base uppercase text-[#171C1A] dark:text-white">Hotline Khách Hàng</h3>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-1">Hỗ trợ đối soát thanh toán và xử lý đơn</p>
          </div>
          <div className="pt-2 border-t border-[#E3E8E6] dark:border-white/10">
            <a
              href="tel:0988240106"
              className="text-lg font-heading font-bold text-[#00B562] dark:text-[#9CFF93]"
            >
              0988 240 106
            </a>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-0.5">Hoạt động từ 06:00 - 23:00 hàng ngày</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base uppercase text-[#171C1A] dark:text-white">Email Tiếp Nhận</h3>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-1">Gửi hóa đơn, hợp đồng hoặc phản ánh dịch vụ</p>
          </div>
          <div className="pt-2 border-t border-[#E3E8E6] dark:border-white/10">
            <a
              href="mailto:hotro@phanta.vn"
              className="text-sm font-heading font-bold text-[#171C1A] dark:text-white hover:text-[#00B562]"
            >
              hotro@phanta.vn
            </a>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-0.5">Phản hồi trong 2 giờ làm việc</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base uppercase text-[#171C1A] dark:text-white">Cơ Sở Phục Vụ</h3>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-1">Quầy lễ tân đón tiếp trực tiếp tại sân</p>
          </div>
          <div className="pt-2 border-t border-[#E3E8E6] dark:border-white/10">
            <p className="text-xs font-heading font-bold text-[#171C1A] dark:text-white">Quận 7 & TP. Thủ Đức</p>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-0.5">TP. Hồ Chí Minh</p>
          </div>
        </div>
      </div>

      {/* 3. FAQS ACCORDION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E3E8E6] dark:border-white/10 pb-3">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171C1A] dark:text-white uppercase tracking-tight">
            Câu Hỏi Thường Gặp
          </h2>
          <span className="text-xs font-heading font-bold uppercase text-[#00B562] dark:text-[#9CFF93]">
            {FAQS.length} câu hỏi phổ biến
          </span>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#00B562]/30 text-[#00B562] dark:text-[#9CFF93]">
                      {faq.category}
                    </span>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-[#171C1A] dark:text-white mt-1">
                      {faq.q}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#3B4540] dark:text-[#D1D5DB] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed border-t border-[#E3E8E6] dark:border-white/10">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. FORM TIẾP NHẬN YÊU CẦU */}
      <div className="p-6 sm:p-8 rounded-3xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171C1A] dark:text-white uppercase tracking-tight">
            Gửi Yêu Cầu Hỗ Trợ
          </h2>
          <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1">
            Nếu bạn gặp sự cố thanh toán muộn hoặc cần trợ giúp đặc biệt, hãy điền thông tin bên dưới để bộ phận hỗ trợ liên hệ lại.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl border border-[#00B562]/30 bg-[#00B562]/10 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#00B562] dark:text-[#9CFF93] mx-auto" />
            <h3 className="font-heading font-bold text-base text-[#171C1A] dark:text-white uppercase">
              Đã Tiếp Nhận Yêu Cầu Của Bạn
            </h3>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] max-w-md mx-auto">
              Chuyên viên chăm sóc khách hàng của Phanta Sports sẽ kiểm tra và gọi lại cho bạn qua số điện thoại đã cung cấp trong thời gian sớm nhất.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-3 px-4 py-2 rounded-xl bg-white dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/10 text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white"
            >
              Gửi yêu cầu khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white block mb-1.5">
                  Họ và tên của bạn:
                </label>
                <input
                  type="text"
                  required
                  placeholder="vd: Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
                />
              </div>

              <div>
                <label className="text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white block mb-1.5">
                  Số điện thoại liên hệ:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="vd: 0988 240 106"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white block mb-1.5">
                  Mã đơn đặt sân (nếu có):
                </label>
                <input
                  type="text"
                  placeholder="vd: BK123456"
                  value={formData.bookingCode}
                  onChange={(e) => setFormData({ ...formData, bookingCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white block mb-1.5">
                  Vấn đề cần hỗ trợ:
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562]"
                >
                  <option value="Hỗ trợ hoàn tiền">Hỗ trợ đối soát hoàn tiền</option>
                  <option value="Chuyển khoản trễ webhook">Đã chuyển khoản VietQR nhưng chưa nhận vé</option>
                  <option value="Sự cố cửa xoay QR">Sự cố quét mã QR tại cổng xoay</option>
                  <option value="Thời tiết bất khả kháng">Yêu cầu dời lịch do thời tiết xấu</option>
                  <option value="Khác">Nội dung khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-heading font-bold uppercase text-[#171C1A] dark:text-white block mb-1.5">
                Mô tả chi tiết:
              </label>
              <textarea
                rows={4}
                required
                placeholder="Vui lòng cung cấp chi tiết sự cố bạn đang gặp phải..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-bold text-xs uppercase tracking-wider transition flex items-center space-x-2 disabled:opacity-50"
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
