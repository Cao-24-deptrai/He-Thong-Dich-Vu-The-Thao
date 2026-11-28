'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { api, Booking } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

export default function PosRefundsPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [refundNote, setRefundNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const list = await api.getRefundPending();
      setBookings(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast('Không tải được danh sách hoàn tiền', err.message || 'Kiểm tra quyền tài khoản hoặc API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  useEffect(() => {
    const onSearch = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setSearch(custom.detail);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('phanta-pos-search', onSearch);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('phanta-pos-search', onSearch);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const code = String(b.bookingCode || b._id || '').toLowerCase();
      const name = String(b.customerName || b.userId?.fullName || '').toLowerCase();
      const phone = String(b.customerPhone || b.userId?.phone || '').toLowerCase();
      return code.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [bookings, search]);

  const totalPendingAmount = filtered.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const handleConfirmManualRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.processRefund(selected._id, refundNote.trim());
      openReceipt({
        key: 'refund',
        title: 'PHIẾU XÁC NHẬN HOÀN TIỀN',
        invoiceNo: `#REF-${selected._id.slice(-5).toUpperCase()}`,
        customer: `${selected.customerName || selected.userId?.fullName || 'Khách hàng'} (${selected.customerPhone || selected.userId?.phone || ''})`,
        method: 'Hoàn tiền theo đối soát',
        items: [
          {
            name: `Hoàn tiền đơn ${selected.bookingCode || selected._id.slice(-6)}`,
            qty: 1,
            price: selected.totalPrice || 0,
          },
        ],
        subtotal: selected.totalPrice || 0,
        total: selected.totalPrice || 0,
        extraNote: refundNote.trim() || 'Đã xử lý hoàn tiền tại quầy',
      });
      showToast('Hoàn tiền thành công', `Đã cập nhật trạng thái hoàn tiền cho đơn #${selected._id.slice(-6).toUpperCase()}`);
      setSelected(null);
      setRefundNote('');
      fetchRefunds();
    } catch (err: any) {
      showToast('Lỗi xử lý hoàn tiền', err.message || 'Không thể cập nhật trạng thái', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoRefund = async (booking: Booking) => {
    setSubmitting(true);
    try {
      await api.autoRefund(booking._id, 'Hoàn tiền tự động từ quầy POS');
      showToast('Đã gửi lệnh hoàn tự động', `Đơn #${booking._id.slice(-6).toUpperCase()} đang được cổng thanh toán xử lý.`);
      fetchRefunds();
    } catch (err: any) {
      showToast('Hoàn tự động thất bại', err.message || 'Thử xử lý hoàn thủ công', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="phanta-card p-4">
          <div className="text-xs text-[var(--pos-text-sub)]">Số đơn chờ hoàn tiền</div>
          <div className="font-barlow font-extrabold text-3xl text-[var(--pos-text-heading)] font-tabular mt-1">
            {filtered.length}
          </div>
        </div>
        <div className="phanta-card p-4">
          <div className="text-xs text-[var(--pos-text-sub)]">Tổng giá trị chờ xử lý</div>
          <div
            className="font-barlow font-extrabold text-3xl font-tabular mt-1"
            style={{ color: 'var(--pos-orange)' }}
          >
            {totalPendingAmount.toLocaleString('vi-VN')} đ
          </div>
        </div>
        <div className="phanta-card p-4 flex flex-col justify-between gap-2">
          <label htmlFor="refund-search" className="text-xs font-semibold text-[var(--pos-text-main)]">
            Tìm đơn hoàn tiền
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[var(--pos-text-sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="refund-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mã đơn, tên hoặc SĐT..."
                className="phanta-input w-full pl-8 pr-3 py-2 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={fetchRefunds}
              aria-label="Làm mới danh sách hoàn tiền"
              className="phanta-btn-secondary px-3 py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="phanta-card overflow-hidden">
        <div className="p-4 border-b border-[var(--pos-border-subtle)] flex items-center justify-between gap-2">
          <div>
            <h2 className="font-barlow font-extrabold text-sm text-[var(--pos-text-heading)] uppercase">
              Danh sách yêu cầu hoàn tiền (Refund Pending)
            </h2>
            <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
              Đối soát thông tin giao dịch trước khi xác nhận hoàn tiền hoặc gửi lệnh hoàn qua cổng
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--pos-table-head)] text-[var(--pos-text-sub)] uppercase border-b border-[var(--pos-border-subtle)]">
              <tr>
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Ngày và khung giờ</th>
                <th className="p-3 text-right">Số tiền hoàn</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pos-border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--pos-text-sub)]">
                    Đang tải danh sách hoàn tiền...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--pos-text-sub)]">
                    Không có đơn nào đang chờ hoàn tiền.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-[var(--pos-bg-card-inner)] transition-colors">
                    <td className="p-3 font-tabular font-bold text-[var(--pos-accent)]">
                      {b.bookingCode || `#${b._id.slice(-6).toUpperCase()}`}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[var(--pos-text-heading)]">
                        {b.customerName || b.userId?.fullName || 'Khách đặt lịch'}
                      </div>
                      <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                        {b.customerPhone || b.userId?.phone || 'Chưa có SĐT'}
                      </div>
                    </td>
                    <td className="p-3 font-tabular text-[var(--pos-text-main)]">
                      <div>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('vi-VN') : '-'}</div>
                      <div className="text-[11px] text-[var(--pos-text-sub)]">
                        {b.startTime} - {b.endTime}
                      </div>
                    </td>
                    <td
                      className="p-3 text-right font-tabular font-bold"
                      style={{ color: 'var(--pos-orange)' }}
                    >
                      {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                        style={{
                          backgroundColor: 'var(--pos-warning-soft)',
                          color: 'var(--pos-warning)',
                          borderColor: 'var(--pos-warning-border)',
                        }}
                      >
                        Chờ hoàn tiền
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(b);
                            setRefundNote(
                              `Đã hoàn ${(b.totalPrice || 0).toLocaleString('vi-VN')} đ cho khách`,
                            );
                          }}
                          className="phanta-btn-primary px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Hoàn thủ công</span>
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleAutoRefund(b)}
                          className="phanta-btn-secondary px-2.5 py-1 text-[11px]"
                        >
                          Hoàn qua cổng
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Refund Confirmation Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-modal-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <form onSubmit={handleConfirmManualRefund} className="w-full max-w-md phanta-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <h3 id="refund-modal-title" className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Xác nhận hoàn tiền đơn #{selected._id.slice(-6).toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng cửa sổ hoàn tiền"
                className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="phanta-subcard p-3.5 text-xs space-y-1.5 font-tabular">
              <div className="flex justify-between">
                <span className="text-[var(--pos-text-sub)]">Khách hàng:</span>
                <span className="font-semibold text-[var(--pos-text-heading)]">
                  {selected.customerName || selected.userId?.fullName || 'Khách'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--pos-text-sub)]">Số tiền hoàn:</span>
                <span className="font-bold text-[var(--pos-accent)]">
                  {(selected.totalPrice || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="refund-note" className="block text-xs font-semibold text-[var(--pos-text-main)] mb-1">
                Ghi chú đối soát hoàn tiền
              </label>
              <textarea
                id="refund-note"
                rows={3}
                required
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="phanta-input w-full px-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{submitting ? 'Đang lưu...' : 'Xác nhận và in phiếu'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
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
