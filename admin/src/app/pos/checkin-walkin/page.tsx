'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, Printer, QrCode, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { api, Booking, Facility, SlotAvailability, Venue } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export default function PosCheckinWalkinPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  // Check-in states
  const [scannerActive, setScannerActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'INVALID';
    message: string;
    booking?: Booking;
  } | null>(null);
  const scannerRef = useRef<any>(null);

  // Walk-in states
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const venueContainerRef = useRef<HTMLDivElement>(null);
  const venueSearchInputRef = useRef<HTMLInputElement>(null);
  const [bookingDate, setBookingDate] = useState(() => getLocalDateString());

  const filteredVenues = useMemo(() => {
    const q = normalizeSearchText(venueQuery);
    if (!q) return venues;
    return venues.filter((v) => {
      const target = normalizeSearchText(
        `${v.name || ''} ${v.venueType || ''} ${v.type || ''} ${v.sportType || ''}`,
      );
      return target.includes(q);
    });
  }, [venues, venueQuery]);

  useEffect(() => {
    if (!venueDropdownOpen) return;
    const focusTimer = setTimeout(() => {
      venueSearchInputRef.current?.focus();
    }, 20);
    const handleOutside = (e: MouseEvent) => {
      if (venueContainerRef.current && !venueContainerRef.current.contains(e.target as Node)) {
        setVenueDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVenueDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [venueDropdownOpen]);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const list = await api.getFacilities();
        setFacilities(list);
        if (list.length > 0) {
          setSelectedFacilityId(list[0]._id);
        }
      } catch (err: any) {
        showToast('Không thể tải cơ sở', err.message || 'Kiểm tra kết nối backend', 'error');
      }
    };
    loadFacilities();
  }, [showToast]);

  useEffect(() => {
    if (!selectedFacilityId) {
      setVenues([]);
      setSelectedVenueId('');
      return;
    }
    const loadVenues = async () => {
      try {
        const list = await api.getVenues(selectedFacilityId);
        setVenues(list);
        setSelectedVenueId(list.length > 0 ? list[0]._id : '');
      } catch {
        setVenues([]);
      }
    };
    loadVenues();
  }, [selectedFacilityId]);

  const fetchSlots = async (venueId: string, date: string) => {
    if (!venueId || !date) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const avail = await api.getVenueAvailability(venueId, date);
      const rawSlots: any[] =
        avail?.slots && avail.slots.length > 0
          ? avail.slots
          : (avail?.matrix48 || []).filter((m) => m.isOperating !== false);
      const list: SlotAvailability[] = rawSlots.map((m) => ({
        startTime: m.startTime,
        endTime: m.endTime,
        price: Number(m.price ?? 0),
        isAvailable: typeof m.isAvailable === 'boolean' ? m.isAvailable : m.status === 'AVAILABLE' && !m.isPast,
        status: m.status || 'AVAILABLE',
      }));
      setSlots(list);
      const firstOpen = list.find((s) => s.isAvailable && s.status === 'AVAILABLE');
      if (firstOpen) setSelectedSlot(firstOpen);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVenueId && bookingDate) {
      fetchSlots(selectedVenueId, bookingDate);
    }
  }, [selectedVenueId, bookingDate]);

  useEffect(() => {
    const onGlobalSearch = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setManualToken(custom.detail);
        handleProcessQr(custom.detail);
      }
    };
    window.addEventListener('phanta-pos-search', onGlobalSearch);
    return () => window.removeEventListener('phanta-pos-search', onGlobalSearch);
  });

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleProcessQr = async (tokenValue?: string) => {
    const token = (tokenValue ?? manualToken).trim();
    if (!token || scanLoading) return;
    setScanLoading(true);
    setScanResult(null);

    try {
      const res = await api.scanCheckin(token);
      setScanResult({
        status: 'SUCCESS',
        message: res.message || 'Vé hợp lệ. Khách được phép vào sân.',
        booking: res.booking,
      });
      showToast('Soát vé thành công', res.message || 'Khách đã qua cổng check-in.');
      setManualToken('');
    } catch (err: any) {
      setScanResult({
        status: 'INVALID',
        message: err.message || 'Mã vé không hợp lệ hoặc đã quá hạn.',
      });
      showToast('Không thể check-in', err.message || 'Mã vé không hợp lệ', 'error');
    } finally {
      setScanLoading(false);
    }
  };

  const toggleScanner = async () => {
    if (scannerActive) {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      setScannerActive(false);
      return;
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setScannerActive(true);
      setTimeout(async () => {
        try {
          const qr = new Html5Qrcode('pos-qr-reader');
          scannerRef.current = qr;
          await qr.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 190, height: 190 } },
            (decodedText: string) => {
              handleProcessQr(decodedText);
            },
            () => {},
          );
        } catch (err: any) {
          setScannerActive(false);
          showToast('Không mở được camera', err?.message || 'Trình duyệt chưa cấp quyền camera', 'error');
        }
      }, 100);
    } catch {
      showToast('Thiếu trình quét camera', 'Vui lòng nhập mã vé trực tiếp vào ô tra cứu.', 'error');
    }
  };

  const selectedVenueObj = venues.find((v) => v._id === selectedVenueId);
  const walkinPrice = selectedSlot?.price ?? selectedVenueObj?.defaultPrice ?? selectedVenueObj?.basePricePerHour ?? 0;

  const handleConfirmWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId || !selectedSlot) {
      showToast('Chưa chọn khung giờ', 'Vui lòng chọn sân và khung giờ trống.', 'error');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Thiếu thông tin khách', 'Vui lòng nhập tên và số điện thoại khách hàng.', 'error');
      return;
    }

    setWalkinSubmitting(true);
    try {
      const booking = await api.createWalkInBooking({
        venueId: selectedVenueId,
        bookingDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
        note: 'Đặt walk-in trực tiếp tại quầy POS',
      });

      const venueName = selectedVenueObj?.name || 'Sân thể thao Phanta';
      const slotLabel = `${selectedSlot.startTime} - ${selectedSlot.endTime}`;
      const price = booking.totalPrice || walkinPrice;

      openReceipt({
        key: 'walkin',
        title: 'HÓA ĐƠN ĐẶT SÂN WALK-IN',
        invoiceNo: booking.bookingCode || `#WI-${booking._id.slice(-5).toUpperCase()}`,
        customer: `${customerName.trim()} (${customerPhone.trim()})`,
        method: paymentMethod === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR',
        items: [{ name: `${venueName} (${slotLabel})`, qty: 1, price }],
        subtotal: price,
        total: price,
        tendered: price,
        change: 0,
        extraNote: `Ngày ${bookingDate} - Đặt tại quầy POS`,
      });

      showToast('Tạo đơn walk-in thành công', `Đã giữ sân ${venueName} khung ${slotLabel}`);
      setCustomerName('');
      setCustomerPhone('');
      fetchSlots(selectedVenueId, bookingDate);
    } catch (err: any) {
      showToast('Đặt chỗ thất bại', err.message || 'Khung giờ có thể đã được đặt.', 'error');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: QR Scanner & Check-in (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        <section className="phanta-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--pos-border-subtle)]">
            <div>
              <h2 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Soát vé QR vào sân
              </h2>
              <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
                Quét mã QR từ ứng dụng khách hoặc nhập mã đặt sân
              </p>
            </div>
            <button
              type="button"
              onClick={toggleScanner}
              className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{scannerActive ? 'Tắt camera' : 'Mở camera'}</span>
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="relative w-full min-h-[220px] rounded-2xl bg-black border border-[var(--pos-border)] overflow-hidden flex flex-col items-center justify-center p-4">
            <div id="pos-qr-reader" className={scannerActive ? 'w-full' : 'hidden'} />
            {!scannerActive && (
              <div className="text-center space-y-2">
                <QrCode className="w-10 h-10 mx-auto text-[#9CFF93]" />
                <p className="text-xs text-[#F3F4F6]">
                  Khung quét camera đang tắt. Bấm Mở camera hoặc nhập mã bên dưới.
                </p>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessQr();
            }}
            className="space-y-2"
          >
            <label
              htmlFor="pos-manual-qr"
              className="block text-xs font-semibold text-[var(--pos-text-main)]"
            >
              Nhập mã vé hoặc QR token
            </label>
            <div className="flex gap-2">
              <input
                id="pos-manual-qr"
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Dán mã QR hoặc mã đặt sân..."
                className="phanta-input flex-1 px-3 py-2 text-xs font-tabular"
              />
              <button
                type="submit"
                disabled={scanLoading || !manualToken.trim()}
                className="phanta-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{scanLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}</span>
              </button>
            </div>
          </form>

          {/* Check-in Result */}
          <div className="phanta-subcard p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--pos-text-heading)]">
                Kết quả tra cứu vé
              </span>
              {scanResult && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1"
                  style={
                    scanResult.status === 'SUCCESS'
                      ? {
                          backgroundColor: 'var(--pos-accent-soft)',
                          color: 'var(--pos-accent)',
                          borderColor: 'var(--pos-border)',
                        }
                      : {
                          backgroundColor: 'var(--pos-danger-soft)',
                          color: 'var(--pos-danger)',
                          borderColor: 'var(--pos-danger-border)',
                        }
                  }
                >
                  {scanResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{scanResult.status === 'SUCCESS' ? 'Hợp lệ' : 'Không hợp lệ'}</span>
                </span>
              )}
            </div>

            {!scanResult ? (
              <p className="text-xs text-[var(--pos-text-sub)]">
                Chưa có lượt quét nào trong phiên hiện tại.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-[var(--pos-text-main)]">{scanResult.message}</p>
                {scanResult.booking && (
                  <div className="space-y-1.5 pt-2 border-t border-[var(--pos-border-subtle)] font-tabular">
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--pos-text-sub)]">Mã đặt sân:</span>
                      <span className="font-bold text-[var(--pos-orange)]">
                        {scanResult.booking.bookingCode || scanResult.booking._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--pos-text-sub)]">Khách hàng:</span>
                      <span className="font-semibold text-[var(--pos-text-heading)]">
                        {scanResult.booking.customerName || scanResult.booking.userId?.fullName || 'Khách đặt lịch'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--pos-text-sub)]">Khung giờ:</span>
                      <span className="font-semibold text-[var(--pos-accent)]">
                        {scanResult.booking.startTime} - {scanResult.booking.endTime}
                      </span>
                    </div>
                  </div>
                )}

                {scanResult.status === 'SUCCESS' && scanResult.booking && (
                  <button
                    type="button"
                    onClick={() =>
                      openReceipt({
                        key: 'walkin',
                        title: 'PHIẾU XÁC NHẬN VÀO SÂN',
                        invoiceNo: scanResult.booking?.bookingCode || '#CHK-01',
                        customer: scanResult.booking?.customerName || 'Khách đã đặt trước',
                        method: 'Đã thanh toán trước',
                        items: [
                          {
                            name: `Giờ sân ${scanResult.booking?.startTime} - ${scanResult.booking?.endTime}`,
                            qty: 1,
                            price: scanResult.booking?.totalPrice || 0,
                          },
                        ],
                        subtotal: scanResult.booking?.totalPrice || 0,
                        total: scanResult.booking?.totalPrice || 0,
                        extraNote: 'Đã xác thực vào cổng thành công',
                      })
                    }
                    className="phanta-btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In phiếu vào sân</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right: Walk-in Quick Booking (7 Cols) */}
      <div className="lg:col-span-7">
        <form onSubmit={handleConfirmWalkin} className="phanta-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--pos-border-subtle)]">
            <div>
              <h2 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Đặt chỗ nhanh tại quầy (Walk-in)
              </h2>
              <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
                Dành cho khách đến trực tiếp - Thu tiền mặt hoặc chuyển khoản VietQR
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchSlots(selectedVenueId, bookingDate)}
              className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới giờ trống</span>
            </button>
          </div>

          {/* Step 1: Facility, Venue, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="walkin-facility" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                1. Cơ sở
              </label>
              <select
                id="walkin-facility"
                value={selectedFacilityId}
                onChange={(e) => {
                  setSelectedFacilityId(e.target.value);
                  setVenueQuery('');
                  setVenueDropdownOpen(false);
                }}
                className="phanta-input w-full px-3 py-2 text-xs"
              >
                {facilities.length === 0 && <option value="">Chưa có dữ liệu cơ sở</option>}
                {facilities.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative" ref={venueContainerRef}>
              <label htmlFor="walkin-venue" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                2. Sân thi đấu ({venues.length})
              </label>
              <button
                id="walkin-venue"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={venueDropdownOpen}
                onClick={() => setVenueDropdownOpen((v) => !v)}
                className="phanta-input w-full px-3 py-2 text-xs flex items-center justify-between gap-2 text-left"
              >
                <span className="truncate text-[var(--pos-text-heading)]">
                  {selectedVenueObj
                    ? `${selectedVenueObj.name} (${(
                        selectedVenueObj.defaultPrice ??
                        selectedVenueObj.basePricePerHour ??
                        0
                      ).toLocaleString('vi-VN')} đ)`
                    : 'Chưa có sân khả dụng'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 text-[var(--pos-text-sub)] transition-transform ${
                    venueDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {venueDropdownOpen && (
                <div className="absolute left-0 right-0 sm:w-[340px] sm:max-w-[85vw] top-full mt-1.5 z-40 phanta-card p-2 space-y-2 shadow-xl">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-[var(--pos-text-sub)] absolute left-2.5 pointer-events-none" />
                    <input
                      ref={venueSearchInputRef}
                      type="text"
                      value={venueQuery}
                      onChange={(e) => setVenueQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredVenues.length > 0) {
                          e.preventDefault();
                          setSelectedVenueId(filteredVenues[0]._id);
                          setVenueDropdownOpen(false);
                        }
                      }}
                      placeholder="Gõ tên sân để tìm nhanh..."
                      aria-label="Tìm nhanh sân thi đấu"
                      className="phanta-input w-full pl-8 pr-8 py-1.5 text-xs"
                    />
                    {venueQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setVenueQuery('');
                          venueSearchInputRef.current?.focus();
                        }}
                        aria-label="Xóa từ khóa tìm sân"
                        className="absolute right-2 p-0.5 text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1 text-[11px] text-[var(--pos-text-sub)] font-tabular">
                    <span>Kết quả phù hợp</span>
                    <span>
                      {filteredVenues.length}/{venues.length} sân
                    </span>
                  </div>

                  <div role="listbox" aria-label="Danh sách sân thi đấu" className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {filteredVenues.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[var(--pos-text-sub)]">
                        Không tìm thấy sân khớp &quot;{venueQuery}&quot;
                      </div>
                    ) : (
                      filteredVenues.map((v) => {
                        const isPicked = v._id === selectedVenueId;
                        const venuePrice = v.defaultPrice ?? v.basePricePerHour ?? 0;
                        const typeLabel = v.sportType || v.venueType || v.type;

                        return (
                          <button
                            key={v._id}
                            type="button"
                            role="option"
                            aria-selected={isPicked}
                            onClick={() => {
                              setSelectedVenueId(v._id);
                              setVenueDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between gap-2 ${
                              isPicked
                                ? 'bg-[var(--pos-accent-soft)] border-[var(--pos-accent)] text-[var(--pos-text-heading)] font-semibold'
                                : 'bg-[var(--pos-bg-card-inner)] border-transparent hover:border-[var(--pos-border)] text-[var(--pos-text-main)]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-[var(--pos-text-heading)]">{v.name}</div>
                              {typeLabel && (
                                <div className="text-[11px] text-[var(--pos-text-sub)] truncate">{typeLabel}</div>
                              )}
                            </div>
                            <span className="font-tabular font-semibold text-[11px] text-[var(--pos-accent)] shrink-0">
                              {venuePrice.toLocaleString('vi-VN')} đ
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="walkin-date" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                3. Ngày đặt
              </label>
              <input
                id="walkin-date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="phanta-input w-full px-3 py-2 text-xs font-tabular"
              />
            </div>
          </div>

          {/* Step 2: Slot Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--pos-text-main)]">4. Chọn khung giờ trống</span>
              <span className="text-[var(--pos-text-sub)] font-tabular">
                {slots.filter((s) => s.isAvailable).length} khung còn trống
              </span>
            </div>

            {slotsLoading ? (
              <div className="phanta-subcard p-6 text-center text-xs text-[var(--pos-text-sub)]">
                Đang tải lịch sân trống...
              </div>
            ) : slots.length === 0 ? (
              <div className="phanta-subcard p-6 text-center text-xs text-[var(--pos-text-sub)]">
                Không có khung giờ khả dụng cho ngày đã chọn.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {slots.map((slot) => {
                  const isBusy = !slot.isAvailable || slot.status !== 'AVAILABLE';
                  const isPast = slot.status === 'PAST';
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
                  const busyLabel = isPast
                    ? 'Đã qua giờ'
                    : slot.status === 'MAINTENANCE'
                    ? 'Bảo trì'
                    : 'Đã đặt';

                  return (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      disabled={isBusy}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                        isPast
                          ? 'opacity-45 cursor-not-allowed bg-[var(--pos-bg-card-inner)] border-[var(--pos-border-subtle)] text-[var(--pos-text-sub)]'
                          : isBusy
                          ? 'opacity-55 cursor-not-allowed bg-[var(--pos-danger-soft)] border-[var(--pos-danger-border)] text-[var(--pos-danger)]'
                          : isSelected
                          ? 'bg-[var(--pos-accent-soft)] border-[var(--pos-accent)] text-[var(--pos-text-heading)] font-bold'
                          : 'bg-[var(--pos-bg-card-inner)] border-[var(--pos-border-subtle)] hover:border-[var(--pos-accent)] text-[var(--pos-text-heading)]'
                      }`}
                    >
                      <div className="font-tabular font-semibold">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="text-[11px] font-tabular mt-0.5 text-[var(--pos-text-sub)]">
                        {isBusy ? busyLabel : `${(slot.price || 0).toLocaleString('vi-VN')} đ`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="walkin-name" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                Tên khách vãng lai
              </label>
              <input
                id="walkin-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Anh Tuấn - FC Phố Đô"
                className="phanta-input w-full px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="walkin-phone" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                Số điện thoại
              </label>
              <input
                id="walkin-phone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0912345678"
                className="phanta-input w-full px-3 py-2 text-xs font-tabular"
              />
            </div>
          </div>

          {/* Step 4: Payment & Total */}
          <div className="phanta-subcard p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--pos-text-sub)]">Phương thức thanh toán</div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--pos-text-heading)] font-semibold">
                  <input
                    type="radio"
                    name="walkin-pay"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                  />
                  <span>Tiền mặt tại quầy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[var(--pos-text-heading)] font-semibold">
                  <input
                    type="radio"
                    name="walkin-pay"
                    checked={paymentMethod === 'VIETQR'}
                    onChange={() => setPaymentMethod('VIETQR')}
                  />
                  <span>Chuyển khoản VietQR</span>
                </label>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-[var(--pos-text-sub)]">Tổng thu tại quầy</div>
              <div className="font-barlow font-extrabold text-2xl text-[var(--pos-accent)] font-tabular">
                {walkinPrice.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={walkinSubmitting || !selectedSlot}
            className="phanta-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
          >
            <Printer className="w-4 h-4" />
            <span>{walkinSubmitting ? 'Đang tạo đơn...' : 'Thu tiền và in phiếu 80mm'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
