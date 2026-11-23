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
  Sparkles,
  Ticket,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import { api, Facility, Venue, SlotAvailability, Booking } from '@/lib/api';
import QRCode from 'qrcode';

const COURT_SPORTS = [
  { value: 'FOOTBALL_5', label: '⚽ Bóng đá - Sân 5 người (Futsal)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 5', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'FOOTBALL_7', label: '⚽ Bóng đá - Sân 7 người (Mini)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 7', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'FOOTBALL_11', label: '⚽ Bóng đá - Sân 11 người (Tiêu chuẩn)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 11', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'BASKETBALL', label: '🏀 Bóng rổ tiêu chuẩn (Indoor / Outdoor)', sport: 'BASKETBALL', badge: 'BÓNG RỔ', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'BADMINTON', label: '🏸 Cầu lông thảm BWF chuyên nghiệp', sport: 'BADMINTON', badge: 'CẦU LÔNG', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'PICKLEBALL', label: '🏓 Pickleball tiêu chuẩn QT', sport: 'PICKLEBALL', badge: 'PICKLEBALL', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { value: 'TENNIS', label: '🎾 Quần vợt Tennis (Mặt cứng / Đất nện)', sport: 'TENNIS', badge: 'QUẦN VỢT TENNIS', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'VOLLEYBALL', label: '🏐 Bóng chuyền thi đấu', sport: 'VOLLEYBALL', badge: 'BÓNG CHUYỀN', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
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
    color: 'bg-slate-800 text-cyan-300 border-slate-700',
  };
}

const getVenueSportCategory = (venue: Venue): string => {
  const badge = getCourtSportBadge(venue);
  if (badge.sport && badge.sport !== 'OTHER') {
    return badge.sport;
  }
  const vName = (venue.name || '').toLowerCase();
  const vType = (venue.venueType || (venue as any).type || venue.sportType || '').toUpperCase();

  if (vType.startsWith('FOOTBALL') || vType.includes('FUTSAL') || vName.includes('bóng đá') || vName.includes('futsal') || vName.includes('sân 5') || vName.includes('sân 7') || vName.includes('sân 11') || vName.includes('cỏ') || vName.includes('f1') || vName.includes('f2') || vName.includes('f3')) {
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
  if (vType.includes('ESPORT') || vType.includes('GAMING') || vName.includes('gaming') || vName.includes('máy') || vName.includes('esport') || vName.includes('vip') || vName.includes('fps')) {
    return 'ESPORTS';
  }
  return 'OTHER';
};

const SPORT_FILTER_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'FOOTBALL', label: '⚽ Bóng Đá' },
  { id: 'BASKETBALL', label: '🏀 Bóng Rổ' },
  { id: 'BADMINTON', label: '🏸 Cầu Lông' },
  { id: 'PICKLEBALL', label: '🏓 Pickleball' },
  { id: 'TENNIS', label: '🎾 Tennis' },
  { id: 'VOLLEYBALL', label: '🏐 Bóng Chuyền' },
  { id: 'ESPORTS', label: '🎮 Esports' },
];

const isSlotInPast = (dateStr: string, startTime: string): boolean => {
  if (!dateStr || !startTime) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hour, min] = startTime.split(':').map(Number);
  const slotDate = new Date(y, m - 1, d, hour, min, 0, 0);
  return slotDate.getTime() <= Date.now();
};

