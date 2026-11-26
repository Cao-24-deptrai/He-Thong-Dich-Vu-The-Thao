// admin/src/app/my-tickets/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ticket,
  Calendar,
  Clock,
  QrCode,
  RotateCcw,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Building2,
  ChevronRight,
  MapPin,
  ArrowRight,
  Info
} from 'lucide-react';
import { api, Booking } from '@/lib/api';
import QRCode from 'qrcode';

// Hàm tính toán chính sách hoàn tiền theo số giờ còn lại
function calculateRefundPreview(booking: Booking) {
  const [startH, startM] = (booking.startTime || '00:00').split(':').map(Number);
  const dateStr = String(booking.bookingDate || '').split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const slotStartTime = new Date(year, month - 1, day, startH || 0, startM || 0, 0, 0);
  const now = new Date();
  const diffHours = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  const price = booking.totalPrice || 0;

  if (diffHours >= 24) {
    return {
      diffHours: Math.max(0, Math.floor(diffHours)),
      refundRate: 1.0,
      refundPercent: 100,
      refundAmount: price,
      policyLabel: 'Hoàn tiền 100%',
      badgeColor: 'bg-[#00B562]/10 text-[#00B562] dark:bg-[#9CFF93]/10 dark:text-[#9CFF93] border-[#00B562]/30 dark:border-[#9CFF93]/30',
      description: 'Hủy trước giờ thi đấu hơn 24 giờ. Bạn được hoàn trả toàn bộ số tiền đã thanh toán.',
    };
  } else if (diffHours >= 2) {
    const halfAmount = Math.round(price * 0.5);
    return {
      diffHours: Math.max(0, Math.floor(diffHours)),
      refundRate: 0.5,
      refundPercent: 50,
      refundAmount: halfAmount,
      policyLabel: 'Hoàn tiền 50%',
      badgeColor: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 border-amber-500/30',
      description: 'Hủy trong khoảng từ 2h đến 24h trước giờ thi đấu. Bạn được hoàn trả 50% số tiền để bù đắp chi phí giữ chỗ.',
    };
  } else {
    return {
      diffHours: Math.max(0, Math.floor(diffHours)),
      refundRate: 0.0,
      refundPercent: 0,
      refundAmount: 0,
      policyLabel: 'Không hoàn tiền (0%)',
      badgeColor: 'bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400 border-rose-500/30',
      description: 'Hủy trong vòng dưới 2h trước giờ thi đấu. Theo quy chế sân bãi không áp dụng hoàn tiền cho khung giờ sát giờ.',
    };
  }
}

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'REFUND_PENDING' | 'REFUNDED' | 'CANCELLED'>('ALL');

  // QR Modal State
  const [qrModalBooking, setQrModalBooking] = useState<Booking | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(60);

  // Refund Modal State
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Bận việc đột xuất');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundAlert, setRefundAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getMyBookings();
      setBookings(data || []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách vé:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Bộ đếm chu kỳ QR code an toàn
  useEffect(() => {
    if (!qrModalBooking) return;
    setQrTimeLeft(60);
    const interval = setInterval(() => {
      setQrTimeLeft((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrModalBooking]);

  // Mở modal xem mã QR check-in
  const handleOpenQrModal = async (booking: Booking) => {
    setQrModalBooking(booking);
    try {
      const qrData = JSON.stringify({
        bookingId: booking._id,
        bookingCode: booking.bookingCode || booking._id.slice(-6).toUpperCase(),
        date: booking.bookingDate,
        time: `${booking.startTime}-${booking.endTime}`,
        venue: (booking.venueId as any)?.name || 'Sân thể thao',
        token: booking.qrToken || booking._id,
      });
      const url = await QRCode.toDataURL(qrData, {
        width: 320,
        margin: 2,
        color: { dark: '#171C1A', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(url);
    } catch (e) {
      console.error('QR generation error:', e);
    }
  };

  // Mở modal yêu cầu hoàn tiền
  const handleOpenRefundModal = (booking: Booking) => {
    setRefundBooking(booking);
    setCancelReason('Bận việc đột xuất');
    setBankName('');
    setBankAccount('');
    setAccountName('');
    setRefundAlert(null);
  };

  // Gửi yêu cầu hủy vé & hoàn tiền
  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundBooking) return;

    setSubmittingRefund(true);
    setRefundAlert(null);

    try {
      const refundCalc = calculateRefundPreview(refundBooking);

      let fullRefundNote = cancelReason.trim();
      if (refundCalc.refundAmount > 0) {
        if (!bankName.trim() || !bankAccount.trim() || !accountName.trim()) {
          setRefundAlert({
            type: 'error',
            message: 'Vui lòng điền đủ Tên ngân hàng, Số tài khoản và Tên chủ thẻ để hệ thống hoàn trả tiền!',
          });
          setSubmittingRefund(false);
          return;
        }
        fullRefundNote += ` - STK: ${bankAccount.trim()} - Ngân hàng: ${bankName.trim()} - Chủ TK: ${accountName.trim().toUpperCase()}`;
      }

      await api.cancelBooking(refundBooking._id, fullRefundNote);

      setRefundAlert({
        type: 'success',
        message:
          refundCalc.refundAmount > 0
            ? `Yêu cầu hoàn trả đã gửi thành công. Dự kiến hoàn ${refundCalc.refundAmount.toLocaleString('vi-VN')} đ trong 24 giờ làm việc.`
            : 'Đã hủy giữ chỗ thành công theo yêu cầu của bạn.',
      });

      setTimeout(() => {
        setRefundBooking(null);
        fetchBookings();
      }, 1600);
    } catch (err: any) {
      console.error('Refund request error:', err);
      setRefundAlert({
        type: 'error',
        message: err.message || 'Không thể gửi yêu cầu hủy vé. Vui lòng liên hệ hotline ban quản lý.',
      });
    } finally {
      setSubmittingRefund(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'ACTIVE') return b.status === 'CONFIRMED' || b.status === 'HELD';
    if (activeFilter === 'REFUND_PENDING') return b.status === 'REFUND_PENDING';
    if (activeFilter === 'REFUNDED') return b.status === 'REFUNDED';
    if (activeFilter === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'EXPIRED' || b.status === 'COMPLETED';
    return true;
  });

  const countActive = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'HELD').length;
  const countPendingRefund = bookings.filter((b) => b.status === 'REFUND_PENDING').length;
  const countRefunded = bookings.filter((b) => b.status === 'REFUNDED').length;

  return (
    <div className="space-y-8 pb-20 font-sans">
      {/* 1. TIÊU ĐỀ TRANG VÀ NÚT HÀNH ĐỘNG */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E3E8E6] dark:border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#E3E8E6] dark:border-white/10 text-xs text-[#3B4540] dark:text-[#D1D5DB] bg-[#F8F9FA] dark:bg-[#191C14] mb-2">
            <Ticket className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
            <span className="font-heading font-semibold uppercase tracking-wider text-[11px]">Vé Thể Thao & Mã Vào Sân</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-[#171C1A] dark:text-white uppercase">
            Vé Của Tôi
          </h1>
          <p className="text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1 max-w-xl">
            Quản lý toàn bộ vé thi đấu, xuất trình mã QR tại cửa xoay tự động và gửi yêu cầu hủy vé hoàn tiền minh bạch.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchBookings}
            className="p-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#171C1A] dark:text-[#F3F4F6] text-xs font-heading font-bold uppercase transition flex items-center space-x-2"
            title="Làm mới danh sách vé"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00B562] dark:text-[#9CFF93]' : ''}`} />
            <span className="hidden sm:inline">Cập nhật</span>
          </button>

          <Link
            href="/booking"
            className="px-5 py-2.5 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-black text-xs uppercase tracking-wider transition"
          >
            + Đặt Sân Mới
          </Link>
        </div>
      </div>

      {/* 2. CHÍNH SÁCH HOÀN TIỀN MINH BẠCH WIDGET */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] space-y-4">
        <div className="flex items-center justify-between border-b border-[#E3E8E6] dark:border-white/10 pb-3">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-[#00B562] dark:text-[#9CFF93]" />
            <h3 className="font-heading font-bold text-sm sm:text-base uppercase tracking-tight text-[#171C1A] dark:text-white">
              Chính Sách Hoàn Tiền Khi Hủy Vé Tự Động
            </h3>
          </div>
          <span className="text-[11px] font-heading font-bold uppercase px-2.5 py-0.5 rounded-full border border-[#00B562]/30 text-[#00B562] dark:text-[#9CFF93]">
            Chuẩn Phanta Sports
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-[#00B562] dark:text-[#9CFF93]">Trước hơn 24 giờ</span>
              <span className="font-heading font-black text-xs px-2 py-0.5 rounded bg-[#00B562]/10 text-[#00B562] dark:text-[#9CFF93]">
                100%
              </span>
            </div>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
              Hoàn trả 100% tiền qua chuyển khoản vào số tài khoản của bạn.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-amber-600 dark:text-amber-400">Từ 2 đến 24 giờ</span>
              <span className="font-heading font-black text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                50%
              </span>
            </div>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
              Hoàn trả 50% tổng đơn đặt để hỗ trợ chi phí chuẩn bị mặt sân.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-rose-600 dark:text-rose-400">Dưới 2 giờ thi đấu</span>
              <span className="font-heading font-black text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400">
                0%
              </span>
            </div>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
              Không áp dụng hoàn tiền do khung giờ đã sát thời điểm khai trận.
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-[#E3E8E6] dark:border-white/10">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition whitespace-nowrap ${
            activeFilter === 'ALL'
              ? 'bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C]'
              : 'border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB]'
          }`}
        >
          Tất Cả Vé ({bookings.length})
        </button>

        <button
          onClick={() => setActiveFilter('ACTIVE')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeFilter === 'ACTIVE'
              ? 'bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C]'
              : 'border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB]'
          }`}
        >
          <span>Sắp Tới & Hoạt Động</span>
          {countActive > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {countActive}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('REFUND_PENDING')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeFilter === 'REFUND_PENDING'
              ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-[#0C0F0C]'
              : 'border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB]'
          }`}
        >
          <span>Chờ Hoàn Tiền</span>
          {countPendingRefund > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {countPendingRefund}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('REFUNDED')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition whitespace-nowrap flex items-center space-x-1.5 ${
            activeFilter === 'REFUNDED'
              ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-[#0C0F0C]'
              : 'border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB]'
          }`}
        >
          <span>Đã Hoàn Tiền</span>
          {countRefunded > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {countRefunded}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('CANCELLED')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition whitespace-nowrap ${
            activeFilter === 'CANCELLED'
              ? 'bg-slate-700 text-white'
              : 'border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB]'
          }`}
        >
          Đã Hủy & Quá Hạn
        </button>
      </div>

      {/* 4. TICKETS LIST - THIẾT KẾ ATHLETIC PASS CHUẨN UNSLOP */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#00B562] dark:border-[#9CFF93] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB]">Đang đồng bộ dữ liệu vé của bạn...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#191C14] text-center space-y-4">
          <Ticket className="w-12 h-12 text-[#9CA3AF] mx-auto" />
          <div className="space-y-1">
            <h4 className="font-heading font-bold text-lg text-[#171C1A] dark:text-white uppercase">
              Không tìm thấy vé trong danh mục này
            </h4>
            <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] max-w-md mx-auto">
              Bạn chưa có đơn đặt chỗ nào trong trạng thái đã chọn. Chọn sân mới ngay để chuẩn bị cho trận đấu tiếp theo.
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-black text-xs uppercase tracking-wider transition"
          >
            <span>Khám Phá Sân Trống</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const isHeld = b.status === 'HELD';
            const isRefundPending = b.status === 'REFUND_PENDING';
            const isRefunded = b.status === 'REFUNDED';
            const isCancelled = b.status === 'CANCELLED';
            const venue = b.venueId as any;

            return (
              <div
                key={b._id}
                className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {/* Phần trên của thẻ vé */}
                <div className="p-5 space-y-4">
                  {/* Mã vé và nhãn trạng thái */}
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-black text-sm tracking-wider text-[#00B562] dark:text-[#9CFF93]">
                      #{b.bookingCode || b._id.slice(-6).toUpperCase()}
                    </span>

                    {isConfirmed && (
                      <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#00B562]/30 bg-[#00B562]/10 text-[#00B562] dark:text-[#9CFF93] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ XÁC NHẬN
                      </span>
                    )}

                    {isHeld && (
                      <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        ĐANG GIỮ CHỖ
                      </span>
                    )}

                    {isRefundPending && (
                      <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        CHỜ HOÀN TIỀN
                      </span>
                    )}

                    {isRefunded && (
                      <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ HOÀN TIỀN
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-[#3B4540] dark:text-[#9CA3AF] uppercase tracking-wider">
                        ĐÃ HỦY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-base text-[#171C1A] dark:text-white leading-tight">
                      {venue?.name || 'Sân thể thao'}
                    </h3>
                    <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
                      <span>{venue?.venueType || 'Tổ hợp Thể Thao Phanta'}</span>
                    </p>
                  </div>

                  {/* Thông số trận đấu */}
                  <div className="p-3.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#3B4540] dark:text-[#D1D5DB] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Ngày:
                      </span>
                      <span className="font-heading font-bold text-[#171C1A] dark:text-white">{b.bookingDate}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#3B4540] dark:text-[#D1D5DB] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Khung giờ:
                      </span>
                      <span className="font-heading font-black text-[#00B562] dark:text-[#9CFF93]">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E3E8E6] dark:border-white/10">
                      <span className="text-[#3B4540] dark:text-[#D1D5DB]">Tổng thanh toán:</span>
                      <span className="font-heading font-black text-sm text-[#171C1A] dark:text-white">
                        {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết tiến trình hoàn tiền nếu có */}
                  {isRefundPending && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-400/5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="font-heading font-bold flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đang xử lý chuyển khoản hoàn tiền</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Số tiền hoàn:{' '}
                        <strong>{(b.refundAmount || b.totalPrice || 0).toLocaleString('vi-VN')} đ</strong>
                      </p>
                      {b.refundNote && (
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 truncate">
                          Ghi chú: {b.refundNote}
                        </p>
                      )}
                    </div>
                  )}

                  {isRefunded && (
                    <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-400/5 text-xs text-teal-800 dark:text-teal-300 space-y-1">
                      <div className="font-heading font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã hoàn tất chuyển tiền</span>
                      </div>
                      <p className="text-[11px]">
                        Số tiền đã hoàn: <strong>{(b.refundAmount || b.totalPrice || 0).toLocaleString('vi-VN')} đ</strong>
                      </p>
                      {b.refundedAt && (
                        <p className="text-[10px] text-[#3B4540] dark:text-[#9CA3AF]">
                          Thời gian: {new Date(b.refundedAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Đường cắt vé nét đứt chuẩn vé thể thao */}
                <div className="relative border-t border-dashed border-[#E3E8E6] dark:border-white/10 px-5 py-4 bg-[#FAFAFA] dark:bg-[#161914] space-y-2">
                  {isConfirmed && (
                    <>
                      <button
                        onClick={() => handleOpenQrModal(b)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#00B562] dark:bg-[#9CFF93] text-white dark:text-[#0C0F0C] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Mã QR Vào Cửa</span>
                      </button>

                      <button
                        onClick={() => handleOpenRefundModal(b)}
                        className="w-full py-2 px-3 rounded-xl border border-[#E3E8E6] dark:border-white/10 hover:border-rose-500/40 text-[#3B4540] dark:text-[#D1D5DB] hover:text-rose-600 dark:hover:text-rose-400 text-xs font-heading font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hủy Vé & Hoàn Tiền</span>
                      </button>
                    </>
                  )}

                  {isHeld && (
                    <button
                      onClick={() => handleOpenRefundModal(b)}
                      className="w-full py-2.5 px-3 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>Hủy Giữ Chỗ Này</span>
                    </button>
                  )}

                  {isRefundPending && (
                    <Link
                      href="/support"
                      className="w-full py-2.5 px-3 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>Hỗ Trợ Hoàn Tiền Nhanh</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL 1: MÃ QR CHECK-IN VÀO CỔNG TỰ ĐỘNG */}
      {qrModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center space-y-4">
            <button
              onClick={() => setQrModalBooking(null)}
              className="absolute top-4 right-4 p-2 text-[#3B4540] dark:text-[#D1D5DB] hover:text-[#171C1A] dark:hover:text-white rounded-xl hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#00B562]/30 text-[#00B562] dark:text-[#9CFF93] uppercase tracking-wider">
                Phanta Sports - Thẻ Vào Cổng
              </span>
              <h3 className="text-xl font-heading font-black text-[#171C1A] dark:text-white uppercase mt-2">
                Mã QR Qua Cửa
              </h3>
              <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-0.5">
                Quét mã tại cửa xoay tự động hoặc xuất trình cho quản lý sân
              </p>
            </div>

            {/* Khung hiển thị QR code */}
            <div className="p-4 bg-white rounded-2xl mx-auto w-fit border border-[#E3E8E6] shadow-md">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Booking QR" className="w-52 h-52 object-contain" />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#00B562]" />
                </div>
              )}
            </div>

            {/* Thanh đếm chu kỳ bảo mật nhẹ nhàng (không chấm chớp tắt) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#3B4540] dark:text-[#D1D5DB]">
                <span>Mã số xác thực đổi mới sau:</span>
                <span className="font-heading font-bold text-[#00B562] dark:text-[#9CFF93]">{qrTimeLeft}s</span>
              </div>
              <div className="w-full h-1 bg-[#E3E8E6] dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00B562] dark:bg-[#9CFF93] transition-all duration-1000"
                  style={{ width: `${(qrTimeLeft / 60) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#3B4540] dark:text-[#D1D5DB]">Sân thi đấu:</span>
                <span className="font-heading font-bold text-[#171C1A] dark:text-white">
                  {(qrModalBooking.venueId as any)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3B4540] dark:text-[#D1D5DB]">Khung giờ:</span>
                <span className="font-heading font-bold text-[#00B562] dark:text-[#9CFF93]">
                  {qrModalBooking.startTime} - {qrModalBooking.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3B4540] dark:text-[#D1D5DB]">Ngày thi đấu:</span>
                <span className="font-medium text-[#171C1A] dark:text-white">{qrModalBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3B4540] dark:text-[#D1D5DB]">Mã đơn:</span>
                <span className="font-heading font-black text-[#171C1A] dark:text-white">
                  #{qrModalBooking.bookingCode || qrModalBooking._id.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#3B4540] dark:text-[#9CA3AF]">
              Khuyến nghị có mặt trước giờ thi đấu 10 phút để nhận bóng và dụng cụ khởi động.
            </p>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: YÊU CẦU HỦY VÉ & HOÀN TIỀN */}
      {refundBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5">
            <button
              onClick={() => setRefundBooking(null)}
              className="absolute top-4 right-4 p-2 text-[#3B4540] dark:text-[#D1D5DB] hover:text-[#171C1A] dark:hover:text-white rounded-xl hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-heading font-black text-lg sm:text-xl uppercase tracking-tight text-[#171C1A] dark:text-white">
                  Yêu Cầu Hủy Vé & Hoàn Tiền
                </h3>
              </div>
              <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] mt-1">
                Đơn #{refundBooking.bookingCode || refundBooking._id.slice(-6).toUpperCase()} - {(refundBooking.venueId as any)?.name}
              </p>
            </div>

            {/* Kết quả chính sách tính toán */}
            {(() => {
              const calc = calculateRefundPreview(refundBooking);
              return (
                <div className="p-4 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3B4540] dark:text-[#D1D5DB]">Khoảng cách đến giờ đá:</span>
                    <span className="font-heading font-bold text-[#171C1A] dark:text-white">
                      Khoảng {calc.diffHours} giờ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3B4540] dark:text-[#D1D5DB]">Chính sách áp dụng:</span>
                    <span className={`font-heading font-bold px-2 py-0.5 rounded-full border ${calc.badgeColor}`}>
                      {calc.policyLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E3E8E6] dark:border-white/10">
                    <span className="font-heading font-bold text-xs text-[#171C1A] dark:text-white">
                      Tiền dự kiến hoàn trả:
                    </span>
                    <span className="font-heading font-black text-base text-[#00B562] dark:text-[#9CFF93]">
                      {calc.refundAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <p className="text-[11px] text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed pt-1">
                    {calc.description}
                  </p>
                </div>
              );
            })()}

            {/* Form nhập thông tin */}
            <form onSubmit={handleSubmitRefund} className="space-y-4">
              <div>
                <label className="text-xs font-heading font-bold uppercase tracking-wider text-[#171C1A] dark:text-white block mb-1.5">
                  Lý do hủy đặt sân:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#121512] text-xs text-[#171C1A] dark:text-white focus:outline-none focus:border-[#00B562]"
                >
                  <option value="Bận việc đột xuất">Bận việc đột xuất</option>
                  <option value="Thời tiết mưa bão ngoài ý muốn">Thời tiết mưa bão ngoài ý muốn</option>
                  <option value="Đổi lịch sang ngày khác">Đổi lịch sang ngày khác</option>
                  <option value="Thiếu người thi đấu">Thiếu người thi đấu</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {/* Nếu có hoàn tiền (> 0đ), hiển thị form nhập STK nhận tiền */}
              {calculateRefundPreview(refundBooking).refundAmount > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-[#F8F9FA] dark:bg-[#121512]">
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#00B562] dark:text-[#9CFF93] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Tài Khoản Ngân Hàng Nhận Hoàn Tiền:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#3B4540] dark:text-[#D1D5DB] block mb-1">Tên Ngân hàng:</label>
                      <input
                        type="text"
                        placeholder="vd: Vietcombank, MB Bank..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#3B4540] dark:text-[#D1D5DB] block mb-1">Số tài khoản:</label>
                      <input
                        type="text"
                        placeholder="Số tài khoản ngân hàng"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#3B4540] dark:text-[#D1D5DB] block mb-1">Chủ tài khoản (in hoa):</label>
                    <input
                      type="text"
                      placeholder="vd: NGUYEN VAN A"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-xs text-[#171C1A] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#00B562] uppercase"
                    />
                  </div>
                </div>
              )}

              {refundAlert && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                    refundAlert.type === 'success'
                      ? 'border-[#00B562]/30 bg-[#00B562]/10 text-[#00B562] dark:text-[#9CFF93]'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {refundAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{refundAlert.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundBooking(null)}
                  disabled={submittingRefund}
                  className="px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] text-[#3B4540] dark:text-[#D1D5DB] text-xs font-heading font-bold uppercase transition"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-bold uppercase tracking-wider transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${submittingRefund ? 'animate-spin' : ''}`} />
                  <span>{submittingRefund ? 'Đang xử lý...' : 'Xác Nhận Hủy Vé'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
