// admin/src/app/checkin/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  Calendar, 
  Clock, 
  Layers,
  Sparkles,
  Search,
  Zap,
  ShieldCheck,
  Radio,
  Phone,
  Check,
  FileText
} from 'lucide-react';
import { api, Booking } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

// Web audio checkin chime
const playCheckinSound = (status: 'SUCCESS' | 'INVALID') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (status === 'SUCCESS') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
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

  // Scanner states
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

  // Manual Check-in lookup states (US-041)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);

  // Manual Check-in confirmation modal
  const [selectedBookingForCheckin, setSelectedBookingForCheckin] = useState<any | null>(null);
  const [manualNote, setManualNote] = useState('Khách hết pin điện thoại, đã xác minh SĐT');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Real-time live status
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentLiveCheckin, setRecentLiveCheckin] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'reader';
  const socketRef = useRef<Socket | null>(null);

  // WebSocket Live Sync
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
      const bannerText = `⚡ ${data.customerName || 'Khách'} vừa check-in: ${data.venueName || 'Sân'} (${data.startTime} - ${data.endTime})`;
      setRecentLiveCheckin(bannerText);

      // Tự động cập nhật dòng tương ứng trong bảng nếu đang mở tra cứu
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

  // Process a QR token (from camera or manual input)
  const handleProcessQr = async (token: string) => {
    if (!token || loading) return;
    setLoading(true);
    setScanResult(null);

    try {
      const res = await api.scanCheckin(token.trim());
      playCheckinSound('SUCCESS');
      setScanResult({
        status: 'SUCCESS',
        message: res.message || 'Check-in thành công! Khách được phép vào sân.',
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
        message: 'CHECK-IN THẤT BẠI',
        errorDetail: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  // Start html5-qrcode scanner
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
        () => {
          // ignore misses
        }
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

  // Handle Lookup Bookings (US-041)
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

  // Execute Manual Check-in (US-041)
  const handleConfirmManualCheckin = async () => {
    if (!selectedBookingForCheckin) return;
    setSubmittingManual(true);
    try {
      const res = await api.manualCheckin(selectedBookingForCheckin.id, manualNote);
      playCheckinSound('SUCCESS');

      // Update in results table
      setLookupResults((prev) =>
        prev.map((item) =>
          item.id === selectedBookingForCheckin.id
            ? { ...item, isCheckedIn: true, checkedInAt: res.checkedInAt, checkinMethod: 'MANUAL' }
            : item
        )
      );

      // Show result card
      setScanResult({
        status: 'SUCCESS',
        message: `Check-in thủ công thành công cho khách ${res.customerName || selectedBookingForCheckin.customerName}!`,
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <QrCode className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Trạm Soát Vé & Quét Check-in QR
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  EPIC E05
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Xác thực Dynamic QR 60s chống gian lận, chống race condition quét trùng và hỗ trợ Check-in thủ công ngoại lệ (US-041)
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Live Socket Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              socketConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${socketConnected ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{socketConnected ? 'Live Socket.io' : 'Live Sync'}</span>
          </div>
        </div>
      </div>

      {/* Realtime Live Checkin Notification Toast */}
      {recentLiveCheckin && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{recentLiveCheckin}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('SCANNER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'SCANNER'
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          Quét Camera QR (HUD Scanner)
        </button>

        <button
          onClick={() => {
            setActiveTab('MANUAL');
            stopScanner();
            if (lookupResults.length === 0) {
              handleLookup();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'MANUAL'
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Check-in Thủ Công Ngoại Lệ (US-041)
        </button>
      </div>

      {/* Result Card: Displayed right at top for instant visibility */}
      {scanResult && (
        <div
          className={`p-6 rounded-3xl border-2 shadow-2xl transition-all duration-300 backdrop-blur-md ${
            scanResult.status === 'SUCCESS'
              ? 'bg-emerald-950/40 border-emerald-400 text-white shadow-emerald-500/15'
              : 'bg-rose-950/40 border-rose-500 text-white shadow-rose-500/15'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              {scanResult.status === 'SUCCESS' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 font-black">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 font-black">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  {scanResult.status === 'SUCCESS' ? 'XÁC THỰC THÀNH CÔNG • VÉ HỢP LỆ' : 'VÉ KHÔNG HỢP LỆ'}
                  {scanResult.status === 'SUCCESS' && scanResult.checkinMethod && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {scanResult.checkinMethod}
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium mt-0.5 text-slate-300">
                  {scanResult.status === 'SUCCESS' ? scanResult.message : scanResult.errorDetail}
                </p>
              </div>
            </div>

            <button
              onClick={() => setScanResult(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Đóng kết quả
            </button>
          </div>

          {/* Success Booking Details */}
          {scanResult.status === 'SUCCESS' && scanResult.booking && (
            <div className="mt-6 pt-5 border-t border-emerald-500/20 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Khách hàng
                </span>
                <span className="font-extrabold text-white block truncate text-base">
                  {scanResult.booking.customerName || scanResult.booking.userId?.fullName || 'Khách hàng'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {scanResult.booking.customerPhone || scanResult.booking.userId?.phone || 'N/A'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Sân & Mã Vé
                </span>
                <span className="font-extrabold text-white block truncate text-base">
                  {scanResult.booking.venueId?.name || 'Sân thể thao'}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {scanResult.ticketCode || scanResult.bookingCode || `#${scanResult.booking._id.slice(-6).toUpperCase()}`}
                </span>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Khung giờ thi đấu
                </span>
                <span className="font-black text-cyan-400 font-mono block text-base">
                  {scanResult.booking.startTime} - {scanResult.booking.endTime}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {scanResult.booking.bookingDate ? new Date(scanResult.booking.bookingDate).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Giờ vào cổng
                </span>
                <span className="font-mono font-bold text-emerald-400 block text-base">
                  {scanResult.booking.checkedInAt
                    ? new Date(scanResult.booking.checkedInAt).toLocaleTimeString('vi-VN')
                    : 'Vừa xong'}
                </span>
                <span className="text-[10px] text-slate-500">
                  Đã khóa vé điện tử
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: HUD CAMERA SCANNER */}
      {activeTab === 'SCANNER' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Camera Scanner View */}
          <div className="md:col-span-7 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-black text-white text-base flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                Camera Quét Trực Tiếp (HUD Scanner)
              </h2>
              <div className="flex items-center gap-2">
                {!scannerActive ? (
                  <button
                    onClick={startScanner}
                    className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl text-xs font-black hover:from-emerald-700 hover:to-cyan-700 shadow-sm active:scale-95 transition"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    Bật Camera Quét
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="inline-flex items-center px-3.5 py-1.5 bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold hover:bg-rose-600/30 transition"
                  >
                    Tắt Camera
                  </button>
                )}
              </div>
            </div>

            {/* HTML5 QR Container */}
            <div className="relative min-h-[300px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />
              
              {!scannerActive && (
                <div className="text-center p-8 space-y-3 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-300">
                    Camera chưa được kích hoạt
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Nhấn &quot;Bật Camera Quét&quot; ở trên hoặc dùng ô nhập mã Token bên phải để xác thực vé.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Cơ chế bảo mật: Mã QR Dynamic JWT có hiệu lực 60s. Khách không thể sử dụng ảnh chụp màn hình cũ để gian lận vé.
              </span>
            </div>
          </div>

          {/* Manual Input Form on Right */}
          <div className="md:col-span-5 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5 backdrop-blur-md">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="font-black text-white text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                Nhập Mã Token Thủ Công
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dành cho trường hợp camera bị mờ hoặc kiểm thử nhanh
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Chuỗi Dynamic Token / JWT
                </label>
                <textarea
                  rows={5}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Dán chuỗi token mã hóa từ vé QR của khách hàng tại đây..."
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono resize-none"
                />
              </div>

              <button
                onClick={() => handleProcessQr(manualToken)}
                disabled={loading || !manualToken.trim()}
                className={`w-full py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 ${
                  loading || !manualToken.trim()
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực mã...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>XÁC THỰC VÉ & CHECK-IN NGAY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL CHECK-IN & LOOKUP (US-041) */}
      {activeTab === 'MANUAL' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
            <form onSubmit={handleLookup} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Tìm theo SĐT, Tên khách hoặc Mã Đơn / Vé
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập SĐT khách (VD: 0988...), tên khách, mã BK-... hoặc TCK-..."
                  className="w-full px-4 py-3 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Ngày đặt sân
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang tìm...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Tra cứu danh sách</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Results Table */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Danh Sách Đơn Đặt Hợp Lệ Cần Check-in ({lookupResults.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dành cho khách hàng hết pin hoặc gặp sự cố kết nối, lễ tân đối chiếu thông tin và bấm xác nhận
                </p>
              </div>

              <button
                onClick={() => handleLookup()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {lookupResults.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold text-slate-400">
                  {lookupSearched ? 'Không tìm thấy đơn đặt nào phù hợp với bộ lọc' : 'Nhấn "Tra cứu danh sách" để hiển thị các đơn đặt hôm nay'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Đơn cần check-in phải ở trạng thái ĐÃ THANH TOÁN (CONFIRMED)
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mã Đơn / Vé</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Sân thi đấu</th>
                      <th className="py-3 px-4">Khung giờ</th>
                      <th className="py-3 px-4">Tổng tiền</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {lookupResults.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <div>{item.bookingCode || `#${item.id.slice(-6).toUpperCase()}`}</div>
                          {item.ticketCode && (
                            <div className="text-[10px] text-cyan-400">{item.ticketCode}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {item.customerName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {item.customerPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {item.venueName}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-cyan-400">
                            {item.startTime} - {item.endTime}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('vi-VN') : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {Number(item.totalPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4">
                          {item.isCheckedIn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã vào sân
                              {item.checkinMethod && ` (${item.checkinMethod})`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              Chưa check-in
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.isCheckedIn ? (
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString('vi-VN') : 'Đã check-in'}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBookingForCheckin(item);
                                setManualNote('Khách hết pin điện thoại, đã xác minh SĐT');
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5 ml-auto"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Xác nhận nhận sân
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

      {/* MODAL XÁC NHẬN CHECK-IN THỦ CÔNG (US-041) */}
      {selectedBookingForCheckin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Xác Nhận Check-in Thủ Công</h3>
                  <p className="text-xs text-slate-400">Quy trình dự phòng ngoại lệ (US-041)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBookingForCheckin(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Booking Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-white">
                  {selectedBookingForCheckin.customerName} ({selectedBookingForCheckin.customerPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sân thi đấu:</span>
                <span className="font-bold text-cyan-400">{selectedBookingForCheckin.venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Khung giờ:</span>
                <span className="font-mono font-bold text-white">
                  {selectedBookingForCheckin.startTime} - {selectedBookingForCheckin.endTime} (
                  {selectedBookingForCheckin.bookingDate ? new Date(selectedBookingForCheckin.bookingDate).toLocaleDateString('vi-VN') : ''}
                  )
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã đặt chỗ:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedBookingForCheckin.bookingCode || selectedBookingForCheckin.id}
                </span>
              </div>
            </div>

            {/* Note & Quick Reasons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Lý do check-in thủ công:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickNotes.map((qNote) => (
                  <button
                    key={qNote}
                    type="button"
                    onClick={() => setManualNote(qNote)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                      manualNote === qNote
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
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
                placeholder="Nhập ghi chú chi tiết lý do lễ tân check-in thủ công..."
                className="w-full p-3 text-xs bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none mt-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckin(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingManual}
                onClick={handleConfirmManualCheckin}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
              >
                {submittingManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xác nhận...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận vào sân ngay</span>
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
