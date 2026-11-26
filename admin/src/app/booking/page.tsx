// admin/src/app/booking/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  QrCode,
  MapPin,
  Ticket,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink,
  ArrowRight,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';
import { api, Facility, Venue, SlotAvailability, Booking } from '@/lib/api';
import QRCode from 'qrcode';

const COURT_SPORTS = [
  { value: 'FOOTBALL_5', label: 'Bóng đá - Sân 5 (Futsal)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ SÂN 5' },
  { value: 'FOOTBALL_7', label: 'Bóng đá - Sân 7 (Mini)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ SÂN 7' },
  { value: 'FOOTBALL_11', label: 'Bóng đá - Sân 11 (Tiêu chuẩn)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ SÂN 11' },
  { value: 'BASKETBALL', label: 'Bóng rổ thi đấu', sport: 'BASKETBALL', badge: 'BÓNG RỔ' },
  { value: 'BADMINTON', label: 'Cầu lông thảm BWF', sport: 'BADMINTON', badge: 'CẦU LÔNG' },
  { value: 'PICKLEBALL', label: 'Pickleball tiêu chuẩn QT', sport: 'PICKLEBALL', badge: 'PICKLEBALL' },
  { value: 'TENNIS', label: 'Quần vợt Tennis', sport: 'TENNIS', badge: 'QUẦN VỢT' },
  { value: 'VOLLEYBALL', label: 'Bóng chuyền', sport: 'VOLLEYBALL', badge: 'BÓNG CHUYỀN' },
];

function getCourtSportBadge(venue: Venue) {
  const vType = (venue.venueType || (venue as any).type || venue.sportType || '').toUpperCase();
  const vName = (venue.name || '').toUpperCase();

  const matched = COURT_SPORTS.find((cs) => cs.value === vType || cs.value === (venue as any).type);
  if (matched) return matched;

  if (vName.includes('FUTSAL') || vName.includes('SÂN 5') || vType.includes('FUTSAL') || vType.includes('5')) {
    return COURT_SPORTS[0];
  }
  if (vName.includes('SÂN 7') || vType.includes('7')) {
    return COURT_SPORTS[1];
  }
  if (vName.includes('SÂN 11') || vType.includes('11')) {
    return COURT_SPORTS[2];
  }
  if (vName.includes('BÓNG ĐÁ') || vType.includes('FOOTBALL')) {
    return COURT_SPORTS[0];
  }
  if (vName.includes('BÓNG RỔ') || vType.includes('BASKETBALL')) {
    return COURT_SPORTS[3];
  }
  if (vName.includes('CẦU LÔNG') || vType.includes('BADMINTON')) {
    return COURT_SPORTS[4];
  }
  if (vName.includes('PICKLEBALL') || vType.includes('PICKLEBALL')) {
    return COURT_SPORTS[5];
  }
  if (vName.includes('TENNIS') || vName.includes('QUẦN VỢT') || vType.includes('TENNIS')) {
    return COURT_SPORTS[6];
  }
  if (vName.includes('BÓNG CHUYỀN') || vType.includes('VOLLEYBALL')) {
    return COURT_SPORTS[7];
  }

  return {
    value: venue.venueType || 'SPORTS',
    label: venue.venueType || 'Sân thể thao',
    sport: 'OTHER',
    badge: venue.venueType || 'THỂ THAO',
  };
}

const getVenueSportCategory = (venue: Venue): string => {
  const badge = getCourtSportBadge(venue);
  if (badge.sport && badge.sport !== 'OTHER') {
    return badge.sport;
  }
  const vName = (venue.name || '').toLowerCase();
  const vType = (venue.venueType || (venue as any).type || venue.sportType || '').toUpperCase();

  if (vType.startsWith('FOOTBALL') || vType.includes('FUTSAL') || vName.includes('bóng đá') || vName.includes('futsal') || vName.includes('sân 5') || vName.includes('sân 7') || vName.includes('sân 11') || vName.includes('cỏ')) {
    return 'FOOTBALL';
  }
  if (vType === 'BASKETBALL' || vName.includes('bóng rổ') || vName.includes('basketball')) {
    return 'BASKETBALL';
  }
  if (vType === 'BADMINTON' || vName.includes('cầu lông') || vName.includes('badminton')) {
    return 'BADMINTON';
  }
  if (vType === 'PICKLEBALL' || vName.includes('pickleball')) {
    return 'PICKLEBALL';
  }
  if (vType === 'TENNIS' || vName.includes('tennis') || vName.includes('quần vợt')) {
    return 'TENNIS';
  }
  if (vType === 'VOLLEYBALL' || vName.includes('bóng chuyền') || vName.includes('volleyball')) {
    return 'VOLLEYBALL';
  }
  if (vType.includes('ESPORT') || vType.includes('GAMING') || vName.includes('gaming') || vName.includes('máy') || vName.includes('esport')) {
    return 'ESPORTS';
  }
  return 'OTHER';
};

