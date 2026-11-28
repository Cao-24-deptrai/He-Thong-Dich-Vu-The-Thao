// admin/src/app/checkin/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Calendar,
  Clock,
  Layers,
  Search,
  Zap,
  ShieldCheck,
  Radio,
  Phone,
  Check,
  FileText,
  X,
} from 'lucide-react';
import { api, Booking } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

const playCheckinSound = (status: 'SUCCESS' | 'INVALID') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (status === 'SUCCESS') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'MANUAL'>('SCANNER');

  const [scannerActive, setScannerActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'INVALID';
    message: string;
    booking?: Booking;
    bookingCode?: string;
    ticketCode?: string;
    errorDetail?: string;
    checkinMethod?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);

  const [selectedBookingForCheckin, setSelectedBookingForCheckin] = useState<any | null>(null);
  const [manualNote, setManualNote] = useState('Khách hết pin điện thoại, đã xác minh SĐT');
  const [submittingManual, setSubmittingManual] = useState(false);

  const [socketConnected, setSocketConnected] = useState(false);
  const [recentLiveCheckin, setRecentLiveCheckin] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'reader';
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('booking_checked_in', (data: any) => {
      const bannerText = `${data.customerName || 'Khách'} vừa check-in: ${data.venueName || 'Sân'} (${data.startTime} - ${data.endTime})`;
      setRecentLiveCheckin(bannerText);

      setLookupResults((prev) =>
        prev.map((item) =>
          item.id === data.bookingId
            ? { ...item, isCheckedIn: true, checkedInAt: data.checkedInAt, checkinMethod: data.checkinMethod }
            : item
        )
      );

      setTimeout(() => {
        setRecentLiveCheckin(null);
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleProcessQr = async (token: string) => {
    if (!token || loading) return;
    setLoading(true);
    setScanResult(null);

    let cleanToken = token.trim();
    if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanToken);
        cleanToken = parsed.qrToken || parsed.token || cleanToken;
      } catch (e) {}
    }

    try {
      const res = await api.scanCheckin(cleanToken);
      playCheckinSound('SUCCESS');
      setScanResult({
        status: 'SUCCESS',
        message: res.message || 'Check-in thành công. Khách được phép vào sân.',
        booking: res.booking,
        bookingCode: (res as any).bookingCode || res.booking?.bookingCode,
        ticketCode: (res as any).ticketCode,
        checkinMethod: 'QR',
      });
      setManualToken('');
    } catch (err: any) {
      console.error('Checkin scan error:', err);
      playCheckinSound('INVALID');
      const errorMsg = err.message || 'Mã QR không hợp lệ hoặc đã hết hạn';
      setScanResult({
        status: 'INVALID',
        message: 'Check-in thất bại',
        errorDetail: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleProcessQr(decodedText);
        },
        () => {}
      );
      setScannerActive(true);
    } catch (err) {
      console.error('Failed to start camera scanner:', err);
      alert('Không thể mở camera trình duyệt. Vui lòng cấp quyền truy cập camera hoặc dùng chế độ nhập mã thủ công.');
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setLookupSearched(true);
    try {
      const results = await api.lookupCheckinBookings(searchQuery.trim(), searchDate);
      setLookupResults(results);
    } catch (err: any) {
      console.error('Lookup checkin error:', err);
      alert('Lỗi tra cứu đơn đặt: ' + (err.message || 'Không thể kết nối máy chủ'));
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmManualCheckin = async () => {
    if (!selectedBookingForCheckin) return;
    setSubmittingManual(true);
    try {
      const res = await api.manualCheckin(selectedBookingForCheckin.id, manualNote);
      playCheckinSound('SUCCESS');

      setLookupResults((prev) =>
        prev.map((item) =>
          item.id === selectedBookingForCheckin.id
            ? { ...item, isCheckedIn: true, checkedInAt: res.checkedInAt, checkinMethod: 'MANUAL' }
            : item
        )
      );

      setScanResult({
        status: 'SUCCESS',
        message: `Check-in thủ công thành công cho khách ${res.customerName || selectedBookingForCheckin.customerName}.`,
        booking: res.booking,
        bookingCode: res.bookingCode || selectedBookingForCheckin.bookingCode,
        ticketCode: res.ticketCode || selectedBookingForCheckin.ticketCode,
        checkinMethod: 'MANUAL',
      });

      setSelectedBookingForCheckin(null);
    } catch (err: any) {
      console.error('Manual checkin error:', err);
      playCheckinSound('INVALID');
      alert('Lỗi check-in thủ công: ' + (err.message || 'Đơn đã check-in hoặc không hợp lệ'));
    } finally {
      setSubmittingManual(false);
    }
  };

  const quickNotes = [
    'Khách hết pin điện thoại, đã xác minh SĐT',
    'Khách quên / hỏng điện thoại, xác minh CCCD',
    'Điện thoại mất kết nối 4G / không mở được QR',
    'Check-in trực tiếp tại quầy theo yêu cầu',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Trạm soát vé & Quét check-in QR</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Xác thực mã QR vé đặt sân và hỗ trợ check-in thủ công tại quầy cho khách hàng
          </p>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border w-fit ${
            socketConnected
              ? 'bg-emerald-500/10 text-[var(--pitch-green)] border-emerald-500/30'
              : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)] border-[var(--border-subtle)]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>{socketConnected ? 'Đồng bộ trực tiếp' : 'Chế độ tiêu chuẩn'}</span>
        </div>
      </div>

      {/* Live Checkin Notification */}
      {recentLiveCheckin && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] text-xs font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{recentLiveCheckin}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => setActiveTab('SCANNER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'SCANNER'
              ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
          }`}
        >
          <Camera className="w-4 h-4" strokeWidth={1.75} />
          <span>Quét camera QR</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('MANUAL');
            stopScanner();
            if (lookupResults.length === 0) {
              handleLookup();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'MANUAL'
              ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
          }`}
        >
          <FileText className="w-4 h-4" strokeWidth={1.75} />
          <span>Check-in thủ công</span>
        </button>
      </div>

      {/* Result Card */}
      {scanResult && (
        <div
          className={`phanta-card p-6 border ${
            scanResult.status === 'SUCCESS'
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-rose-500/50 bg-rose-500/5'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {scanResult.status === 'SUCCESS' ? (
                <div className="w-11 h-11 rounded-xl bg-[var(--pitch-green)] text-[#0C0F0C] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" strokeWidth={1.75} />
                </div>
              )}
              <div>
                <h2 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2">
                  <span>{scanResult.status === 'SUCCESS' ? 'Xác thực thành công' : 'Vé không hợp lệ'}</span>
                  {scanResult.status === 'SUCCESS' && scanResult.checkinMethod && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-500/15 text-[var(--pitch-green)] border border-emerald-500/30">
                      {scanResult.checkinMethod}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  {scanResult.status === 'SUCCESS' ? scanResult.message : scanResult.errorDetail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="phanta-btn-secondary px-3 py-1.5 text-xs"
            >
              Đóng
            </button>
          </div>

          {scanResult.status === 'SUCCESS' && scanResult.booking && (
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="phanta-subcard p-3.5">
                <span className="text-[11px] text-[var(--text-sub)] flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Khách hàng</span>
                </span>
                <span className="font-semibold text-[var(--text-heading)] block truncate text-sm">
                  {scanResult.booking.customerName || scanResult.booking.userId?.fullName || 'Khách hàng'}
                </span>
                <span className="text-xs tabular-nums text-[var(--text-sub)]">
                  {scanResult.booking.customerPhone || scanResult.booking.userId?.phone || 'N/A'}
                </span>
              </div>

              <div className="phanta-subcard p-3.5">
                <span className="text-[11px] text-[var(--text-sub)] flex items-center gap-1 mb-1">
                  <Layers className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Sân & Mã vé</span>
                </span>
                <span className="font-semibold text-[var(--text-heading)] block truncate text-sm">
                  {scanResult.booking.venueId?.name || 'Sân thể thao'}
                </span>
                <span className="text-xs text-[var(--pitch-green)] tabular-nums font-medium">
                  {scanResult.ticketCode || scanResult.bookingCode || `#${scanResult.booking._id.slice(-6).toUpperCase()}`}
                </span>
              </div>

              <div className="phanta-subcard p-3.5">
                <span className="text-[11px] text-[var(--text-sub)] flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Khung giờ thi đấu</span>
                </span>
                <span className="font-heading font-semibold text-[var(--text-heading)] tabular-nums block text-sm">
                  {scanResult.booking.startTime} - {scanResult.booking.endTime}
                </span>
                <span className="text-xs text-[var(--text-sub)] tabular-nums">
                  {scanResult.booking.bookingDate ? new Date(scanResult.booking.bookingDate).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>

              <div className="phanta-subcard p-3.5">
                <span className="text-[11px] text-[var(--text-sub)] flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Giờ vào cổng</span>
                </span>
                <span className="font-heading font-semibold text-[var(--pitch-green)] tabular-nums block text-sm">
                  {scanResult.booking.checkedInAt
                    ? new Date(scanResult.booking.checkedInAt).toLocaleTimeString('vi-VN')
                    : 'Vừa xong'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Đã ghi nhận vào sân</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: CAMERA SCANNER */}
      {activeTab === 'SCANNER' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 phanta-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="font-heading font-semibold text-[var(--text-heading)] text-base flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Camera quét trực tiếp</span>
              </h2>
              {!scannerActive ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="phanta-btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Bật camera quét</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-3.5 py-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded-xl text-xs font-medium hover:bg-rose-500/20 transition-colors"
                >
                  Tắt camera
                </button>
              )}
            </div>

            <div className="relative min-h-[300px] bg-[var(--bg-card-inner)] rounded-xl overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />

              {!scannerActive && (
                <div className="text-center p-8 space-y-3 z-10">
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--pitch-green)]">
                    <QrCode className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-heading)]">Camera chưa được kích hoạt</p>
                  <p className="text-xs text-[var(--text-sub)] max-w-xs mx-auto">
                    Chọn &quot;Bật camera quét&quot; ở trên hoặc nhập mã vé ở khung bên phải để xác thực
                  </p>
                </div>
              )}
            </div>

            <div className="phanta-subcard p-3.5 text-xs text-[var(--text-sub)] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
              <span>Mã QR vé điện tử có hiệu lực làm mới theo chu kỳ 60 giây để ngăn chặn việc sử dụng ảnh chụp màn hình cũ.</span>
            </div>
          </div>

          <div className="md:col-span-5 phanta-card p-6 space-y-4">
            <div className="pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="font-heading font-semibold text-[var(--text-heading)] text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Nhập mã vé thủ công</span>
              </h2>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Dành cho trường hợp camera bị mờ hoặc cần kiểm tra nhanh
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
                  Chuỗi mã vé điện tử
                </label>
                <textarea
                  rows={5}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Dán chuỗi mã vé QR của khách hàng tại đây"
                  className="w-full p-3 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)] tabular-nums resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleProcessQr(manualToken)}
                disabled={loading || !manualToken.trim()}
                className="phanta-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực mã</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>Xác thực vé và check-in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL CHECK-IN & LOOKUP */}
      {activeTab === 'MANUAL' && (
        <div className="space-y-6">
          <div className="phanta-card p-6">
            <form onSubmit={handleLookup} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Tìm theo SĐT, tên khách hoặc mã đơn</span>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập SĐT khách, tên khách hoặc mã đơn"
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Ngày đặt sân</span>
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={searching}
                  className="phanta-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang tìm</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" strokeWidth={1.75} />
                      <span>Tra cứu danh sách</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="phanta-card overflow-hidden">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-[var(--text-heading)] text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Danh sách đơn đặt hợp lệ ({lookupResults.length})</span>
                </h3>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Dành cho khách hàng hết pin hoặc gặp sự cố kết nối, lễ tân đối chiếu thông tin và xác nhận
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleLookup()}
                className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                <span>Làm mới</span>
              </button>
            </div>

            {lookupResults.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-sub)]">
                <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[var(--text-heading)]">
                  {lookupSearched ? 'Không tìm thấy đơn đặt nào phù hợp' : 'Nhấn "Tra cứu danh sách" để hiển thị các đơn đặt hôm nay'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Đơn cần check-in phải ở trạng thái đã thanh toán
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--table-head-bg)] text-[var(--text-sub)] font-medium border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="py-3 px-4">Mã đơn / Vé</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Sân thi đấu</th>
                      <th className="py-3 px-4">Khung giờ</th>
                      <th className="py-3 px-4 text-right">Tổng tiền</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {lookupResults.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                        <td className="py-3 px-4 tabular-nums font-medium text-[var(--text-heading)]">
                          <div>{item.bookingCode || `#${item.id.slice(-6).toUpperCase()}`}</div>
                          {item.ticketCode && (
                            <div className="text-[11px] text-[var(--pitch-green)]">{item.ticketCode}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-heading)] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[var(--text-sub)]" strokeWidth={1.75} />
                            <span>{item.customerName}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-sub)] flex items-center gap-1 mt-0.5 tabular-nums">
                            <Phone className="w-3 h-3" strokeWidth={1.75} />
                            <span>{item.customerPhone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-main)]">{item.venueName}</td>
                        <td className="py-3 px-4 tabular-nums">
                          <div className="font-semibold text-[var(--text-heading)]">
                            {item.startTime} - {item.endTime}
                          </div>
                          <div className="text-[11px] text-[var(--text-sub)]">
                            {item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('vi-VN') : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-[var(--text-heading)]">
                          {Number(item.totalPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4">
                          {item.isCheckedIn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-[var(--pitch-green)] border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Đã vào sân{item.checkinMethod ? ` (${item.checkinMethod})` : ''}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 text-[var(--burnt-orange)] border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Chưa check-in</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.isCheckedIn ? (
                            <span className="text-[11px] tabular-nums text-[var(--text-sub)]">
                              {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString('vi-VN') : 'Đã check-in'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBookingForCheckin(item);
                                setManualNote('Khách hết pin điện thoại, đã xác minh SĐT');
                              }}
                              className="phanta-btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Xác nhận nhận sân</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHECK-IN THỦ CÔNG */}
      {selectedBookingForCheckin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="phanta-card p-6 max-w-lg w-full space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-color)] text-[var(--pitch-green)] flex items-center justify-center">
                  <FileText className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-[var(--text-heading)]">Xác nhận check-in thủ công</h3>
                  <p className="text-xs text-[var(--text-sub)]">Xác minh thông tin khách hàng tại quầy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckin(null)}
                className="text-[var(--text-sub)] hover:text-[var(--text-heading)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="phanta-subcard p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-sub)]">Khách hàng</span>
                <span className="font-semibold text-[var(--text-heading)]">
                  {selectedBookingForCheckin.customerName} ({selectedBookingForCheckin.customerPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-sub)]">Sân thi đấu</span>
                <span className="font-semibold text-[var(--pitch-green)]">{selectedBookingForCheckin.venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-sub)]">Khung giờ</span>
                <span className="tabular-nums font-semibold text-[var(--text-heading)]">
                  {selectedBookingForCheckin.startTime} - {selectedBookingForCheckin.endTime} (
                  {selectedBookingForCheckin.bookingDate ? new Date(selectedBookingForCheckin.bookingDate).toLocaleDateString('vi-VN') : ''})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-sub)]">Mã đặt chỗ</span>
                <span className="tabular-nums font-semibold text-[var(--pitch-green)]">
                  {selectedBookingForCheckin.bookingCode || selectedBookingForCheckin.id}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--text-sub)]">
                Lý do check-in thủ công
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickNotes.map((qNote) => (
                  <button
                    key={qNote}
                    type="button"
                    onClick={() => setManualNote(qNote)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      manualNote === qNote
                        ? 'bg-[var(--bg-card-inner)] text-[var(--pitch-green)] border-[var(--pitch-green)]'
                        : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    {qNote}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Nhập ghi chú lý do lễ tân check-in thủ công"
                className="w-full p-3 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)] resize-none mt-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckin(null)}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingManual}
                onClick={handleConfirmManualCheckin}
                className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                {submittingManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xác nhận</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>Xác nhận vào sân</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
