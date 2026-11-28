// admin/src/app/walk-in/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarPlus,
  Calendar,
  Clock,
  User,
  Phone,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Building2,
  Banknote,
  QrCode,
  Printer,
  Zap,
  Receipt,
  X,
  Maximize2,
  Repeat,
  Check,
  CalendarRange,
} from 'lucide-react';
import { api, Facility, Venue, SlotAvailability, Booking, findLinkedVenues, CheckRecurringResult } from '@/lib/api';
import { GanttTimelineChart } from '@/components/GanttTimelineChart';
import QRCode from 'qrcode';

const playSound = (type: 'success' | 'conflict') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
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
  } catch (e) {}
};

export default function WalkInBookingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);

  const [customerName, setCustomerName] = useState('Khách lẻ tại quầy');
  const [customerPhone, setCustomerPhone] = useState('0900000000');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PAYOS_VIETQR' | 'CARD'>('CASH');
  const [note, setNote] = useState('Khách đặt trực tiếp tại quầy lễ tân');
  const [cashTendered, setCashTendered] = useState<number>(0);

  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [kioskQrUrl, setKioskQrUrl] = useState<string>('');
  const [receiptQrUrl, setReceiptQrUrl] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);
  const [recurringDays, setRecurringDays] = useState<number[]>([new Date().getDay()]);
  const [recurringStartTime, setRecurringStartTime] = useState<string>('18:00');
  const [recurringEndTime, setRecurringEndTime] = useState<string>('19:30');
  const [checkingRecurring, setCheckingRecurring] = useState(false);
  const [recurringDryRun, setRecurringDryRun] = useState<CheckRecurringResult | null>(null);
  const [submittingRecurring, setSubmittingRecurring] = useState(false);
  const [recurringSuccess, setRecurringSuccess] = useState<any | null>(null);

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

  useEffect(() => {
    if (selectedSlot) {
      setCashTendered(selectedSlot.price);
      generateKioskQr(selectedSlot.price);
    }
  }, [selectedSlot, selectedVenue]);

  const generateKioskQr = async (amount: number) => {
    try {
      const memo = `SPORT${Date.now().toString().slice(-6)}`;
      const dataUrl = await QRCode.toDataURL(
        `00020101021238540010A00000072701240006970422011009999999990208QRIBFTTA5303704540${amount}5802VN62${memo.length.toString().padStart(2, '0')}${memo}6304`,
        { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }
      );
      setKioskQrUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleSelectSlotFromGantt = (venue: Venue, slot: SlotAvailability) => {
    setSelectedVenue(venue);
    setSelectedSlot(slot);
    setConflictError(null);
    setGeneralError(null);
  };

  const priceToPay = selectedSlot ? selectedSlot.price : 0;
  const cashChange = cashTendered >= priceToPay ? cashTendered - priceToPay : 0;

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || !selectedSlot) {
      alert('Vui lòng chọn khung giờ trên bảng lịch sân trước.');
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
        customerName: customerName.trim() || 'Khách lẻ',
        customerPhone: customerPhone.trim() || '0900000000',
        paymentMethod,
        note,
      });

      playSound('success');
      setSuccessBooking(res);
      await generateReceiptQr(res);
      setShowReceiptModal(true);
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
          'Khung giờ này vừa được khách hàng đặt trực tuyến. Hệ thống đã khóa khung giờ để tránh trùng lịch. Vui lòng chọn khung giờ khác.'
        );
      } else {
        setGeneralError(err.message || 'Đặt sân tại quầy thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (recurringDays.includes(day)) {
      if (recurringDays.length > 1) {
        setRecurringDays(recurringDays.filter((d) => d !== day));
      }
    } else {
      setRecurringDays([...recurringDays, day].sort());
    }
    setRecurringDryRun(null);
  };

  const handleDryRunCheck = async () => {
    if (!selectedVenue) {
      alert('Vui lòng chọn một sân trước');
      return;
    }
    setCheckingRecurring(true);
    try {
      const res = await api.checkRecurringBooking({
        venueId: selectedVenue._id,
        startDate: selectedDate,
        weekCount: recurringWeeks,
        daysOfWeek: recurringDays,
        startTime: recurringStartTime,
        endTime: recurringEndTime,
      });
      setRecurringDryRun(res);
      playSound(res.hasConflict ? 'conflict' : 'success');
    } catch (err: any) {
      console.error('Check recurring error:', err);
      alert(err.message || 'Lỗi kiểm tra tính khả dụng của chuỗi định kỳ');
    } finally {
      setCheckingRecurring(false);
    }
  };

  const handleConfirmRecurringWalkIn = async () => {
    if (!selectedVenue) return;
    setSubmittingRecurring(true);
    try {
      const res = await api.createWalkInRecurringBooking({
        venueId: selectedVenue._id,
        startDate: selectedDate,
        weekCount: recurringWeeks,
        daysOfWeek: recurringDays,
        startTime: recurringStartTime,
        endTime: recurringEndTime,
        customerName: customerName.trim() || 'Khách định kỳ',
        customerPhone: customerPhone.trim() || '0900000000',
        paymentMethod,
        note: `Đặt định kỳ ${recurringWeeks} tuần tại quầy lễ tân`,
      });
      playSound('success');
      setRecurringSuccess(res);
      setRecurringDryRun(null);
    } catch (err: any) {
      console.error('Recurring walk-in error:', err);
      playSound('conflict');
      alert(err.message || 'Không thể tạo đơn đặt sân định kỳ. Vui lòng kiểm tra lại ngày trùng.');
    } finally {
      setSubmittingRecurring(false);
    }
  };

  const selectedFacility = facilities.find((f) => f._id === selectedFacilityId);
  const linkedVenues = selectedVenue ? findLinkedVenues(selectedVenue, venues) : [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <CalendarPlus className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Đặt sân tại quầy & Lịch sân trực quan</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Theo dõi lịch trống theo khung giờ và tạo đơn đặt sân trực tiếp cho khách tại quầy
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-[var(--bg-card)] px-3 py-2 rounded-xl border border-[var(--border-color)] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="text-xs font-medium text-[var(--text-heading)] bg-transparent focus:outline-none cursor-pointer pr-2"
            >
              {facilities.map((fac) => (
                <option key={fac._id} value={fac._id} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                  {fac.name} ({fac.sportTypes?.[0] || fac.sportType || 'Thể thao'})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[var(--bg-card)] px-3 py-2 rounded-xl border border-[var(--border-color)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-medium text-[var(--text-heading)] bg-transparent focus:outline-none cursor-pointer tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              selectedDate === todayStr
                ? 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                : 'phanta-btn-secondary'
            }`}
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={() => {
              setShowRecurringModal(true);
              setRecurringDryRun(null);
              setRecurringSuccess(null);
            }}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <Repeat className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Đặt lịch định kỳ (2-12 tuần)</span>
          </button>
        </div>
      </div>

      {/* Conflict Error Notification */}
      {conflictError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-500 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-sm">Xung đột khung giờ đặt sân</h3>
            <p className="text-xs mt-1 leading-relaxed">{conflictError}</p>
          </div>
          <button type="button" onClick={() => setConflictError(null)} className="p-1 text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* General Error Notification */}
      {generalError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--burnt-orange)] text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{generalError}</span>
          </div>
          <button type="button" onClick={() => setGeneralError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: GANTT TIMELINE */}
      <GanttTimelineChart
        venues={venues}
        selectedDate={selectedDate}
        selectedVenueId={selectedVenue?._id || ''}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlotFromGantt}
      />

      {/* SECTION 2: POS CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 phanta-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)]">
                <Receipt className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-base text-[var(--text-heading)]">
                  Thông tin khung giờ đặt chỗ
                </h2>
                <p className="text-xs text-[var(--text-sub)]">
                  Khung giờ được chọn từ bảng lịch sân phía trên
                </p>
              </div>
            </div>

            {selectedSlot ? (
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-500/10 text-[var(--pitch-green)] border border-emerald-500/30">
                Đã chọn khung giờ
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--bg-card-inner)] text-[var(--text-sub)] border border-[var(--border-subtle)]">
                Chưa chọn khung giờ
              </span>
            )}
          </div>

          {selectedSlot && selectedVenue ? (
            <div className="phanta-subcard p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-medium text-[var(--pitch-green)]">
                    {selectedFacility?.name || 'Cơ sở thể thao'}
                  </span>
                  <h3 className="font-heading font-semibold text-xl text-[var(--text-heading)] mt-0.5">
                    {selectedVenue.name}
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Loại sân: <strong className="text-[var(--text-heading)]">{selectedVenue.venueType || 'Tiêu chuẩn'}</strong>
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-xs text-[var(--text-sub)]">Tổng tiền thanh toán</span>
                  <div className="text-2xl font-heading font-semibold text-[var(--pitch-green)]">
                    {selectedSlot.price.toLocaleString('vi-VN')} đ
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">Đã bao gồm VAT và ánh sáng</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs tabular-nums">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span className="font-semibold text-[var(--text-heading)] text-sm">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-sub)]">
                  <Calendar className="w-4 h-4" strokeWidth={1.75} />
                  <span>{selectedDate}</span>
                </div>
              </div>

              {linkedVenues.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--burnt-orange)] text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <span className="font-semibold">Lưu ý sân ghép liên kết: </span>
                    Sân <strong>{selectedVenue.name}</strong> dùng chung mặt sân với{' '}
                    <strong>{linkedVenues.map((v) => v.name).join(', ')}</strong>. Khi đặt khung giờ {selectedSlot.startTime} - {selectedSlot.endTime}, các sân trên sẽ tự động khóa trùng.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-[var(--border-color)] text-center space-y-2 bg-[var(--bg-card-inner)]/50">
              <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--text-heading)]">
                Chọn một ô giờ trống trên bảng lịch sân
              </p>
              <p className="text-xs text-[var(--text-sub)] max-w-sm mx-auto">
                Hệ thống sẽ tự động tính giá theo khung giờ và đưa vào phiếu thanh toán tại quầy
              </p>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-medium text-[var(--text-sub)]">
              Phương thức thanh toán tại quầy
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'CASH', label: 'Tiền mặt', icon: Banknote },
                { id: 'PAYOS_VIETQR', label: 'VietQR', icon: QrCode },
                { id: 'CARD', label: 'Quẹt thẻ POS', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      if (m.id === 'PAYOS_VIETQR') setShowKioskModal(true);
                    }}
                    className={`p-3.5 rounded-xl border text-center transition-colors flex flex-col items-center gap-1.5 ${
                      active
                        ? 'border-[var(--pitch-green)] bg-[var(--bg-card-inner)] text-[var(--pitch-green)] font-semibold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-sub)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tender Calculator */}
          {paymentMethod === 'CASH' && selectedSlot && (
            <div className="phanta-subcard p-4 space-y-3">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-medium text-[var(--text-sub)]">Tiền khách đưa</span>
                <span className="font-heading font-semibold text-[var(--text-heading)] text-sm">
                  {cashTendered.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap tabular-nums">
                <button
                  type="button"
                  onClick={() => setCashTendered(priceToPay)}
                  className="phanta-btn-secondary px-3 py-1.5 text-xs"
                >
                  Đúng tiền ({priceToPay.toLocaleString('vi-VN')} đ)
                </button>
                {[200000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt)}
                    className="phanta-btn-secondary px-3 py-1.5 text-xs"
                  >
                    {amt.toLocaleString('vi-VN')} đ
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between tabular-nums">
                <span className="text-xs font-medium text-[var(--text-sub)]">Tiền thối lại khách</span>
                <span className={`text-base font-heading font-semibold ${cashChange >= 0 ? 'text-[var(--pitch-green)]' : 'text-rose-500'}`}>
                  {cashChange.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'PAYOS_VIETQR' && (
            <div className="phanta-subcard p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <QrCode className="w-7 h-7 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-heading)]">Mã VietQR thanh toán</h4>
                  <p className="text-[11px] text-[var(--text-sub)]">Bật màn hình phụ để khách hàng quét mã từ điện thoại</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="phanta-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Mở mã QR</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Customer Info */}
        <div className="lg:col-span-5 phanta-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)]">
                <User className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-base text-[var(--text-heading)]">Thông tin khách hàng</h2>
                <p className="text-xs text-[var(--text-sub)]">Ghi nhận thông tin người đặt</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomerName('Khách lẻ tại quầy');
                setCustomerPhone('0900000000');
              }}
              className="phanta-btn-secondary px-2.5 py-1.5 text-[11px]"
            >
              Điền khách lẻ
            </button>
          </div>

          <form onSubmit={handleWalkInSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Họ tên khách hàng</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Số điện thoại liên hệ</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-3.5 py-2.5 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                Ghi chú đơn hàng (tùy chọn)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm (thuê áo bib, bóng, nước suối...)"
                className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)] resize-none"
              />
            </div>

            <div className="phanta-subcard p-4 flex items-center justify-between tabular-nums">
              <div>
                <span className="text-[11px] text-[var(--text-sub)] font-medium">Cần thanh toán</span>
                <div className="text-xl font-heading font-semibold text-[var(--pitch-green)]">
                  {priceToPay.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[var(--text-sub)]">Hình thức</span>
                <div className="text-xs font-semibold text-[var(--text-heading)]">
                  {paymentMethod === 'CASH' ? 'Tiền mặt' : paymentMethod === 'PAYOS_VIETQR' ? 'VietQR' : 'Thẻ POS'}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="phanta-btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xác nhận đặt chỗ</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" strokeWidth={1.75} />
                  <span>Xác nhận và tạo đơn</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL 1: KIOSK VIETQR */}
      {showKioskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phanta-card max-w-md w-full p-6 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowKioskModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)]">Quét mã VietQR để thanh toán</h3>
                <p className="text-xs text-[var(--text-sub)] mt-1">
                  Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét
                </p>
              </div>

              <div className="mx-auto w-60 h-60 bg-white p-3 rounded-xl border border-[var(--border-color)] flex items-center justify-center">
                {kioskQrUrl ? (
                  <img src={kioskQrUrl} alt="VietQR" className="w-full h-full object-contain" />
                ) : (
                  <RefreshCw className="w-8 h-8 text-[var(--text-sub)] animate-spin" />
                )}
              </div>

              <div className="phanta-subcard p-4 text-left space-y-2 text-xs tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Số tiền cần thanh toán</span>
                  <span className="font-heading font-semibold text-[var(--pitch-green)] text-base">
                    {priceToPay.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Ngân hàng thụ hưởng</span>
                  <span className="font-semibold text-[var(--text-heading)]">MBBank (Quân Đội)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Số tài khoản</span>
                  <span className="font-semibold text-[var(--text-heading)]">0999999999</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-sub)]">Chủ tài khoản</span>
                  <span className="font-semibold text-[var(--text-heading)]">PHANTA SPORTS ARENA</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowKioskModal(false)}
                className="phanta-btn-primary w-full py-2.5 text-xs"
              >
                Đã khách hàng quét xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ĐẶT SÂN ĐỊNH KỲ */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phanta-card max-w-xl w-full p-6 relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setShowRecurringModal(false);
                setRecurringDryRun(null);
                setRecurringSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-color)] text-[var(--pitch-green)]">
                <Repeat className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-lg text-[var(--text-heading)]">
                  Đặt sân định kỳ tại quầy
                </h2>
                <p className="text-xs text-[var(--text-sub)]">
                  Chuỗi đặt sân lặp lại hàng tuần từ 2 đến 12 tuần dành cho khách quen hoặc cơ quan
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-sub)]">Chọn sân thi đấu</label>
              <select
                value={selectedVenue?._id || ''}
                onChange={(e) => {
                  const v = venues.find((item) => item._id === e.target.value);
                  if (v) setSelectedVenue(v);
                  setRecurringDryRun(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.venueType || 'Tiêu chuẩn'}) - {((v as any).defaultPrice ?? (v as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Ngày bắt đầu chuỗi</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setRecurringDryRun(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Số tuần đặt (2 - 12 tuần)</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={recurringWeeks}
                  onChange={(e) => {
                    setRecurringWeeks(Math.max(2, Math.min(12, parseInt(e.target.value, 10) || 2)));
                    setRecurringDryRun(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={recurringStartTime}
                  onChange={(e) => {
                    setRecurringStartTime(e.target.value);
                    setRecurringDryRun(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Giờ kết thúc</label>
                <input
                  type="time"
                  value={recurringEndTime}
                  onChange={(e) => {
                    setRecurringEndTime(e.target.value);
                    setRecurringDryRun(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-sub)]">Các thứ lặp lại trong tuần</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'CN', day: 0 },
                  { label: 'T2', day: 1 },
                  { label: 'T3', day: 2 },
                  { label: 'T4', day: 3 },
                  { label: 'T5', day: 4 },
                  { label: 'T6', day: 5 },
                  { label: 'T7', day: 6 },
                ].map((item) => {
                  const isChecked = recurringDays.includes(item.day);
                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => toggleDayOfWeek(item.day)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        isChecked
                          ? 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                          : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Tên khách / Đội</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-sub)]">Số điện thoại</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] tabular-nums"
                />
              </div>
            </div>

            {recurringDryRun && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  recurringDryRun.hasConflict
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-[var(--pitch-green)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    {recurringDryRun.hasConflict ? (
                      <>
                        <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
                        <span>Phát hiện {recurringDryRun.conflictCount} buổi bị trùng lịch</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" strokeWidth={1.75} />
                        <span>Toàn bộ {recurringDryRun.totalSessions} buổi đều khả dụng</span>
                      </>
                    )}
                  </span>
                  <span className="tabular-nums font-semibold">
                    Tổng: {recurringDryRun.totalPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 tabular-nums text-[11px]">
                  {recurringDryRun.checkedDates.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between items-center px-2.5 py-1 rounded-lg ${
                        item.isAvailable
                          ? 'bg-[var(--bg-card)] text-[var(--text-main)]'
                          : 'bg-rose-500/15 text-rose-500 font-semibold'
                      }`}
                    >
                      <span>Buổi {idx + 1}: {item.date}</span>
                      <span>{item.isAvailable ? 'Trống' : item.conflictReason || 'Đã có người đặt'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurringSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] text-xs space-y-1.5">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" strokeWidth={1.75} />
                  <span>Đã khởi tạo thành công chuỗi đặt định kỳ</span>
                </div>
                <p>
                  Mã nhóm: <strong className="tabular-nums">{recurringSuccess.recurringGroupId}</strong>
                </p>
                <p className="tabular-nums">
                  Tổng số buổi: <strong>{recurringSuccess.totalSessions} buổi</strong> - Tổng tiền:{' '}
                  <strong>{recurringSuccess.totalPrice.toLocaleString('vi-VN')} đ</strong>
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDryRunCheck}
                disabled={checkingRecurring || submittingRecurring}
                className="phanta-btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <CalendarRange className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>{checkingRecurring ? 'Đang kiểm tra' : 'Kiểm tra lịch trống'}</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmRecurringWalkIn}
                disabled={
                  checkingRecurring ||
                  submittingRecurring ||
                  Boolean(recurringDryRun && recurringDryRun.hasConflict)
                }
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={1.75} />
                <span>{submittingRecurring ? 'Đang khởi tạo' : 'Xác nhận đặt định kỳ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THERMAL RECEIPT 80MM */}
      {showReceiptModal && successBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phanta-card max-w-sm w-full p-6 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
            >
              <X className="w-4 h-4" />
            </button>

            <div id="printable-receipt" className="thermal-paper rounded-lg text-xs space-y-3 p-4">
              <div className="text-center space-y-1">
                <h2 className="text-base font-heading font-semibold">Phanta Sports Arena</h2>
                <p className="text-[11px] text-slate-600">{selectedFacility?.name}</p>
                <p className="text-[10px] text-slate-500">{selectedFacility?.address}</p>
                <div className="py-1 border-b border-dashed border-slate-400 text-[10px] font-bold">
                  PHIẾU XÁC NHẬN VÀO SÂN
                </div>
              </div>

              <div className="space-y-1 text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span>Mã đơn</span>
                  <span className="font-bold">#{(successBooking._id || successBooking.bookingCode || '').slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Khách hàng</span>
                  <span className="font-bold">{successBooking.customerName || customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sân thi đấu</span>
                  <span className="font-bold">{selectedVenue?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Khung giờ</span>
                  <span className="font-bold">{successBooking.startTime} - {successBooking.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày chơi</span>
                  <span className="font-bold">{successBooking.bookingDate?.split('T')[0] || selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hình thức</span>
                  <span className="font-bold">{successBooking.paymentMethod || paymentMethod}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-400 flex justify-between items-center text-sm font-bold tabular-nums">
                <span>Tổng tiền</span>
                <span>{(successBooking.totalPrice || priceToPay).toLocaleString('vi-VN')} đ</span>
              </div>

              <div className="pt-2 text-center">
                {receiptQrUrl && <img src={receiptQrUrl} alt="QR Code" className="w-32 h-32 mx-auto" />}
                <p className="text-[10px] text-slate-500 mt-1">
                  Đưa mã này qua cổng soát vé hoặc máy quét lễ tân
                </p>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1">
                Cảm ơn quý khách và chúc quý khách thi đấu vui vẻ
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" strokeWidth={1.75} />
                <span>In phiếu 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="phanta-btn-secondary px-4 py-2.5 text-xs"
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
