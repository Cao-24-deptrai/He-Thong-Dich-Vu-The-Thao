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
  CreditCard
} from 'lucide-react';
import { api, Booking } from '@/lib/api';

export default function RefundsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
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

  const handleOpenRefundModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setRefundNote(`Đã chuyển khoản hoàn tiền ${booking.totalPrice?.toLocaleString('vi-VN')} đ cho khách qua STK ngân hàng`);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      await api.processRefund(selectedBooking._id, refundNote);
      setSuccessMessage(`Đã cập nhật hoàn tất hoàn tiền cho booking #${selectedBooking._id}`);
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
      await api.autoRefund(bookingId, 'Admin kích hoạt hoàn tiền tự động qua cổng thanh toán (Mục 6.5)');
      setSuccessMessage(`Đã hoàn tiền tự động thành công qua cổng thanh toán cho booking #${bookingId}`);
      await fetchRefundList();
    } catch (err: any) {
      alert('Lỗi hoàn tiền tự động: ' + (err.message || 'Thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-blue-600" />
            Xử Lý Hoàn Tiền Chờ Xử Lý (REFUND_PENDING)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mục 4.4: Quản lý các giao dịch khách thanh toán muộn (sau khi slot đã quá hạn giữ chỗ 10 phút), cần hoàn tiền thủ công.
          </p>
        </div>

        <button
          onClick={fetchRefundList}
          className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Tải lại danh sách
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 underline font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">Danh sách cần hoàn tiền</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {bookings.length} yêu cầu
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Tự động tạo bởi Late Webhook Handler (Mục 3.2)
          </p>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Đang kiểm tra danh sách hoàn tiền...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-base text-slate-800">Tuyệt vời! Không có giao dịch nào đang chờ hoàn tiền.</p>
            <p className="text-xs text-slate-400 mt-1">
              Tất cả các khoản thanh toán đều hợp lệ hoặc các booking quá hạn đã được đối soát xử lý xong.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Mã Booking</th>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4">Sân & Thời gian</th>
                  <th className="py-3.5 px-4">Số tiền cần hoàn</th>
                  <th className="py-3.5 px-4">Lý do</th>
                  <th className="py-3.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-4 font-mono font-bold text-xs text-blue-600">
                      #{b.bookingCode || b._id.slice(-8)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">
                        {b.customerName || b.userId?.fullName || 'Khách vãng lai'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {b.customerPhone || b.userId?.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-900">
                        {b.venueId?.name || 'Sân thể thao'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {b.bookingDate} ({b.startTime} - {b.endTime})
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-rose-600 font-mono text-sm">
                        {b.totalPrice?.toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        Thanh toán trễ (Late Webhook)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAutoRefund(b)}
                          disabled={submitting}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs transition disabled:opacity-50"
                          title="Tự động gọi cổng thanh toán hoàn tiền"
                        >
                          ⚡ Auto-Refund
                        </button>
                        <button
                          onClick={() => handleOpenRefundModal(b)}
                          disabled={submitting}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Thủ công
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Xác Nhận Hoàn Tiền Thủ Công
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Xác nhận bạn đã chuyển khoản hoàn lại số tiền cho khách hàng thành công.
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-900">
                  {selectedBooking.customerName || selectedBooking.userId?.fullName || 'Khách hàng'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-mono text-slate-900">
                  {selectedBooking.customerPhone || selectedBooking.userId?.phone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền cần hoàn:</span>
                <span className="font-bold text-rose-600 font-mono text-sm">
                  {selectedBooking.totalPrice?.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Ghi chú hoàn tiền (Mã GD ngân hàng / UNC) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Nhập mã giao dịch chuyển tiền hoàn lại cho khách..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !refundNote.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {submitting ? 'Đang lưu...' : 'Hoàn tất hoàn tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