const SPORT_FILTER_TABS = [
  { id: 'ALL', label: 'Tất cả môn' },
  { id: 'FOOTBALL', label: 'Bóng đá' },
  { id: 'BASKETBALL', label: 'Bóng rổ' },
  { id: 'BADMINTON', label: 'Cầu lông' },
  { id: 'PICKLEBALL', label: 'Pickleball' },
  { id: 'TENNIS', label: 'Tennis' },
  { id: 'ESPORTS', label: 'Esports' },
];

const isSlotInPast = (dateStr: string, startTime: string): boolean => {
  if (!dateStr || !startTime) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hour, min] = startTime.split(':').map(Number);
  const slotDate = new Date(y, m - 1, d, hour, min, 0, 0);
  return slotDate.getTime() <= Date.now();
};

export default function CustomerBookingPage() {
  // Facilities & Venues
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Date selection
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const dateOptions = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.getDay() + 1 === 1 ? 'CN' : d.getDay() + 1}`;
    const dayMonth = `${d.getDate()}/${d.getMonth() + 1}`;
    return { dateStr, dayName, dayMonth };
  });

  // Slots availability
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Hold & Booking state
  const [holding, setHolding] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [holdTimeLeft, setHoldTimeLeft] = useState<number>(600);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Load Facilities
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setLoading(true);
        const data = await api.getFacilities();
        const active = data.filter((f) => f.isActive !== false);
        setFacilities(active);
        if (active.length > 0) {
          setSelectedFacility(active[0]);
        }
      } catch (err: any) {
        console.error('Failed to load facilities:', err);
        setError('Không thể tải danh sách cụm cơ sở. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    loadFacilities();
  }, []);

  // 2. Load Venues when Facility changes
  useEffect(() => {
    if (!selectedFacility) {
      setVenues([]);
      setSelectedVenue(null);
      return;
    }

    const loadVenues = async () => {
      try {
        const data = await api.getVenues(selectedFacility._id);
        const active = data.filter((v) => v.isActive !== false);
        setVenues(active);
        if (active.length > 0) {
          setSelectedVenue(active[0]);
        } else {
          setSelectedVenue(null);
        }
      } catch (err: any) {
        console.error('Failed to load venues:', err);
      }
    };
    loadVenues();
  }, [selectedFacility]);

  // 3. Load Slots when Venue or Date changes
  useEffect(() => {
    if (!selectedVenue || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const res = await api.getVenueAvailability(selectedVenue._id, selectedDate);
        setSlots(res.slots || []);
      } catch (err: any) {
        console.error('Failed to load availability:', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedVenue, selectedDate]);

  // 4. Hold countdown timer
  useEffect(() => {
    if (!activeBooking) return;

    const timer = setInterval(() => {
      setHoldTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveBooking(null);
          setSelectedSlot(null);
          setShowPaymentModal(false);
          setError('Hết 10 phút giữ chỗ. Khung giờ đã được giải phóng trở về trạng thái trống.');
          if (selectedVenue && selectedDate) {
            api.getVenueAvailability(selectedVenue._id, selectedDate).then((res) => {
              setSlots(res.slots || []);
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBooking, selectedVenue, selectedDate]);

  // 5. Automatic PayOS Payment Verification Polling
  useEffect(() => {
    if (!showPaymentModal || !activeBooking) return;

    let isSubscribed = true;

    const pollPaymentStatus = async () => {
      try {
        const res = await api.checkPaymentStatus(activeBooking._id);
        if (!isSubscribed) return;

        if (res.isPaid && res.booking) {
          setShowPaymentModal(false);
          setActiveBooking(null);
          setSelectedSlot(null);
          setError(null);
          setSuccessMessage('Thanh toán thành công qua PayOS! Vé vào sân đã được kích hoạt.');
          return;
        }

        if (res.isExpired) {
          setShowPaymentModal(false);
          setActiveBooking(null);
          setSelectedSlot(null);
          setError('Thời gian giữ chỗ 10 phút đã hết hạn. Khung giờ đã được giải phóng trở về trạng thái trống.');
          if (selectedVenue && selectedDate) {
            const avail = await api.getVenueAvailability(selectedVenue._id, selectedDate);
            setSlots(avail.slots || []);
          }
          return;
        }

        if (typeof res.holdTimeLeft === 'number') {
          setHoldTimeLeft(res.holdTimeLeft);
        }
      } catch (err: any) {
        console.warn('Lỗi tra cứu trạng thái thanh toán PayOS:', err);
      }
    };

    const firstCheck = setTimeout(pollPaymentStatus, 1000);
    const interval = setInterval(pollPaymentStatus, 2500);

    return () => {
      isSubscribed = false;
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, [showPaymentModal, activeBooking, selectedVenue, selectedDate]);

  // Filter venues by selected sport
  const filteredVenues = venues.filter((v) => {
    if (selectedSport === 'ALL') return true;
    return getVenueSportCategory(v) === selectedSport;
  });

  // Action: Hold Slot (Giữ chỗ 10 phút)
  const handleHoldSlot = async () => {
    if (!selectedVenue || !selectedSlot) {
      setError('Vui lòng chọn sân và khung giờ trước khi tiếp tục.');
      return;
    }

    try {
      setHolding(true);
      setError(null);
      const booking = await api.holdSlot({
        venueId: selectedVenue._id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setActiveBooking(booking);
      setHoldTimeLeft(600);

      // Generate VietQR / PayOS Payment
      try {
        const payRes = await api.createPaymentLink(booking._id);
        const linkUrl = payRes.checkoutUrl || payRes.paymentUrl || payRes.payUrl;
        if (linkUrl) {
          setCheckoutUrl(linkUrl);
          const qrDataUrl = await QRCode.toDataURL(linkUrl, {
            width: 280,
            margin: 2,
            color: { dark: '#0C0F0C', light: '#FFFFFF' },
          });
          setPaymentQrUrl(qrDataUrl);
        }
      } catch (payErr: any) {
        console.warn('Fallback to standard QR generation:', payErr);
        const fallbackQr = await QRCode.toDataURL(
          `PHANTA-PAYMENT-${booking._id}-${selectedSlot.price}`,
          { width: 280, margin: 2, color: { dark: '#0C0F0C', light: '#FFFFFF' } }
        );
        setPaymentQrUrl(fallbackQr);
      }

      setShowPaymentModal(true);
    } catch (err: any) {
      console.error('Lỗi khi giữ chỗ:', err);
      const msg = err.message || err.data?.message || 'Không thể giữ chỗ khung giờ này. Có thể slot vừa được người khác chọn.';
      setError(msg);
    } finally {
      setHolding(false);
    }
  };

  // Group slots into 3 periods: Morning (06:00 - 12:00), Afternoon (12:00 - 17:30), Evening (17:30 - 23:00)
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 6 && hour < 12;
  });

  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    const minute = parseInt(s.startTime.split(':')[1], 10);
    const totalMinutes = hour * 60 + minute;
    return totalMinutes >= 12 * 60 && totalMinutes < 17 * 60 + 30;
  });

  const eveningSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    const minute = parseInt(s.startTime.split(':')[1], 10);
    const totalMinutes = hour * 60 + minute;
    return totalMinutes >= 17 * 60 + 30 && totalMinutes <= 23 * 60;
  });

  return (
    <div className="space-y-8 pb-24">
      {/* 1. HEADER SECTION (PLAYO STYLE) */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E3E8E6] dark:border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#E3E8E6] dark:border-white/10 text-xs text-[#3B4540] dark:text-[#D1D5DB] bg-[#F8F9FA] dark:bg-[#191C14] mb-2">
            <Building2 className="w-3.5 h-3.5 text-[#00B562] dark:text-[#9CFF93]" />
            <span className="font-medium">{selectedFacility?.name || 'Tổ hợp Phanta Sports'}</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#171C1A] dark:text-white uppercase tracking-tight">
            Đặt Lịch Sân Trực Tuyến
          </h1>
          <p className="text-xs sm:text-sm text-[#758A80] dark:text-[#A1A79F] mt-1">
            Chọn bộ môn, ngày và khung giờ 30 phút theo bảng ma trận sân. Hệ thống giữ chỗ tức thì trong 10 phút.
          </p>
        </div>

        {/* Change facility dropdown / pill */}
        {facilities.length > 1 && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-[#758A80] dark:text-[#A1A79F]">Cơ sở:</span>
            <select
              aria-label="Chọn cơ sở"
              value={selectedFacility?._id || ''}
              onChange={(e) => {
                const fac = facilities.find((f) => f._id === e.target.value);
                if (fac) setSelectedFacility(fac);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/15 bg-white dark:bg-[#191C14] text-[#171C1A] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00B562] dark:focus:ring-[#9CFF93]"
            >
              {facilities.map((fac) => (
                <option key={fac._id} value={fac._id}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* 2. ALERT MESSAGES */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. STEP 1: SPORT FILTER TABS */}
      <section className="space-y-3">
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#758A80] dark:text-[#A1A79F]">
          Bước 1 - Lọc theo bộ môn
        </span>
        <div className="flex flex-wrap gap-2">
          {SPORT_FILTER_TABS.map((tab) => {
            const isSelected = selectedSport === tab.id;
            const count = tab.id === 'ALL'
              ? venues.length
              : venues.filter((v) => getVenueSportCategory(v) === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedSport(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-wide transition-colors flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-[#00B562] text-white dark:bg-[#9CFF93] dark:text-[#0C0F0C]'
                    : 'bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black font-mono'
                      : 'bg-[#F2F2F4] dark:bg-white/5 text-[#758A80] dark:text-[#A1A79F]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. STEP 2: 7-DAY HORIZONTAL CALENDAR STRIP */}
      <section className="space-y-3">
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#758A80] dark:text-[#A1A79F]">
          Bước 2 - Chọn ngày đặt sân
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {dateOptions.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedDate(d.dateStr)}
                className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition-colors ${
                  isSelected
                    ? 'bg-[#00B562] text-white border-[#00B562] dark:bg-[#9CFF93] dark:text-[#0C0F0C] dark:border-[#9CFF93] font-bold shadow-sm'
                    : 'bg-white dark:bg-[#191C14] border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]'
                }`}
              >
                <span className="text-[10px] font-heading uppercase tracking-wide opacity-80">
                  {d.dayName}
                </span>
                <span className="font-heading font-black text-sm mt-0.5">
                  {d.dayMonth}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. STEP 3: BOOKING MATRIX GRID (CHỐNG ÉP THẺ NHƯ HÌNH 2) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#758A80] dark:text-[#A1A79F]">
            Bước 3 - Ma trận sân & Khung giờ 30 phút
          </span>

          {/* Trạng thái chú thích (Legend - Không chấm chớp) */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#758A80] dark:text-[#A1A79F]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-[#00B562] dark:border-[#9CFF93] bg-white dark:bg-[#191C14] inline-block" />
              <span>Trống (Đặt được)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 dark:bg-amber-500 inline-block" />
              <span>Đang giữ chỗ</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-200 dark:bg-white/10 inline-block" />
              <span>Đã đặt</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-100 dark:bg-white/5 inline-block opacity-40" />
              <span>Đã qua giờ</span>
            </span>
          </div>
        </div>

        {/* Danh sách sân selector (Dạng thẻ ngang cân đối) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#758A80] dark:text-[#A1A79F]">
            <span>Chọn sân tại cơ sở:</span>
            <span>{filteredVenues.length} sân khả dụng</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredVenues.map((v) => {
              const isSelected = selectedVenue?._id === v._id;
              const price = v.basePricePerHour || v.defaultPrice || 150000;
              const badge = getCourtSportBadge(v);

              return (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => setSelectedVenue(v)}
                  className={`p-3.5 rounded-2xl border text-left transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#00B562]/10 dark:bg-[#9CFF93]/10 border-[#00B562] dark:border-[#9CFF93] ring-1 ring-[#00B562] dark:ring-[#9CFF93]'
                      : 'bg-white dark:bg-[#191C14] border-[#E3E8E6] dark:border-white/10 text-[#3B4540] dark:text-[#D1D5DB] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <p className={`font-heading font-bold text-xs leading-tight ${isSelected ? 'text-[#00B562] dark:text-[#9CFF93]' : 'text-[#171C1A] dark:text-white'}`}>
                      {v.name}
                    </p>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93] shrink-0" />}
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#E3E8E6] dark:border-white/5 flex items-center justify-between text-[11px] w-full">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F8F9FA] dark:bg-white/5 text-[#758A80] dark:text-[#A1A79F]">
                      {badge.badge}
                    </span>
                    <span className="font-heading font-bold text-[#171C1A] dark:text-white">
                      {(price / 1000).toFixed(0)}k/h
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BẢNG MA TRẬN KHUNG GIỜ VỚI THANH CUỘN NGANG ĐỘC LẬP (CHỐNG ÉP THẺ) */}
        <div className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-5 sm:p-6 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E3E8E6] dark:border-white/10">
            <div>
              <h3 className="font-heading font-bold text-base text-[#171C1A] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
                {selectedVenue ? selectedVenue.name : 'Vui lòng chọn sân'}
              </h3>
              <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-0.5">
                Ngày {selectedDate} - Giá thuê {(selectedVenue?.basePricePerHour || 150000).toLocaleString('vi-VN')} đ/giờ
              </p>
            </div>
            {selectedSlot && (
              <span className="font-heading font-bold text-xs uppercase px-3 py-1 rounded-full bg-[#00B562]/10 text-[#00B562] dark:bg-[#9CFF93]/10 dark:text-[#9CFF93] border border-[#00B562]/30 dark:border-[#9CFF93]/30">
                Đã chọn: {selectedSlot.startTime} - {selectedSlot.endTime}
              </span>
            )}
          </div>

          {loadingSlots ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#758A80] dark:text-[#A1A79F] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00B562] dark:text-[#9CFF93]" />
              <p className="text-xs">Đang kiểm tra ma trận khung giờ thời gian thực...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center text-[#758A80] dark:text-[#A1A79F] text-xs">
              Không tìm thấy khung giờ hoạt động nào cho ngày đã chọn.
            </div>
          ) : (
            <div className="space-y-6 pt-5">
              {/* Ca 1: Sáng (06:00 - 12:00) */}
              {morningSlots.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-heading font-bold uppercase tracking-wider text-[#3B4540] dark:text-[#D1D5DB]">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Ca Sáng (06:00 - 12:00)</span>
                  </div>
                  {/* Container có min-width và overflow-x để không bao giờ bị dồn ép */}
                  <div className="overflow-x-auto pb-2">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 min-w-[620px]">
                      {morningSlots.map((s, idx) => {
                        const isPast = isSlotInPast(selectedDate, s.startTime) || s.status === 'PAST';
                        const isBooked = s.status === 'CONFIRMED';
                        const isHeld = s.status === 'HELD' && !isPast;
                        const isAvailable = s.status === 'AVAILABLE' && !isPast && !isBooked;
                        const isSelected = selectedSlot?.startTime === s.startTime;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(s)}
                            className={`py-3 px-2 rounded-xl text-center border transition-colors flex flex-col items-center justify-center min-w-[70px] ${
                              isSelected
                                ? 'bg-[#00B562] text-white border-[#00B562] dark:bg-[#9CFF93] dark:text-[#0C0F0C] dark:border-[#9CFF93] font-bold shadow-sm'
                                : isAvailable
                                ? 'bg-white dark:bg-[#121512] border-[#E3E8E6] dark:border-white/10 text-[#171C1A] dark:text-white hover:border-[#00B562] dark:hover:border-[#9CFF93] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] cursor-pointer'
                                : isHeld
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 opacity-60 cursor-not-allowed'
                                : isBooked
                                ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/5 text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed'
                                : 'bg-neutral-50 dark:bg-white/5 border-transparent text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed select-none'
                            }`}
                          >
                            <span className="font-heading font-bold text-xs">{s.startTime}</span>
                            <span className="text-[10px] mt-0.5 opacity-80 font-mono">
                              {isAvailable ? `${(s.price / 1000).toFixed(0)}k` : isHeld ? 'Giữ chỗ' : isBooked ? 'Đã đặt' : 'Đã qua'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Ca 2: Chiều (12:00 - 17:30) */}
              {afternoonSlots.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-heading font-bold uppercase tracking-wider text-[#3B4540] dark:text-[#D1D5DB]">
                    <Sunset className="w-4 h-4 text-orange-500" />
                    <span>Ca Chiều (12:00 - 17:30)</span>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 min-w-[620px]">
                      {afternoonSlots.map((s, idx) => {
                        const isPast = isSlotInPast(selectedDate, s.startTime) || s.status === 'PAST';
                        const isBooked = s.status === 'CONFIRMED';
                        const isHeld = s.status === 'HELD' && !isPast;
                        const isAvailable = s.status === 'AVAILABLE' && !isPast && !isBooked;
                        const isSelected = selectedSlot?.startTime === s.startTime;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(s)}
                            className={`py-3 px-2 rounded-xl text-center border transition-colors flex flex-col items-center justify-center min-w-[70px] ${
                              isSelected
                                ? 'bg-[#00B562] text-white border-[#00B562] dark:bg-[#9CFF93] dark:text-[#0C0F0C] dark:border-[#9CFF93] font-bold shadow-sm'
                                : isAvailable
                                ? 'bg-white dark:bg-[#121512] border-[#E3E8E6] dark:border-white/10 text-[#171C1A] dark:text-white hover:border-[#00B562] dark:hover:border-[#9CFF93] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] cursor-pointer'
                                : isHeld
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 opacity-60 cursor-not-allowed'
                                : isBooked
                                ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/5 text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed'
                                : 'bg-neutral-50 dark:bg-white/5 border-transparent text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed select-none'
                            }`}
                          >
                            <span className="font-heading font-bold text-xs">{s.startTime}</span>
                            <span className="text-[10px] mt-0.5 opacity-80 font-mono">
                              {isAvailable ? `${(s.price / 1000).toFixed(0)}k` : isHeld ? 'Giữ chỗ' : isBooked ? 'Đã đặt' : 'Đã qua'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Ca 3: Tối & Giờ cao điểm (17:30 - 23:00) */}
              {eveningSlots.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-heading font-bold uppercase tracking-wider text-[#3B4540] dark:text-[#D1D5DB]">
                    <Moon className="w-4 h-4 text-emerald-500" />
                    <span>Ca Tối & Giờ Cao Điểm (17:30 - 23:00)</span>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 min-w-[620px]">
                      {eveningSlots.map((s, idx) => {
                        const isPast = isSlotInPast(selectedDate, s.startTime) || s.status === 'PAST';
                        const isBooked = s.status === 'CONFIRMED';
                        const isHeld = s.status === 'HELD' && !isPast;
                        const isAvailable = s.status === 'AVAILABLE' && !isPast && !isBooked;
                        const isSelected = selectedSlot?.startTime === s.startTime;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(s)}
                            className={`py-3 px-2 rounded-xl text-center border transition-colors flex flex-col items-center justify-center min-w-[70px] ${
                              isSelected
                                ? 'bg-[#00B562] text-white border-[#00B562] dark:bg-[#9CFF93] dark:text-[#0C0F0C] dark:border-[#9CFF93] font-bold shadow-sm'
                                : isAvailable
                                ? 'bg-white dark:bg-[#121512] border-[#E3E8E6] dark:border-white/10 text-[#171C1A] dark:text-white hover:border-[#00B562] dark:hover:border-[#9CFF93] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] cursor-pointer'
                                : isHeld
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 opacity-60 cursor-not-allowed'
                                : isBooked
                                ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/5 text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed'
                                : 'bg-neutral-50 dark:bg-white/5 border-transparent text-neutral-400 dark:text-neutral-600 opacity-40 cursor-not-allowed select-none'
                            }`}
                          >
                            <span className="font-heading font-bold text-xs">{s.startTime}</span>
                            <span className="text-[10px] mt-0.5 opacity-80 font-mono">
                              {isAvailable ? `${(s.price / 1000).toFixed(0)}k` : isHeld ? 'Giữ chỗ' : isBooked ? 'Đã đặt' : 'Đã qua'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. THANH TỔNG QUAN ĐẶT CHỖ CỐ ĐỊNH DƯỚI ĐÁY (STICKY BOOKING DRAWER) */}
      {selectedSlot && selectedVenue && (
        <aside
          aria-label="Thanh xác nhận đặt chỗ"
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#191C14]/95 border-t border-[#E3E8E6] dark:border-white/10 backdrop-blur-md p-4 shadow-lg transition-colors"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 text-[#00B562] dark:text-[#9CFF93] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <p className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">
                  {selectedVenue.name} - Ngày {selectedDate}
                </p>
                <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-0.5">
                  Khung giờ: <strong className="text-[#00B562] dark:text-[#9CFF93]">{selectedSlot.startTime} - {selectedSlot.endTime}</strong> - Tổng tiền:{' '}
                  <span className="font-mono font-bold text-[#171C1A] dark:text-white">
                    {selectedSlot.price.toLocaleString('vi-VN')} đ
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E3E8E6] dark:border-white/10 text-[#758A80] dark:text-[#A1A79F] hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] text-xs font-semibold"
              >
                Hủy chọn
              </button>

              <button
                type="button"
                onClick={handleHoldSlot}
                disabled={holding}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#00B562] hover:bg-[#00914E] text-white dark:bg-[#9CFF93] dark:hover:bg-[#1ED760] dark:text-[#0C0F0C] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                {holding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang khóa slot...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Giữ chỗ 10 phút & Thanh toán</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 7. MODAL THANH TOÁN VIETQR PAYOS (KHÔNG CHẤM CHỚP) */}
      {showPaymentModal && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#191C14] border border-[#E3E8E6] dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl transition-colors">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-5 right-5 p-2 text-[#758A80] hover:text-[#171C1A] dark:hover:text-white rounded-xl"
              aria-label="Đóng cửa sổ thanh toán"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00B562]/10 text-[#00B562] dark:bg-[#9CFF93]/10 dark:text-[#9CFF93] border border-[#00B562]/20 dark:border-[#9CFF93]/20">
                Thanh toán PayOS VietQR
              </span>
              <h3 className="font-heading font-black text-xl text-[#171C1A] dark:text-white mt-2">
                Quét Mã Để Hoàn Tất Giữ Chỗ
              </h3>
              <p className="text-xs text-[#758A80] dark:text-[#A1A79F] mt-1">
                Thời gian giữ chỗ còn:{' '}
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {Math.floor(holdTimeLeft / 60)}:{String(holdTimeLeft % 60).padStart(2, '0')}
                </span>
              </p>
            </div>

            {/* Khung mã QR */}
            <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center mx-auto w-fit border border-[#E3E8E6] shadow-sm">
              {paymentQrUrl ? (
                <img src={paymentQrUrl} alt="Mã thanh toán VietQR" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00B562]" />
                </div>
              )}
            </div>

            {/* Chi tiết thanh toán */}
            <div className="mt-5 p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#121512] border border-[#E3E8E6] dark:border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between text-[#758A80] dark:text-[#A1A79F]">
                <span>Số tiền chuyển khoản:</span>
                <span className="font-heading font-bold text-[#00B562] dark:text-[#9CFF93] text-sm">
                  {(selectedSlot?.price || activeBooking.totalPrice || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-[#758A80] dark:text-[#A1A79F]">
                <span>Khung giờ:</span>
                <span className="font-medium text-[#171C1A] dark:text-white">
                  {selectedSlot?.startTime} - {selectedSlot?.endTime}
                </span>
              </div>
              <div className="flex justify-between text-[#758A80] dark:text-[#A1A79F]">
                <span>Ngày đặt:</span>
                <span className="font-medium text-[#171C1A] dark:text-white">{selectedDate}</span>
              </div>
            </div>

            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3.5 w-full py-2.5 px-4 rounded-xl border border-[#E3E8E6] dark:border-white/10 text-xs font-semibold text-[#171C1A] dark:text-white hover:bg-[#F2F2F4] dark:hover:bg-[#22261E] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Mở cổng thanh toán trực tiếp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Trạng thái xác nhận tự động (Không có chấm nhấp nháy animate-ping) */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#00B562]/10 dark:bg-[#9CFF93]/10 border border-[#00B562]/20 dark:border-[#9CFF93]/20 flex items-start space-x-2.5 text-xs">
              <RefreshCw className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93] animate-spin shrink-0 mt-0.5" />
              <div className="text-left text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
                <p className="font-semibold text-[#171C1A] dark:text-white">
                  Đang chờ tín hiệu chuyển khoản tự động
                </p>
                <p className="text-[11px] text-[#758A80] dark:text-[#A1A79F] mt-0.5">
                  Sau khi bạn chuyển khoản trên ứng dụng ngân hàng, vé sẽ tự động được kích hoạt và lưu vào mục "Vé của tôi".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
