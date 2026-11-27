'use client';

import React, { useEffect, useState } from 'react';
import { Printer, RefreshCw, X } from 'lucide-react';
import { api, CanteenShift, User } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

const DENOMINATIONS = [
  { key: '500000', value: 500000, label: '500.000 đ' },
  { key: '200000', value: 200000, label: '200.000 đ' },
  { key: '100000', value: 100000, label: '100.000 đ' },
  { key: '50000', value: 50000, label: '50.000 đ' },
  { key: '20000', value: 20000, label: '20.000 đ' },
  { key: '10000', value: 10000, label: '10.000 đ' },
  { key: '5000', value: 5000, label: '5.000 đ' },
  { key: '2000', value: 2000, label: '2.000 đ' },
  { key: '1000', value: 1000, label: '1.000 đ' },
];

export default function PosShiftPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<CanteenShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])),
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open new shift modal
  const [openModal, setOpenModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState(2000000);

  const loadShift = async () => {
    setLoading(true);
    try {
      const current = await api.getCurrentShift();
      setShift(current);
    } catch {
      setShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(api.getUser());
    loadShift();
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenModal(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const adjustDenom = (key: string, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  const setDenomExact = (key: string, val: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.floor(val) || 0),
    }));
  };

  const countedTotal = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.key] || 0) * d.value, 0);
  const theoreticalCash = shift?.openingCash ?? 0;
  const difference = countedTotal - theoreticalCash;

  const autoMatchTheoretical = () => {
    let remaining = Math.round(theoreticalCash / 1000) * 1000;
    const next: Record<string, number> = {};
    for (const d of DENOMINATIONS) {
      next[d.key] = Math.floor(remaining / d.value);
      remaining %= d.value;
    }
    setCounts(next);
    showToast('Đã phân bổ mệnh giá', 'Khớp tổng tiền kiểm đếm theo quỹ đầu ca.');
  };

  const resetCounts = () => {
    setCounts(Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])));
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.openShift(openingCashInput);
      setOpenModal(false);
      await loadShift();
      window.dispatchEvent(new CustomEvent('phanta-shift-updated'));
      showToast('Mở ca thành công', `Đã khai báo quỹ đầu ca ${openingCashInput.toLocaleString('vi-VN')} đ`);
    } catch (err: any) {
      showToast('Không thể mở ca', err.message || 'Kiểm tra lại trạng thái ca', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    setSubmitting(true);
    try {
      await api.closeShift(shift._id, countedTotal);
      const shiftCode = `#CA-${shift._id.slice(-6).toUpperCase()}`;

      openReceipt({
        key: 'shift',
        title: 'BIÊN BẢN BÀN GIAO VÀ ĐỐI SOÁT CA',
        invoiceNo: shiftCode,
        customer: `Thu ngân ${user?.fullName || 'Nhân viên'} bàn giao quản lý`,
        method: 'Kiểm đếm 9 mệnh giá tiền mặt',
        items: [
          { name: 'Quỹ tiền mặt đầu ca', qty: 1, price: shift.openingCash },
          { name: 'Tiền mặt thực tế kiểm đếm', qty: 1, price: countedTotal },
          { name: `Chênh lệch két (${difference >= 0 ? '+' : ''}${difference.toLocaleString('vi-VN')} đ)`, qty: 1, price: difference },
        ],
        subtotal: theoreticalCash,
        total: countedTotal,
        tendered: countedTotal,
        change: difference,
        extraNote: notes.trim() || 'Đã chốt ca và đóng két tiền mặt',
      });

      resetCounts();
      setNotes('');
      await loadShift();
      window.dispatchEvent(new CustomEvent('phanta-shift-updated'));
      showToast('Chốt ca thành công', `Biên bản ${shiftCode} đã được lưu trên hệ thống.`);
    } catch (err: any) {
      showToast('Không thể chốt ca', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-barlow font-extrabold text-xl text-[var(--pos-text-heading)] uppercase">
            Biên bản bàn giao ca và đối soát két tiền
          </h2>
          <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
            Kiểm đếm 9 mệnh giá tiền polymer VNĐ - Đối soát két và in biên bản 80mm
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadShift}
            className="phanta-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
          {!loading && !shift && (
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="phanta-btn-primary px-4 py-2 text-xs"
            >
              Mở ca mới
            </button>
          )}
        </div>
      </div>

      {/* Shift Banner */}
      <section className="phanta-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--pos-text-sub)] uppercase">
              Phiên thu ngân:
            </span>
            <span className="text-xs font-bold font-tabular text-[var(--pos-accent)] px-2 py-0.5 rounded bg-[var(--pos-accent-soft)] border border-[var(--pos-border)]">
              {shift?._id ? `#CA-${shift._id.slice(-6).toUpperCase()}` : 'CHƯA MỞ CA'}
            </span>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
              style={
                shift
                  ? {
                      backgroundColor: 'var(--pos-accent-soft)',
                      color: 'var(--pos-accent)',
                      borderColor: 'var(--pos-border)',
                    }
                  : {
                      backgroundColor: 'var(--pos-warning-soft)',
                      color: 'var(--pos-warning)',
                      borderColor: 'var(--pos-warning-border)',
                    }
              }
            >
              {shift ? 'Đang mở ca' : 'Đang đóng'}
            </span>
          </div>
          <div className="text-xs text-[var(--pos-text-main)]">
            Thu ngân: <strong className="text-[var(--pos-text-heading)]">{user?.fullName || 'Nhân viên'}</strong>
            {' - '}
            {shift?.openedAt || shift?.createdAt
              ? `Mở lúc ${new Date(shift.openedAt || shift.createdAt || '').toLocaleString('vi-VN')}`
              : 'Chưa có phiên làm việc đang mở'}
          </div>
        </div>

        <div className="sm:text-right">
          <div className="text-xs text-[var(--pos-text-sub)]">Quỹ tiền mặt đầu ca</div>
          <div className="font-barlow font-extrabold text-2xl text-[var(--pos-text-heading)] font-tabular">
            {(shift?.openingCash ?? 0).toLocaleString('vi-VN')} đ
          </div>
        </div>
      </section>

      {/* 7:5 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 9 Denominations (7 Cols) */}
        <section className="lg:col-span-7 phanta-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--pos-border-subtle)]">
            <div>
              <h3 className="font-barlow font-extrabold text-sm text-[var(--pos-text-heading)] uppercase">
                Bảng kiểm đếm 9 mệnh giá tiền mặt thực tế
              </h3>
              <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
                Nhập số lượng tờ theo từng mệnh giá để tự động cộng tổng két
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={autoMatchTheoretical}
                className="font-semibold text-[var(--pos-accent)] hover:underline"
              >
                Khớp nhanh
              </button>
              <button
                type="button"
                onClick={resetCounts}
                className="font-semibold text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                Đặt lại bằng 0
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {DENOMINATIONS.map((d, idx) => {
              const qty = counts[d.key] || 0;
              const sub = qty * d.value;
              const isLast = idx === DENOMINATIONS.length - 1;
              return (
                <div
                  key={d.key}
                  className={`phanta-subcard p-3 flex items-center justify-between gap-2 ${
                    isLast ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div>
                    <div className="font-bold text-[var(--pos-text-heading)] font-tabular">{d.label}</div>
                    <div className="text-[11px] font-tabular font-semibold text-[var(--pos-accent)]">
                      = {sub.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustDenom(d.key, -1)}
                      aria-label={`Giảm mệnh giá ${d.label}`}
                      className="phanta-btn-secondary w-7 h-7 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      aria-label={`Số tờ ${d.label}`}
                      value={qty}
                      onChange={(e) => setDenomExact(d.key, Number(e.target.value))}
                      className="phanta-input w-14 py-1 text-center text-xs font-tabular font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => adjustDenom(d.key, 1)}
                      aria-label={`Tăng mệnh giá ${d.label}`}
                      className="phanta-btn-secondary w-7 h-7 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDenom(d.key, 5)}
                      aria-label={`Cộng 5 tờ ${d.label}`}
                      className="phanta-btn-secondary px-2 h-7 text-[11px] font-bold text-[var(--pos-accent)]"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Reconciliation Summary (5 Cols) */}
        <section className="lg:col-span-5 phanta-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h3 className="font-barlow font-extrabold text-sm text-[var(--pos-text-heading)] uppercase pb-3 border-b border-[var(--pos-border-subtle)]">
              Kết quả đối soát két tiền
            </h3>

            <div className="space-y-2.5 text-xs font-tabular">
              <div className="flex justify-between">
                <span className="text-[var(--pos-text-sub)]">Quỹ tiền mặt đầu ca:</span>
                <span className="font-semibold text-[var(--pos-text-heading)]">
                  {theoreticalCash.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--pos-text-sub)]">Thực tế kiểm đếm:</span>
                <span className="font-bold text-[var(--pos-accent)]">
                  {countedTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="phanta-subcard p-3 flex items-center justify-between font-bold text-sm">
                <span className="text-[var(--pos-text-heading)]">Chênh lệch:</span>
                <span
                  style={{
                    color:
                      difference === 0
                        ? 'var(--pos-accent)'
                        : difference > 0
                        ? 'var(--pos-warning)'
                        : 'var(--pos-danger)',
                  }}
                >
                  {difference >= 0 ? '+' : '-'}
                  {Math.abs(difference).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="shift-notes" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5">
                Ghi chú bàn giao ca
              </label>
              <textarea
                id="shift-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú hoặc giải trình nếu có chênh lệch..."
                className="phanta-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!shift || submitting}
            onClick={handleCloseShift}
            className="phanta-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{submitting ? 'Đang chốt ca...' : 'Xác nhận chốt ca và in biên bản 80mm'}</span>
          </button>
        </section>
      </div>

      {/* Open Shift Modal */}
      {openModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-shift-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenModal(false);
          }}
        >
          <form onSubmit={handleOpenShift} className="w-full max-w-md phanta-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <h3 id="open-shift-title" className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Mở ca thu ngân mới
              </h3>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                aria-label="Đóng cửa sổ mở ca"
                className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label htmlFor="opening-cash" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1.5">
                Tiền mặt quỹ đầu ca (VNĐ)
              </label>
              <input
                id="opening-cash"
                type="number"
                min={0}
                step={50000}
                required
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(Math.max(0, Number(e.target.value) || 0))}
                className="phanta-input w-full px-3.5 py-2.5 text-sm font-tabular font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="phanta-btn-primary flex-1 py-2.5 text-xs"
              >
                {submitting ? 'Đang mở ca...' : 'Xác nhận mở ca'}
              </button>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="phanta-btn-secondary px-4 py-2.5 text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
