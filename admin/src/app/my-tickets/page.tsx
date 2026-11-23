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
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Building2,
  Info,
  PhoneCall,
  ChevronRight,
  MapPin,
  ExternalLink,
  DollarSign
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
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Hủy trong khoảng từ 2h đến 24h trước giờ thi đấu. Bạn được hoàn trả 50% số tiền đã thanh toán.',
    };
  } else {
    return {
      diffHours: Math.max(0, Math.floor(diffHours)),
      refundRate: 0.0,
      refundPercent: 0,
      refundAmount: 0,
      policyLabel: 'Không hoàn tiền (0%)',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: 'Hủy trong vòng dưới 2h trước giờ thi đấu. Theo chính sách sân bãi, không áp dụng hoàn tiền.',
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
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Mở modal xem mã QR
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
        color: { dark: '#020617', light: '#ffffff' },
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

      // Tạo chuỗi ghi chú hoàn tiền kèm thông tin STK ngân hàng
      let fullRefundNote = cancelReason.trim();
      if (refundCalc.refundAmount > 0) {
        if (!bankName.trim() || !bankAccount.trim() || !accountName.trim()) {
          setRefundAlert({
            type: 'error',
            message: 'Vui lòng điền đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản để nhận tiền hoàn!',
          });
          setSubmittingRefund(false);
          return;
        }
        fullRefundNote += ` | STK nhận hoàn: ${bankAccount.trim()} - Ngân hàng: ${bankName.trim()} - Chủ TK: ${accountName.trim().toUpperCase()}`;
      }

      await api.cancelBooking(refundBooking._id, fullRefundNote);

      setRefundAlert({
        type: 'success',
        message:
          refundCalc.refundAmount > 0
            ? `Yêu cầu hoàn tiền đã gửi thành công! Số tiền dự kiến hoàn: ${refundCalc.refundAmount.toLocaleString('vi-VN')} đ. Đơn đã chuyển sang trạng thái "Chờ Hoàn Tiền".`
            : 'Đã hủy vé thành công theo yêu cầu của bạn.',
      });

      // Reload danh sách sau 1.5s và đóng modal
      setTimeout(() => {
        setRefundBooking(null);
        fetchBookings();
      }, 1800);
    } catch (err: any) {
      console.error('Refund request error:', err);
      setRefundAlert({
        type: 'error',
        message: err.message || 'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại hoặc liên hệ hotline hỗ trợ.',
      });
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Lọc danh sách vé theo tab
  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'ACTIVE') {
      return b.status === 'CONFIRMED' || b.status === 'HELD';
    }
    if (activeFilter === 'REFUND_PENDING') {
      return b.status === 'REFUND_PENDING';
    }
    if (activeFilter === 'REFUNDED') {
      return b.status === 'REFUNDED';
    }
    if (activeFilter === 'CANCELLED') {
      return b.status === 'CANCELLED' || b.status === 'EXPIRED' || b.status === 'COMPLETED';
    }
    return true;
  });

  const countActive = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'HELD').length;
  const countPendingRefund = bookings.filter((b) => b.status === 'REFUND_PENDING').length;
  const countRefunded = bookings.filter((b) => b.status === 'REFUNDED').length;

  return (
    <div className="space-y-8 pb-16">
      {/* 1. HEADER & POLICY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Quản Lý Vé & Xuất Trình QR Vào Cổng</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Vé Của Tôi & Module Hoàn Tiền
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tra cứu lịch sử đặt sân, xem mã QR quét qua cổng tự động và gửi yêu cầu hủy vé hoàn tiền nhanh chóng.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchBookings}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-bold"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <Link
            href="/booking"
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center space-x-1.5"
          >
            <span>+ Đặt Sân Mới</span>
          </Link>
        </div>
      </div>

      {/* 2. CHÍNH SÁCH HOÀN TIỀN MINH BẠCH WIDGET */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border border-cyan-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Chính Sách Hoàn Tiền Khi Hủy Vé (Tự Động)</h3>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Quy Định Chuẩn Phanta Sports
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-black shrink-0">
              100%
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400">Trước hơn 24 giờ</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Hoàn lại 100% số tiền đã thanh toán vào tài khoản ngân hàng của bạn.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
              50%
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400">Từ 2 đến 24 giờ</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Hoàn lại 50% số tiền đơn đặt (hỗ trợ chi phí giữ chỗ cho sân bãi).
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/30 flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-black shrink-0">
              0%
            </div>
            <div>
              <div className="text-xs font-bold text-rose-400">Dưới 2 giờ</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Không áp dụng hoàn tiền do khung giờ đã sát thời gian thi đấu.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeFilter === 'ALL'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tất Cả Vé ({bookings.length})
        </button>

        <button
          onClick={() => setActiveFilter('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeFilter === 'ACTIVE'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>Sắp Tới / Hoạt Động</span>
          {countActive > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-400/30 text-emerald-300 text-[10px] flex items-center justify-center font-bold">
              {countActive}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('REFUND_PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeFilter === 'REFUND_PENDING'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>Chờ Hoàn Tiền</span>
          {countPendingRefund > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400/30 text-amber-300 text-[10px] flex items-center justify-center font-bold">
              {countPendingRefund}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('REFUNDED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeFilter === 'REFUNDED'
              ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>Đã Hoàn Tiền</span>
          {countRefunded > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-400/30 text-teal-300 text-[10px] flex items-center justify-center font-bold">
              {countRefunded}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('CANCELLED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeFilter === 'CANCELLED'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Đã Hủy / Lịch Sử
        </button>
      </div>

      {/* 4. TICKETS LIST */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Đang tải danh sách vé và thông tin hoàn tiền...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-200">Không tìm thấy vé nào trong mục này</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bạn chưa có đơn đặt chỗ nào phù hợp với bộ lọc hiện tại. Hãy đặt sân mới để bắt đầu trải nghiệm!
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg"
          >
            <span>Khám Phá Lịch Sân Trống</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg"
              >
                {/* Trạng thái vé badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      #{b.bookingCode || b._id.slice(-6).toUpperCase()}
                    </span>

                    {isConfirmed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ XÁC NHẬN
                      </span>
                    )}

                    {isHeld && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ĐANG GIỮ CHỖ
                      </span>
                    )}

                    {isRefundPending && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        CHỜ HOÀN TIỀN
                      </span>
                    )}

                    {isRefunded && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ HOÀN TIỀN
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        ĐÃ HỦY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                      {venue?.name || 'Sân thể thao'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{venue?.venueType || 'Tổ hợp Phanta Sports'}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Ngày:
                      </span>
                      <span className="font-semibold text-slate-200">{b.bookingDate}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Khung giờ:
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">Tổng thanh toán:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* THÔNG TIN CHI TIẾT HOÀN TIỀN NẾU CÓ */}
                  {isRefundPending && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý chuyển khoản hoàn tiền</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Số tiền hoàn: <strong className="text-white font-mono">{(b.refundAmount || b.totalPrice || 0).toLocaleString('vi-VN')} đ</strong>
                      </p>
                      {b.refundNote && (
                        <p className="text-[10px] text-amber-300/70 truncate">
                          Ghi chú: {b.refundNote}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Tiền sẽ được hoàn về STK ngân hàng của bạn trong vòng 24 giờ làm việc.
                      </p>
                    </div>
                  )}

                  {isRefunded && (
                    <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-teal-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã hoàn tất chuyển tiền</span>
                      </div>
                      <p className="text-[11px] text-teal-200/80">
                        Số tiền đã hoàn:{' '}
                        <strong className="text-white font-mono">
                          {(b.refundAmount || b.totalPrice || 0).toLocaleString('vi-VN')} đ
                        </strong>
                      </p>
                      {b.refundedAt && (
                        <p className="text-[10px] text-slate-400">
                          Thời gian: {new Date(b.refundedAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* HÀNH ĐỘNG VÉ */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {isConfirmed && (
                    <>
                      <button
                        onClick={() => handleOpenQrModal(b)}
                        className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Xem Mã QR Vào Cổng</span>
                      </button>

                      <button
                        onClick={() => handleOpenRefundModal(b)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hủy Vé & Hoàn Tiền</span>
                      </button>
                    </>
                  )}

                  {isHeld && (
                    <button
                      onClick={() => handleOpenRefundModal(b)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>Hủy Giữ Chỗ Slot Này</span>
                    </button>
                  )}

                  {isRefundPending && (
                    <Link
                      href="/support"
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Cần Hỗ Trợ Hoàn Tiền Gấp?</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL 1: XEM MÃ QR CHECK-IN VÀO CỔNG */}
      {qrModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center space-y-4">
            <button
              onClick={() => setQrModalBooking(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                Phanta Sports • Pass QR
              </span>
              <h3 className="text-xl font-black text-white mt-2">Mã Vé Vào Cổng</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quét tại cửa xoay IoT hoặc xuất trình cho nhân viên quầy
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl mx-auto w-fit shadow-2xl">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Booking QR" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-800" />
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Sân thi đấu:</span>
                <span className="font-bold text-white">{(qrModalBooking.venueId as any)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Khung giờ:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {qrModalBooking.startTime} - {qrModalBooking.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày đặt:</span>
                <span className="text-slate-200">{qrModalBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã booking:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  #{qrModalBooking.bookingCode || qrModalBooking._id.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Vui lòng có mặt trước giờ thi đấu 10-15 phút để khởi động và nhận dụng cụ.
            </p>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: YÊU CẦU HỦY VÉ & HOÀN TIỀN (MODULE HOÀN TIỀN) */}
      {refundBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5">
            <button
              onClick={() => setRefundBooking(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white">Xác Nhận Hủy Vé & Hoàn Tiền</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Booking #{refundBooking.bookingCode || refundBooking._id.slice(-6).toUpperCase()} •{' '}
                {(refundBooking.venueId as any)?.name}
              </p>
            </div>

            {/* KẾT QUẢ TÍNH TOÁN CHÍNH SÁCH */}
            {(() => {
              const calc = calculateRefundPreview(refundBooking);
              return (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Thời gian còn lại:</span>
                    <span className="text-xs font-bold text-white">Khoảng {calc.diffHours} giờ trước giờ đá</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Chính sách áp dụng:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${calc.badgeColor}`}>
                      {calc.policyLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-300">Số tiền hoàn dự kiến:</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {calc.refundAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    {calc.description}
                  </p>
                </div>
              );
            })()}

            {/* FORM ĐIỀN THÔNG TIN HOÀN TIỀN */}
            <form onSubmit={handleSubmitRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Lý do hủy vé:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Bận việc đột xuất">Bận việc đột xuất</option>
                  <option value="Thời tiết mưa / Sự cố ngoài ý muốn">Thời tiết mưa / Sự cố ngoài ý muốn</option>
                  <option value="Đổi kế hoạch sang ngày khác">Đổi kế hoạch sang ngày khác</option>
                  <option value="Thiếu người thi đấu">Thiếu người thi đấu</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {/* Nếu có hoàn tiền (> 0đ), hiển thị form nhập STK nhận tiền */}
              {calculateRefundPreview(refundBooking).refundAmount > 0 && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Tài Khoản Ngân Hàng Nhận Tiền Hoàn:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Tên Ngân hàng:</label>
                      <input
                        type="text"
                        placeholder="vd: Vietcombank, MB Bank..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Số tài khoản:</label>
                      <input
                        type="text"
                        placeholder="Số tài khoản ngân hàng"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tên chủ tài khoản (in hoa):</label>
                    <input
                      type="text"
                      placeholder="vd: NGUYEN VAN A"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Thông báo Alert */}
              {refundAlert && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                    refundAlert.type === 'success'
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${submittingRefund ? 'animate-spin' : ''}`} />
                  <span>{submittingRefund ? 'Đang xử lý...' : 'Xác Nhận Hủy Vé & Hoàn Tiền'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
