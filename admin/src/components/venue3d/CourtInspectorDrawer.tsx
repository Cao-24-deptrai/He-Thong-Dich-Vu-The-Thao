'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, Lightbulb } from 'lucide-react';
import { VenueItem, VenueSlot, createInitialSlotsForVenue } from './venuesData';

interface CourtInspectorDrawerProps {
  venue: VenueItem | null;
  isOpen: boolean;
  onClose: () => void;
  lightsOn: boolean;
  onToggleLights: () => void;
}

const DATES = ['Hôm nay', 'Ngày mai', 'Thứ 2', 'Thứ 3', 'Thứ 4'];

const ADDONS = [
  { id: 'ball', label: 'Bóng FIFA', price: 50000 },
  { id: 'bibs', label: 'Bộ áo bib (14)', price: 30000 },
  { id: 'water', label: 'Thùng nước', price: 60000 },
  { id: 'referee', label: 'Trọng tài', price: 200000 },
];

export default function CourtInspectorDrawer({
  venue,
  isOpen,
  onClose,
  lightsOn,
  onToggleLights,
}: CourtInspectorDrawerProps) {
  const [slotsByVenue, setSlotsByVenue] = useState<Record<string, VenueSlot[]>>({});
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingType, setBookingType] = useState('VIP');
  const [paymentPolicy, setPaymentPolicy] = useState('PAID');
  const [note, setNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!venue) return;
    setSlotsByVenue((prev) => {
      if (prev[venue.id]) return prev;
      return { ...prev, [venue.id]: createInitialSlotsForVenue(venue) };
    });
    setSelectedSlotId(null);
    setSelectedAddons([]);
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setToastMessage(null);
  }, [venue?.id]);

  if (!venue) return null;

  const currentSlots = slotsByVenue[venue.id] || createInitialSlotsForVenue(venue);
  const selectedSlot = currentSlots.find((s) => s.id === selectedSlotId) || null;

  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const found = ADDONS.find((a) => a.id === id);
    return sum + (found ? found.price : 0);
  }, 0);

  const totalPrice = (selectedSlot ? selectedSlot.price : 0) + addonsTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) {
      setToastMessage('Vui lòng chọn khung giờ trống trước khi xác nhận');
      return;
    }
    if (!customerName.trim()) {
      setToastMessage('Vui lòng nhập tên đối tác hoặc khách hàng');
      return;
    }

    setSlotsByVenue((prev) => ({
      ...prev,
      [venue.id]: currentSlots.map((s) =>
        s.id === selectedSlot.id
          ? {
              ...s,
              status: paymentPolicy === 'HELD' ? 'HELD' : 'BOOKED',
              bookedBy: customerName.trim(),
            }
          : s
      ),
    }));

    setToastMessage(
      `Đã ghi nhận ${selectedSlot.time} cho ${customerName.trim()} - Tổng ${totalPrice.toLocaleString('vi-VN')} đ`
    );
    setSelectedSlotId(null);
  };

  return (
    <div
      id="court-drawer"
      className={`fixed top-0 right-0 h-full w-[420px] max-w-[95vw] bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-[115%]'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--accent-badge)] text-[var(--pitch-green)] inline-block">
            {venue.categoryLabel}
          </span>
          <h3 className="font-heading font-bold text-base text-[var(--text-heading)] mt-1 leading-snug">
            {venue.name}
          </h3>
          <p className="text-[11px] text-[var(--text-sub)] mt-0.5">{venue.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng thông tin"
          className="p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--accent-badge)] shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
        {/* Prices */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)]">
          <div>
            <div className="text-[10px] text-[var(--text-sub)]">Giá giờ thường</div>
            <div className="text-sm font-bold font-heading text-[var(--text-heading)] tabular-nums">
              {venue.basePrice.toLocaleString('vi-VN')} đ/h
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-sub)]">Giá giờ vàng</div>
            <div className="text-sm font-bold font-heading text-[var(--pitch-green)] tabular-nums">
              {venue.peakPrice.toLocaleString('vi-VN')} đ/h
            </div>
          </div>
        </div>

        {/* Lighting Control */}
        <div className="p-3 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-heading)] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[var(--burnt-orange-light)]" />
            Dàn đèn LED sân
          </span>
          <button
            type="button"
            onClick={onToggleLights}
            className="px-3 py-1 rounded-lg bg-[var(--accent-badge)] text-[var(--pitch-green)] font-bold text-[11px]"
          >
            {lightsOn ? 'Đang bật' : 'Đang tắt'}
          </button>
        </div>

        {/* Date Selector */}
        <div>
          <div className="text-[10px] font-bold text-[var(--text-sub)] mb-1.5">
            Chọn ngày thi đấu
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DATES.map((d, idx) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDateIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${
                  selectedDateIdx === idx
                    ? 'bg-[var(--accent-badge)] border-[var(--pitch-green)] text-[var(--pitch-green)]'
                    : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] text-[var(--text-sub)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Slot Matrix */}
        <div>
          <div className="text-xs font-bold text-[var(--text-heading)] mb-2 flex items-center justify-between">
            <span>Lưới khung giờ (90 phút)</span>
            <span className="text-xs font-heading text-[var(--pitch-green)] font-bold">
              {selectedSlot ? selectedSlot.time : 'Chưa chọn'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {currentSlots.map((slot) => {
              const isAvailable = slot.status === 'AVAILABLE';
              const isSelected = selectedSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    !isAvailable
                      ? 'opacity-60 cursor-not-allowed bg-[var(--bg-card)] border-[var(--border-subtle)]'
                      : isSelected
                      ? 'bg-[var(--accent-badge)] border-[var(--pitch-green)]'
                      : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] hover:border-[var(--pitch-green)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-heading font-bold text-xs text-[var(--text-heading)] tabular-nums">
                      {slot.time}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        slot.status === 'AVAILABLE'
                          ? 'bg-emerald-500/15 text-[var(--pitch-green)]'
                          : slot.status === 'HELD'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {slot.status === 'AVAILABLE'
                        ? 'Trống'
                        : slot.status === 'HELD'
                        ? 'Giữ chỗ'
                        : 'Đã đặt'}
                    </span>
                  </div>
                  <div className="text-[11px] font-heading font-bold text-[var(--text-sub)] mt-1 tabular-nums">
                    {slot.price.toLocaleString('vi-VN')} đ
                    {slot.isPeak ? ' - Giờ vàng' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Addons */}
        <div className="p-3 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-heading)]">
              Dịch vụ đi kèm (Tùy chọn)
            </span>
            <span className="text-[10px] text-[var(--text-sub)]">Cộng vào hóa đơn</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ADDONS.map((addon) => {
              const checked = selectedAddons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--pitch-green)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAddon(addon.id)}
                    className="rounded w-3.5 h-3.5 accent-emerald-600"
                  />
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold text-[var(--text-heading)]">
                      {addon.label}
                    </div>
                    <div className="text-[10px] text-[var(--pitch-green)] font-bold tabular-nums">
                      +{addon.price.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Admin Booking Form */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-heading)]">
              Nghiệp vụ đặt dịch vụ (Admin)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[var(--accent-badge)] text-[var(--pitch-green)]">
              QUẢN TRỊ VIÊN
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-sub)] mb-1">
              Tên đối tác / khách hàng / đội bóng *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="VD: FC Techcombank - Anh Hoàng"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pitch-green)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-sub)] mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0908 123 456"
                className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pitch-green)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-sub)] mb-1">
                Phân loại nghiệp vụ
              </label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="w-full px-2 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--pitch-green)]"
              >
                <option value="VIP">Khách hội viên VIP</option>
                <option value="CONTRACT">Hợp đồng doanh nghiệp</option>
                <option value="MAINTENANCE">Khóa lịch bảo trì</option>
                <option value="INTERNAL">Nội bộ - Huấn luyện</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-sub)] mb-1">
              Chính sách & trạng thái thanh toán
            </label>
            <select
              value={paymentPolicy}
              onChange={(e) => setPaymentPolicy(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--pitch-green)]"
            >
              <option value="PAID">Đã thu chuyển khoản - Ghi nhận sổ cái</option>
              <option value="DEPOSIT">Đã đặt cọc 50%</option>
              <option value="HELD">Giữ chỗ chờ xác nhận (SLA 2 giờ)</option>
              <option value="SPONSORED">Miễn phí theo hợp đồng tài trợ</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-sub)] mb-1">
              Ghi chú điều hành
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Bật dàn đèn sớm 15 phút - Xuất hóa đơn công ty"
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pitch-green)]"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div>
              <div className="text-[10px] text-[var(--text-sub)]">Tổng chi phí dự tính</div>
              <div className="text-[9px] text-[var(--text-muted)]">Gồm slot & phụ phí</div>
            </div>
            <div className="text-base font-extrabold font-heading text-[var(--pitch-green)] tabular-nums">
              {totalPrice.toLocaleString('vi-VN')} đ
            </div>
          </div>

          {toastMessage && (
            <div className="p-2.5 rounded-lg bg-[var(--accent-badge)] border border-[var(--pitch-green)] text-[11px] font-semibold text-[var(--text-heading)]">
              {toastMessage}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
        <button
          type="button"
          onClick={handleConfirmBooking}
          className="w-full py-2.5 phanta-btn-primary text-xs flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Xác nhận đặt / giữ dịch vụ</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 phanta-btn-secondary text-xs"
        >
          Đóng bảng thông tin
        </button>
      </div>
    </div>
  );
}
