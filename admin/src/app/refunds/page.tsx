// admin/src/app/refunds/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  DollarSign, 
  User, 
  Calendar, 
  Clock, 
  Layers, 
  Check,
  Search,
  ExternalLink,
  CreditCard,
  Zap,
  ArrowRight
} from 'lucide-react';
import { api, Booking } from '@/lib/api';

export default function RefundsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund modal states
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [refundNote, setRefundNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRefundList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRefundPending();
      setBookings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách hoàn tiền chờ xử lý');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefundList();
  }, []);

  const handleOpenRefundModal = (booking: any) => {
    setSelectedBooking(booking);
    const amt = booking.amount !== undefined ? booking.amount : (booking.refundAmount || booking.totalPrice || 0);
    setRefundNote(`Đã chuyển khoản hoàn tiền ${amt.toLocaleString('vi-VN')} đ cho khách qua STK ngân hàng`);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const bId = selectedBooking.bookingId || selectedBooking._id;
      await api.processRefund(bId, refundNote);
      setSuccessMessage(`Đã cập nhật hoàn tất hoàn tiền cho booking #${selectedBooking.bookingCode || bId}`);
      setSelectedBooking(null);
      setRefundNote('');
      await fetchRefundList();
    } catch (err: any) {
      alert('Lỗi cập nhật hoàn tiền: ' + (err.message || 'Thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoRefund = async (booking: any) => {
    const bookingId = booking._id || booking.bookingId;
    if (!confirm(`Bạn có chắc chắn muốn HOÀN TIỀN TỰ ĐỘNG qua cổng thanh toán cho booking #${bookingId}?`)) return;

    setSubmitting(true);
    try {
      await api.autoRefund(bookingId, 'Admin kích hoạt hoàn tiền tự động qua cổng thanh toán');
      setSuccessMessage(`Đã hoàn tiền tự động thành công qua cổng thanh toán cho booking #${bookingId}`);
      await fetchRefundList();
    } catch (err: any) {
      alert('Lỗi hoàn tiền tự động: ' + (err.message || 'Thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-[var(--burnt-orange)]" strokeWidth={1.75} />
            <span>Xử lý & Đối soát hoàn tiền</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản lý và giải ngân cho các đơn khách hủy hợp lệ hoặc thanh toán muộn sau thời hạn giữ chỗ 10 phút
          </p>
        </div>

        <button
          onClick={fetchRefundList}
          className="phanta-btn-secondary px-3.5 py-2 flex items-center gap-2 text-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Tải lại danh sách</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            Đóng
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="phanta-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-base text-[var(--text-heading)] flex items-center gap-2">
            <span>Danh sách yêu cầu chờ duyệt hoàn tất</span>
            <span className="px-2 py-0.5 rounded-lg text-xs font-heading font-semibold bg-[var(--burnt-orange)]/15 text-[var(--burnt-orange)] border border-[var(--burnt-orange)]/30 tabular-nums">
              {bookings.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải danh sách giao dịch cần hoàn tiền...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-card-inner)] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-[var(--pitch-green)]" />
            </div>
            <h3 className="font-heading font-bold text-sm text-[var(--text-heading)]">Không có hồ sơ tồn đọng</h3>
            <p className="text-xs text-[var(--text-sub)] mt-1 max-w-sm">
              Tất cả giao dịch hoàn tiền hoặc cấn trừ tài khoản đã được xử lý xong và đối soát 100% khớp lệnh.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-sub)] font-medium">
                  <th className="pb-3 pl-2">Mã đơn / Khách hàng</th>
                  <th className="pb-3">Sân / Khung giờ</th>
                  <th className="pb-3">Số tiền hoàn</th>
                  <th className="pb-3">Lý do chờ hoàn</th>
                  <th className="pb-3 text-right pr-2">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bookings.map((booking) => {
                  const bId = booking.bookingId || booking._id;
                  const amt = booking.amount !== undefined ? booking.amount : (booking.refundAmount || booking.totalPrice || 0);

                  return (
                    <tr key={bId} className="hover:bg-[var(--bg-card-inner)]/50 transition">
                      <td className="py-3.5 pl-2">
                        <div className="font-heading font-bold text-[var(--text-heading)] tabular-nums">
                          #{booking.bookingCode || bId.substring(0, 8)}
                        </div>
                        <div className="text-[11px] text-[var(--text-sub)] mt-0.5 flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span>{booking.customerName || booking.userId?.fullName || 'Khách vãng lai'}</span>
                          <span>-</span>
                          <span>{booking.customerPhone || booking.userId?.phone || '0900000000'}</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-medium text-[var(--text-main)]">
                          {booking.venueName || booking.venueId?.name || 'Sân thể thao'}
                        </div>
                        <div className="text-[11px] text-[var(--text-sub)] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-heading tabular-nums">{booking.startTime || '17:30'} - {booking.endTime || '19:00'}</span>
                          <span>({booking.bookingDate || 'Hôm nay'})</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-heading font-semibold text-[var(--pitch-green)] text-sm tabular-nums">
                          {amt.toLocaleString('vi-VN')} đ
                        </div>
                        <span className="text-[10px] text-[var(--text-sub)] font-medium">Qua cổng / STK</span>
                      </td>

                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          <AlertCircle className="w-3 h-3" />
                          <span>{booking.refundReason || 'Thanh toán trễ quá 10 phút giữ chỗ'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAutoRefund(booking)}
                            disabled={submitting}
                            className="phanta-btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Hoàn tự động</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(booking)}
                            disabled={submitting}
                            className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Ghi chú thủ công</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Refund Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phanta-card max-w-md w-full p-6 space-y-4">
            <h3 className="font-heading font-bold text-lg text-[var(--text-heading)] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--pitch-green)]" />
              <span>Xác nhận duyệt hoàn tiền</span>
            </h3>

            <p className="text-xs text-[var(--text-sub)]">
              Vui lòng nhập ghi chú xác nhận đã chuyển khoản cho khách để cập nhật trạng thái sổ cái:
            </p>

            <form onSubmit={handleConfirmRefund} className="space-y-4">
              <textarea
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                rows={3}
                required
                className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                placeholder="Nhập mã giao dịch ngân hàng hoặc chi tiết hoàn tất..."
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="phanta-btn-secondary px-3.5 py-2 text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận hoàn tất</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