export default function CustomerBookingPage() {
  const [activeTab, setActiveTab] = useState<'BOOKING' | 'MY_TICKETS'>('BOOKING');

  // Facilities & Venues
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Date selection (format locally to prevent UTC date offset)
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Generate 7 upcoming days
  const dateOptions = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.getDay() + 1 === 1 ? 'CN' : d.getDay() + 1}`;
    const dayMonth = `${d.getDate()}/${d.getMonth() + 1}`;
    return { dateStr, dayName, dayMonth };
  });

  // Real-time ticker to auto-lock past slots as time progresses
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Slots availability
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Hold & Booking state
  const [holding, setHolding] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [holdTimeLeft, setHoldTimeLeft] = useState<number>(600); // 10 minutes in seconds

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // My Tickets
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<Booking | null>(null);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');

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
          setError('⏰ Hết 10 phút giữ chỗ. Khung giờ đã được giải phóng trở về trạng thái trống.');
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

        // Trường hợp 1: PayOS xác nhận đã thanh toán thành công
        if (res.isPaid && res.booking) {
          setShowPaymentModal(false);
          setActiveBooking(null);
          setSelectedSlot(null);
          setError(null);
          setSuccessMessage('🎉 Thanh toán thành công qua PayOS! Vé vào sân đã được kích hoạt.');

          // Chuyển sang mục Vé Của Tôi và cập nhật danh sách
          setActiveTab('MY_TICKETS');
          await loadMyBookings();

          // Tự động mở xem vé QR
          handleOpenTicket(res.booking);
          return;
        }

        // Trường hợp 2: Hết thời gian giữ chỗ 10 phút
        if (res.isExpired) {
          setShowPaymentModal(false);
          setActiveBooking(null);
          setSelectedSlot(null);
          setError('⏰ Thời gian giữ chỗ 10 phút đã hết hạn. Khung giờ đã được giải phóng trở về trạng thái trống.');

          // Tải lại ma trận slot
          if (selectedVenue && selectedDate) {
            const avail = await api.getVenueAvailability(selectedVenue._id, selectedDate);
            setSlots(avail.slots || []);
          }
          return;
        }

        // Đồng bộ thời gian giữ chỗ nếu backend trả về
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

  // 6. Load My Bookings
  const loadMyBookings = async () => {
    try {
      setLoadingBookings(true);
      const data = await api.getMyBookings();
      setMyBookings(data || []);
    } catch (err: any) {
      console.error('Failed to load my bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MY_TICKETS') {
      loadMyBookings();
    }
  }, [activeTab]);

  // Handle Hold Slot
  const handleHoldSlot = async () => {
    if (!selectedVenue || !selectedSlot) return;
    if (isSlotInPast(selectedDate, selectedSlot.startTime)) {
      setError('⏰ Khung giờ này đã trôi qua. Vui lòng chọn khung giờ khác trong tương lai!');
      setSelectedSlot(null);
      return;
    }
    setError(null);
    setHolding(true);

    try {
      const booking = await api.holdSlot({
        venueId: selectedVenue._id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });

      setActiveBooking(booking);
      setHoldTimeLeft(600); // Reset 10 minutes

      // Generate VietQR payment link
      try {
        const paymentRes = await api.createPaymentLink(booking._id);
        const qrContent = paymentRes.qrCode || paymentRes.checkoutUrl || `https://api.phanta.id.vn/pay/${booking._id}`;
        setCheckoutUrl(paymentRes.checkoutUrl || paymentRes.paymentUrl || '');
        const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 280, margin: 2 });
        setPaymentQrUrl(qrDataUrl);
      } catch (pErr) {
        // Fallback VietQR string if payment service unreachable
        const fallbackQR = `https://img.vietqr.io/image/970422-0911223344-compact2.png?amount=${selectedSlot.price}&addInfo=SAN${booking._id.slice(-6)}`;
        setPaymentQrUrl(fallbackQR);
      }

      setShowPaymentModal(true);
    } catch (err: any) {
      console.error('Hold slot error:', err);
      const msg = err.message || err.data?.message || 'Slot này vừa có người giữ hoặc đã được đặt. Vui lòng chọn slot khác!';
      setError(msg);
      // Reload slots
      if (selectedVenue && selectedDate) {
        const res = await api.getVenueAvailability(selectedVenue._id, selectedDate);
        setSlots(res.slots || []);
      }
    } finally {
      setHolding(false);
    }
  };

  // Open Ticket QR Modal
  const handleOpenTicket = async (b: Booking) => {
    setViewingTicket(b);
    try {
      let tokenToEncode = b.qrToken || b.ticketCode || `TICKET:${b._id}`;
      try {
        const res = await api.getBookingQrToken(b._id);
        if (res?.qrToken) {
          tokenToEncode = res.qrToken;
        }
      } catch (e) {
        // Fallback to existing token
      }
      const url = await QRCode.toDataURL(tokenToEncode, { width: 280, margin: 2 });
      setTicketQrUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredVenues = venues.filter((v) => {
    if (selectedSport === 'ALL') return true;
    return getVenueSportCategory(v) === selectedSport;
  });

  useEffect(() => {
    if (filteredVenues.length > 0) {
      if (!selectedVenue || !filteredVenues.some((v) => v._id === selectedVenue._id)) {
        setSelectedVenue(filteredVenues[0]);
      }
    } else {
      setSelectedVenue(null);
    }
  }, [selectedSport, venues]);

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Hệ Thống Đặt Sân Tự Động 24/7
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tổ Hợp Thể Thao & Đặt Sân Trực Tuyến
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Giữ chỗ ngay chỉ trong 30 giây với công nghệ chống trùng lịch 3 lớp. Thanh toán VietQR tức thì và nhận vé QR động bảo mật vào sân.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 shrink-0 self-start md:self-center">
            <Link
              href="/my-tickets"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition shadow-sm"
            >
              <Ticket className="w-4 h-4 text-cyan-400" />
              <span>Vé Của Tôi & Hoàn Tiền</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Hold Alert Banner (if user currently has a held booking) */}
      {activeBooking && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Đang giữ chỗ cho bạn: <span className="text-amber-400">{selectedSlot?.startTime} - {selectedSlot?.endTime}</span> ngày {selectedDate}
              </p>
              <p className="text-xs text-slate-300">
                Thời gian thanh toán còn lại: <span className="font-mono font-bold text-amber-300 text-sm">{Math.floor(holdTimeLeft / 60)}:{String(holdTimeLeft % 60).padStart(2, '0')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center space-x-2 shadow-lg transition"
          >
            <CreditCard className="w-4 h-4" />
            <span>Mở Mã Thanh Toán VietQR</span>
          </button>
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: BOOKING FLOW */}
      {activeTab === 'BOOKING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Single Facility Info & Venue Selection */}
          <div className="lg:col-span-5 space-y-6">
            {/* Facility Header Card (Single Facility) */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                  Tổ Hợp Phanta Sports
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Mở Cửa 06:00 - 23:00
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-2.5">
                {selectedFacility?.name || 'Tổ Hợp Thể Thao Phanta Sports'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {selectedFacility?.address || '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM'}
              </p>
            </div>

            {/* Sport Types Filter */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-cyan-400" />
                Lọc Theo Bộ Môn
              </h3>
              <div className="flex flex-wrap gap-2">
                {SPORT_FILTER_TABS.map((s) => {
                  const count = s.id === 'ALL'
                    ? venues.length
                    : venues.filter((v) => getVenueSportCategory(v) === s.id).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSport(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        selectedSport === s.id
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{s.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          selectedSport === s.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Venue List */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Chọn Sân Đặt Chỗ
                </h3>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  {filteredVenues.length} sân
                </span>
              </div>

              {filteredVenues.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">Không tìm thấy sân nào phù hợp với bộ môn này.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredVenues.map((v) => {
                    const isSelected = selectedVenue?._id === v._id;
                    const price = v.basePricePerHour || v.defaultPrice || 150000;
                    const badge = getCourtSportBadge(v);
                    return (
                      <div
                        key={v._id}
                        onClick={() => setSelectedVenue(v)}
                        className={`p-3.5 rounded-2xl cursor-pointer border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50'
                            : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                              {v.name}
                            </p>
                            <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                              {badge.badge}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-400">Giá thuê</span>
                          <span className={`text-xs font-mono font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {price.toLocaleString('vi-VN')} đ/h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Date Selection & Slot Matrix */}
          <div className="lg:col-span-7 space-y-6">
            {/* 7-Day Date Carousel */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Chọn Ngày Đặt Sân
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {dateOptions.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition ${
                        isSelected
                          ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-tight">{d.dayName}</span>
                      <span className="text-sm font-black mt-0.5">{d.dayMonth}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 30-Minute Slots Grid */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Khung Giờ 30 Phút
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedVenue ? `${selectedVenue.name} (${getCourtSportBadge(selectedVenue).badge})` : 'Vui lòng chọn sân'} • Ngày {selectedDate}
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Trống
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Đang giữ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> Đã đặt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 inline-block" /> Đã qua
                  </span>
                </div>
              </div>

              {loadingSlots ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  <p className="text-xs">Đang kiểm tra ma trận slot thời gian thực...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Không tìm thấy dữ liệu khung giờ cho ngày đã chọn.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {slots.map((s, idx) => {
                    const isPast = isSlotInPast(selectedDate, s.startTime) || s.status === 'PAST';
                    const isBooked = s.status === 'CONFIRMED';
                    const isHeld = s.status === 'HELD' && !isPast;
                    const isAvailable = s.status === 'AVAILABLE' && !isPast && !isBooked;
                    const isSelected = selectedSlot?.startTime === s.startTime;

                    return (
                      <button
                        key={idx}
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(s)}
                        className={`py-2.5 px-1.5 rounded-xl text-center border transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                            : isAvailable
                            ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/10 cursor-pointer'
                            : isHeld
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400/80 cursor-not-allowed opacity-60'
                            : isBooked
                            ? 'bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-40'
                            : 'bg-slate-950/30 border-slate-900/60 text-slate-600 cursor-not-allowed opacity-40 select-none'
                        }`}
                      >
                        <div className="text-xs font-bold tracking-tight">{s.startTime}</div>
                        <div className="text-[10px] mt-0.5 opacity-80 font-medium">
                          {isAvailable
                            ? `${(s.price / 1000).toFixed(0)}k`
                            : isHeld
                            ? 'Giữ chỗ'
                            : isBooked
                            ? 'Đã đặt'
                            : 'Đã qua'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Slot Confirmation Action Bar */}
              {selectedSlot && (
                <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Khung giờ bạn đã chọn:</p>
                    <p className="text-sm font-bold text-white">
                      {selectedSlot.startTime} - {selectedSlot.endTime} •{' '}
                      <span className="text-cyan-400 font-mono">{selectedSlot.price.toLocaleString('vi-VN')} đ</span>
                    </p>
                  </div>
                  <button
                    onClick={handleHoldSlot}
                    disabled={holding}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-slate-950 flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition"
                  >
                    {holding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang khóa slot...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Giữ Chỗ 10 Phút & Thanh Toán</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY TICKETS & HISTORY */}
      {activeTab === 'MY_TICKETS' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Vé Vào Sân & Lịch Sử Đặt Chỗ</h2>
              <p className="text-xs text-slate-400 mt-0.5">Xuất trình mã QR tại cổng để nhân viên quầy quét check-in</p>
            </div>
            <button
              onClick={loadMyBookings}
              className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBookings ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingBookings ? (
            <div className="py-16 text-center text-slate-400 text-xs">Đang tải danh sách vé...</div>
          ) : myBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Bạn chưa có đơn đặt sân nào. Hãy chọn tab "Đặt Sân Mới" để đặt chỗ!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookings.map((b) => {
                const isConfirmed = b.status === 'CONFIRMED';
                return (
                  <div
                    key={b._id}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-cyan-400 font-bold">#{b._id.slice(-6).toUpperCase()}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConfirmed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{b.venueId?.name || 'Sân thể thao'}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {b.bookingDate} ({b.startTime} - {b.endTime})
                      </p>
                      <p className="text-xs font-mono text-emerald-400 font-bold mt-2">
                        {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenTicket(b)}
                      className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Xem Vé QR Vào Sân</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIETQR PAYMENT MODAL */}
      {showPaymentModal && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                PayOS VietQR 24/7
              </span>
              <h3 className="text-xl font-bold text-white mt-2">Quét Mã Thanh Toán</h3>
              <p className="text-xs text-slate-400 mt-1">
                Thời gian giữ slot còn:{' '}
                <span className="font-mono font-bold text-amber-400">
                  {Math.floor(holdTimeLeft / 60)}:{String(holdTimeLeft % 60).padStart(2, '0')}
                </span>
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center mx-auto w-fit shadow-xl">
              {paymentQrUrl ? (
                <img src={paymentQrUrl} alt="VietQR Payment" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-800" />
                </div>
              )}
            </div>

            <div className="mt-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Số tiền thanh toán:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {(selectedSlot?.price || activeBooking.totalPrice || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Khung giờ:</span>
                <span className="text-slate-200 font-semibold">{selectedSlot?.startTime} - {selectedSlot?.endTime}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ngày đặt:</span>
                <span className="text-slate-200">{selectedDate}</span>
              </div>
            </div>

            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <span>Mở Cổng Thanh Toán Trực Tiếp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* LIVE AUTOMATIC STATUS (ĐÃ BỎ NÚT XÁC NHẬN THỦ CÔNG) */}
            <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start space-x-3 text-cyan-200 shadow-inner">
              <div className="relative flex h-3.5 w-3.5 mt-0.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
              </div>
              <div className="text-left text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  Đang tự động xác nhận thanh toán với PayOS
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Vui lòng quét mã trên app ngân hàng. Ngay khi tiền vào tài khoản, hệ thống sẽ tự động kích hoạt mã vé và lưu vào mục <span className="text-cyan-300 font-semibold">"Vé của tôi"</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET VIEW MODAL */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center">
            <button
              onClick={() => setViewingTicket(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <QrCode className="w-3.5 h-3.5" />
              Vé Vào Sân Điện Tử
            </div>
            <h3 className="text-lg font-bold text-white">{viewingTicket.venueId?.name || 'Sân thể thao'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewingTicket.bookingDate} • {viewingTicket.startTime} - {viewingTicket.endTime}
            </p>

            <div className="my-6 p-4 bg-white rounded-2xl inline-block shadow-lg">
              {ticketQrUrl ? (
                <img src={ticketQrUrl} alt="Vé QR" className="w-52 h-52 object-contain" />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-800 text-xs">Đang nạp mã...</div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vui lòng đưa mã này cho nhân viên quầy lễ tân quét check-in khi bạn đến sân.
            </p>

            <Link
              href="/my-tickets"
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
            >
              <Ticket className="w-4 h-4" />
              <span>Xem Tất Cả Vé Tại "Vé Của Tôi"</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
