// admin/src/app/walk-in/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  CalendarPlus, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Building2,
  Layers,
  Banknote
} from 'lucide-react';
import { api, Facility, Venue, SlotAvailability } from '@/lib/api';

export default function WalkInBookingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  // Date selection (defaults to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Slots availability
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load facilities
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
      setSelectedVenueId('');
      return;
    }
    const loadVenues = async () => {
      try {
        const vList = await api.getVenues(selectedFacilityId);
        setVenues(vList);
        if (vList.length > 0) {
          setSelectedVenueId(vList[0]._id);
        } else {
          setSelectedVenueId('');
        }
      } catch (err: any) {
        console.error(err);
      }
    };
    loadVenues();
  }, [selectedFacilityId]);

  // Load availability when venue or date changes
  const loadAvailability = async () => {
    if (!selectedVenueId || !selectedDate) return;
    try {
      setLoadingSlots(true);
      setConflictError(null);
      setGeneralError(null);
      const res = await api.getVenueAvailability(selectedVenueId, selectedDate);
      setSlots(res.slots || []);
      // Reset selected slot if no longer available
      setSelectedSlot(null);
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || 'Không thể tải lịch sân');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [selectedVenueId, selectedDate]);

  // Handle Walk-in Booking
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId || !selectedSlot) {
      alert('Vui lòng chọn khung giờ trước khi tiếp tục.');
      return;
    }

    setSubmitting(true);
    setConflictError(null);
    setGeneralError(null);
    setSuccessBooking(null);

    try {
      const res = await api.createWalkInBooking({
        venueId: selectedVenueId,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        customerName,
        customerPhone,
        paymentMethod,
        note,
      });

      setSuccessBooking(res);
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setNote('');
      setSelectedSlot(null);
      // Refresh slot list
      await loadAvailability();
    } catch (err: any) {
      console.error('Walk-in booking error:', err);
      // Check for SLOT_ALREADY_TAKEN_ONLINE error code (Mục 4.3)
      const errorData = err.data || {};
      if (
        err.status === 409 ||
        errorData.error === 'SLOT_ALREADY_TAKEN_ONLINE' ||
        (typeof errorData.message === 'string' && errorData.message.includes('online'))
      ) {
        setConflictError(
          '⚠️ CẢNH BÁO: Khung giờ này vừa được khách hàng đặt online qua ứng dụng! Không thể hoàn tất đặt tại quầy. Vui lòng chọn khung giờ khác hoặc liên hệ kiểm tra.'
        );
      } else {
        setGeneralError(err.message || 'Đặt sân tại quầy thất bại. Vui lòng thử lại.');
      }
      // Refresh slots
      loadAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarPlus className="w-7 h-7 text-blue-600" />
          Đặt Sân Tại Quầy (Walk-in Booking)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Mục 4.3: Dành cho lễ tân tiếp nhận khách vãng lai, tự động khóa giữ chỗ tức thì và cảnh báo xung đột nếu trùng khách online.
        </p>
      </div>

      {/* Conflict Alert Banner (Mục 4.3) */}
      {conflictError && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-800 shadow-lg shadow-rose-500/10 flex items-start gap-3.5 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-base text-rose-900">XUNG ĐỘT ĐẶT CHỖ (SLOT_ALREADY_TAKEN_ONLINE)</h3>
            <p className="text-sm font-medium mt-1 leading-relaxed text-rose-800">
              {conflictError}
            </p>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Success Banner */}
      {successBooking && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-sm flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-base text-emerald-900">
                Đặt sân tại quầy thành công!
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                Mã booking: <strong className="font-mono">{successBooking._id || successBooking.bookingCode}</strong> | 
                Khung giờ: <strong>{successBooking.startTime} - {successBooking.endTime}</strong> | 
                Tổng tiền: <strong>{successBooking.totalPrice?.toLocaleString('vi-VN')} đ</strong> (Đã xác nhận thanh toán tại quầy)
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessBooking(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Selection Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            Chọn Cơ Sở
          </label>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            {facilities.map((fac) => (
              <option key={fac._id} value={fac._id}>
                {fac.name} ({fac.sportType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Chọn Sân Con
          </label>
          <select
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            disabled={venues.length === 0}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white disabled:bg-slate-100"
          >
            {venues.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} - {(v.defaultPrice ?? (v as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Ngày Đặt Sân
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Main Booking Interface: Slots Grid on Left, Walk-in Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Time Slots Grid */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Lưới Khung Giờ (06:00 - 22:00)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhấp vào ô giờ còn trống để chọn đặt
              </p>
            </div>
            <button
              onClick={loadAvailability}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 text-xs"
              title="Làm mới lịch sân"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
              <span>Cập nhật</span>
            </button>
          </div>

          {loadingSlots ? (
            <div className="p-12 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Đang tải sơ đồ khung giờ...
            </div>
          ) : slots.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Không có dữ liệu khung giờ cho ngày đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                let bgClass = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer';
                let badge = <span className="text-[10px] text-emerald-600 font-semibold">Còn trống</span>;

                if (slot.status === 'HELD') {
                  bgClass = 'bg-amber-50/70 border-amber-200 text-amber-800 cursor-not-allowed opacity-75';
                  badge = <span className="text-[10px] text-amber-700 font-semibold">Đang giữ chỗ</span>;
                } else if (slot.status === 'CONFIRMED') {
                  bgClass = 'bg-rose-50 border-rose-200 text-rose-800 cursor-not-allowed opacity-75';
                  badge = <span className="text-[10px] text-rose-700 font-semibold">Đã có người</span>;
                } else if (slot.status === 'PAST') {
                  bgClass = 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed';
                  badge = <span className="text-[10px] text-slate-400 font-semibold">Đã qua</span>;
                }

                if (isSelected) {
                  bgClass = 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600 cursor-pointer';
                  badge = <span className="text-[10px] text-blue-100 font-semibold">Đang chọn</span>;
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-20 ${bgClass}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{slot.startTime}</span>
                      {badge}
                    </div>
                    <div className="text-[11px] font-mono font-medium">
                      {slot.price.toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-50 border border-slate-300" />
              <span>Trống (Có thể đặt)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
              <span>Đang giữ chỗ (HELD)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
              <span>Đã đặt (CONFIRMED)</span>
            </div>
          </div>
        </div>

        {/* Right: Walk-in Booking Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Thông Tin Khách Hàng Tại Quầy
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Khách vãng lai thanh toán trực tiếp tại quầy
            </p>
          </div>

          <form onSubmit={handleWalkInSubmit} className="space-y-4">
            {/* Slot summary */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
                Khung giờ được chọn:
              </div>
              {selectedSlot ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-950">
                    {selectedDate} | {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                  <span className="text-sm font-bold text-blue-700 font-mono">
                    {selectedSlot.price.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ) : (
                <span className="text-xs text-blue-600 italic">
                  Vui lòng nhấp chọn 1 ô giờ trống bên trái
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Họ và Tên khách hàng *
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Anh Nam"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Số điện thoại liên hệ *
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Hình thức thanh toán tại quầy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Tiền mặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Chuyển khoản / QR</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Ghi chú (Tùy chọn)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thu tiền trước, mượn bóng, áo pitch..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition"
            >
              {submitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Đang xử lý đặt sân...</span>
                </div>
              ) : (
                <span>Xác Nhận Đặt Chỗ Tại Quầy</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
