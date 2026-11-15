// admin/src/app/walk-in/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarPlus, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  RefreshCw,
  Building2,
  Layers,
  Banknote,
  QrCode,
  Printer,
  Sparkles,
  Zap,
  ChevronRight,
  ShieldCheck,
  Receipt,
  X,
  Maximize2
} from 'lucide-react';
import { api, Facility, Venue, SlotAvailability, Booking } from '@/lib/api';
import { GanttTimelineChart } from '@/components/GanttTimelineChart';
import QRCode from 'qrcode';

// Web Audio API chimes
const playSound = (type: 'success' | 'conflict') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Ignore audio error if browser blocks autoplay
  }
};

export default function WalkInBookingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Date selection (defaults to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Slot selection
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);

  // Customer form
  const [customerName, setCustomerName] = useState('Khách Lẻ Tại Quầy');
  const [customerPhone, setCustomerPhone] = useState('0900000000');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PAYOS_VIETQR' | 'CARD'>('CASH');
  const [note, setNote] = useState('Khách đặt trực tiếp tại quầy lễ tân');

  // Cashier quick tender
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Modals
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [kioskQrUrl, setKioskQrUrl] = useState<string>('');
  const [receiptQrUrl, setReceiptQrUrl] = useState<string>('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load facilities on mount
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const facs = await api.getFacilities();
        setFacilities(facs);
        if (facs.length > 0) {
          setSelectedFacilityId(facs[0]._id);
        }
      } catch (err: any) {
        console.error(err);
      }
    };
    loadFacilities();
  }, []);

  // Load venues when facility changes
  useEffect(() => {
    if (!selectedFacilityId) {
      setVenues([]);
      setSelectedVenue(null);
      return;
    }
    const loadVenues = async () => {
      try {
        const vList = await api.getVenues(selectedFacilityId);
        setVenues(vList);
        if (vList.length > 0) {
          setSelectedVenue(vList[0]);
        } else {
          setSelectedVenue(null);
        }
        setSelectedSlot(null);
      } catch (err: any) {
        console.error(err);
      }
    };
    loadVenues();
  }, [selectedFacilityId]);

  // Update default cash tendered when slot changes
  useEffect(() => {
    if (selectedSlot) {
      setCashTendered(selectedSlot.price);
      generateKioskQr(selectedSlot.price);
    }
  }, [selectedSlot, selectedVenue]);

  // Generate VietQR for Kiosk Display
  const generateKioskQr = async (amount: number) => {
    try {
      const bankCode = 'MB';
      const accountNo = '0999999999';
      const memo = `SPORT${Date.now().toString().slice(-6)}`;
      const vietQrData = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=SPORTS%20ARENA`;
      
      // Also generate local QR data URL as reliable fallback
      const dataUrl = await QRCode.toDataURL(
        `00020101021238540010A00000072701240006970422011009999999990208QRIBFTTA5303704540${amount}5802VN62${memo.length.toString().padStart(2, '0')}${memo}6304`,
        { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }
      );
      setKioskQrUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Receipt QR when booking succeeds
  const generateReceiptQr = async (booking: Booking) => {
    try {
      const dataUrl = await QRCode.toDataURL(
        JSON.stringify({
          id: booking._id,
          venue: selectedVenue?.name,
          slot: `${booking.startTime}-${booking.endTime}`,
          date: booking.bookingDate,
        }),
        { width: 180, margin: 1 }
      );
      setReceiptQrUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle slot selection from Gantt chart
  const handleSelectSlotFromGantt = (venue: Venue, slot: SlotAvailability) => {
    setSelectedVenue(venue);
    setSelectedSlot(slot);
    setConflictError(null);
    setGeneralError(null);
  };

  // Cash change calculation
  const priceToPay = selectedSlot ? selectedSlot.price : 0;
  const cashChange = cashTendered >= priceToPay ? cashTendered - priceToPay : 0;

  // Handle Walk-in Booking Submission
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || !selectedSlot) {
      alert('Vui lòng chọn khung giờ trên bảng Timeline trước.');
      return;
    }

    setSubmitting(true);
    setConflictError(null);
    setGeneralError(null);

    try {
      const res = await api.createWalkInBooking({
        venueId: selectedVenue._id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        customerName: customerName.trim() || 'Khách Lẻ',
        customerPhone: customerPhone.trim() || '0900000000',
        paymentMethod,
        note,
      });

      playSound('success');
      setSuccessBooking(res);
      await generateReceiptQr(res);
      setShowReceiptModal(true);

      // Reset selection
      setSelectedSlot(null);
    } catch (err: any) {
      console.error('Walk-in booking error:', err);
      playSound('conflict');

      const errorData = err.data || {};
      if (
        err.status === 409 ||
        errorData.error === 'SLOT_ALREADY_TAKEN_ONLINE' ||
        (typeof errorData.message === 'string' && errorData.message.includes('online'))
      ) {
        setConflictError(
          '⚠️ CẢNH BÁO XUNG ĐỘT: Khung giờ này vừa được khách hàng đặt online qua ứng dụng! Hệ thống đã tự động khóa slot để bảo vệ khách hàng. Vui lòng chọn khung giờ khác trên Timeline.'
        );
      } else {
        setGeneralError(err.message || 'Đặt sân tại quầy thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFacility = facilities.find((f) => f._id === selectedFacilityId);

  return (
    <div className="space-y-8 pb-20">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Trung Tâm Điều Hành POS & Lịch Sân Trực Quan
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Luxury Edition
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng ma trận Timeline Gantt Chart kéo-thả đa sân kết hợp Quầy POS thu ngân bán vé 1-chạm
              </p>
            </div>
          </div>
        </div>

        {/* Global Facility & Date Selector Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-2"
            >
              {facilities.map((fac) => (
                <option key={fac._id} value={fac._id}>
                  {fac.name} ({fac.sportTypes?.[0] || fac.sportType || 'Thể thao'})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => {
              setSelectedDate(todayStr);
            }}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition ${
              selectedDate === todayStr
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Conflict Error Notification */}
      {conflictError && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-900 shadow-lg shadow-rose-500/10 flex items-start gap-3.5 animate-bounce">
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-base text-rose-900">
              XUNG ĐỘT THỜI GIAN THỰC (SLOT_ALREADY_TAKEN_ONLINE)
            </h3>
            <p className="text-sm font-medium mt-1 leading-relaxed text-rose-800">
              {conflictError}
            </p>
          </div>
          <button
            onClick={() => setConflictError(null)}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* General Error Notification */}
      {generalError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{generalError}</span>
          </div>
          <button onClick={() => setGeneralError(null)}>
            <X className="w-4 h-4 text-amber-700" />
          </button>
        </div>
      )}

      {/* SECTION 1: VISUAL GANTT TIMELINE SCHEDULE MATRIX */}
      <div className="space-y-3">
        <GanttTimelineChart
          venues={venues}
          selectedDate={selectedDate}
          selectedVenueId={selectedVenue?._id || ''}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlotFromGantt}
        />
      </div>

      {/* SECTION 2: LUXURY CASHIER POS CONSOLE (BOTTOM GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Selected Booking Detail Card & Payment Summary */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Thông Tin Khung Giờ Đặt Chỗ
                </h2>
                <p className="text-xs text-slate-400">
                  Khung giờ được chọn trực tiếp từ bảng Timeline Gantt phía trên
                </p>
              </div>
            </div>

            {selectedSlot ? (
              <span className="px-3 py-1 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ ĐÃ CHỌN SLOT
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500">
                CHƯA CHỌN KHUNG GIỜ
              </span>
            )}
          </div>

          {selectedSlot && selectedVenue ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-extrabold">
                    {selectedFacility?.name || 'Cơ sở Thể Thao'}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedVenue.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Loại sân: <strong className="text-white">{selectedVenue.venueType || 'Tiêu chuẩn'}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Tổng tiền thanh toán</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {selectedSlot.price.toLocaleString('vi-VN')} đ
                  </div>
                  <span className="text-[10px] text-slate-400">Đã bao gồm VAT & ánh sáng</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="font-mono">{selectedDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Vui lòng nhấp vào một ô giờ màu xanh trống trên bảng Timeline
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hệ thống sẽ tự động gán sân con, tính giá cước và đưa vào hóa đơn quầy POS ngay lập tức.
              </p>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Phương Thức Thanh Toán Tại Quầy
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'CASH'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-extrabold">Tiền Mặt (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('PAYOS_VIETQR');
                  setShowKioskModal(true);
                }}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'PAYOS_VIETQR'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <QrCode className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-extrabold">VietQR PayOS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'CARD'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-extrabold">Quẹt Thẻ POS</span>
              </button>
            </div>
          </div>

          {/* Cash Tender Calculator (if CASH selected) */}
          {paymentMethod === 'CASH' && selectedSlot && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Tiền khách đưa (Tendered):</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {cashTendered.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCashTendered(priceToPay)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 transition"
                >
                  Đúng tiền ({priceToPay.toLocaleString('vi-VN')} đ)
                </button>
                <button
                  type="button"
                  onClick={() => setCashTendered(200000)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 transition"
                >
                  200.000 đ
                </button>
                <button
                  type="button"
                  onClick={() => setCashTendered(500000)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 transition"
                >
                  500.000 đ
                </button>
                <button
                  type="button"
                  onClick={() => setCashTendered(1000000)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 transition"
                >
                  1.000.000 đ
                </button>
              </div>

              {/* Change calculation */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tiền thối lại khách:</span>
                <span className={`text-base font-black font-mono ${cashChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {cashChange.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}

          {/* PayOS Kiosk Trigger Banner (if PayOS selected) */}
          {paymentMethod === 'PAYOS_VIETQR' && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-blue-900">
                    Sẵn sàng mã VietQR PayOS Kiosk
                  </h4>
                  <p className="text-[11px] text-blue-700">
                    Bật màn hình phụ để khách hàng quét nhanh từ điện thoại
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Mở Màn Hình Kiosk
              </button>
            </div>
          )}
        </div>

        {/* Right: Customer Info & Final Submit Action */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Thông Tin Khách Hàng
                </h2>
                <p className="text-xs text-slate-400">Ghi nhận thông tin người đặt</p>
              </div>
            </div>

            {/* Quick 1-click Preset Button */}
            <button
              type="button"
              onClick={() => {
                setCustomerName('Khách Lẻ Tại Quầy');
                setCustomerPhone('0900000000');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
            >
              ⚡ Khách Lẻ Nhanh
            </button>
          </div>

          <form onSubmit={handleWalkInSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Họ Tên Khách Hàng
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Số Điện Thoại Liên Hệ
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Ghi Chú Đơn Hàng (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm (thuê thêm áo bib, bóng, nước suối...)"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Total Due Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  CẦN THANH TOÁN
                </span>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {priceToPay.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold">Hình thức</span>
                <div className="text-xs font-bold text-white">
                  {paymentMethod === 'CASH' ? '💵 Tiền Mặt' : paymentMethod === 'PAYOS_VIETQR' ? '📱 VietQR' : '💳 Thẻ POS'}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className={`w-full py-4 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-lg ${
                submitting || !selectedSlot
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-blue-500/25 active:scale-[0.99]'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang xác nhận đặt chỗ...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>XÁC NHẬN & TẠO ĐƠN POS NGAY</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL 1: CUSTOMER FACING KIOSK DISPLAY (VIETQR PAYOS) */}
      {showKioskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-8 text-white relative shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowKioskModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                MÀN HÌNH KHÁCH HÀNG (KIOSK PAYOS)
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight">Quét Mã VietQR Để Thanh Toán</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét
                </p>
              </div>

              {/* QR Image Frame with Glowing Hologram Border */}
              <div className="relative mx-auto w-64 h-64 bg-white p-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] border-2 border-cyan-400/50 flex items-center justify-center">
                {kioskQrUrl ? (
                  <img src={kioskQrUrl} alt="VietQR PayOS" className="w-full h-full object-contain" />
                ) : (
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Price & Bank Details */}
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Số tiền cần thanh toán:</span>
                  <span className="font-mono font-black text-emerald-400 text-lg">
                    {priceToPay.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-white">MBBank (Quân Đội)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <span className="font-mono font-bold text-cyan-400">0999999999</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-bold text-white">SPORTS BOOKING ARENA</span>
                </div>
              </div>

              <button
                onClick={() => setShowKioskModal(false)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
              >
                Đã Khách Hàng Quét Xong (Đóng Màn Hình)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THERMAL RECEIPT 80MM (IN PHIẾU ĐẶT SÂN) */}
      {showReceiptModal && successBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Printable Area (80mm format) */}
            <div id="printable-receipt" className="text-slate-900 font-mono text-xs space-y-3 p-2 border-b border-dashed border-slate-300">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black uppercase tracking-wider">
                  SPORTS & ESPORTS ARENA
                </h2>
                <p className="text-[10px] text-slate-500">{selectedFacility?.name}</p>
                <p className="text-[9px] text-slate-400">{selectedFacility?.address}</p>
                <div className="py-1 border-b border-dashed border-slate-400 text-[10px] font-bold">
                  PHIẾU XÁC NHẬN VÀO SÂN (RECEIPT)
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Mã đơn:</span>
                  <span className="font-bold">#{(successBooking._id || successBooking.bookingCode || '').slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Khách hàng:</span>
                  <span className="font-bold">{successBooking.customerName || customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sân thi đấu:</span>
                  <span className="font-bold">{selectedVenue?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Khung giờ:</span>
                  <span className="font-bold">{successBooking.startTime} - {successBooking.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày chơi:</span>
                  <span className="font-bold">{successBooking.bookingDate?.split('T')[0] || selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hình thức:</span>
                  <span className="font-bold">{successBooking.paymentMethod || paymentMethod}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-400 flex justify-between items-center text-sm font-black">
                <span>TỔNG TIỀN:</span>
                <span>{(successBooking.totalPrice || priceToPay).toLocaleString('vi-VN')} đ</span>
              </div>

              {/* Thermal QR Code */}
              <div className="pt-2 text-center">
                {receiptQrUrl && (
                  <img src={receiptQrUrl} alt="QR Code" className="w-32 h-32 mx-auto" />
                )}
                <p className="text-[9px] text-slate-500 mt-1">
                  Đưa mã này qua cổng soát vé hoặc máy quét lễ tân
                </p>
              </div>

              <div className="text-center text-[8px] text-slate-400 pt-1">
                Cảm ơn quý khách và chúc quý khách thi đấu vui vẻ!
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                In Phiếu 80mm
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
