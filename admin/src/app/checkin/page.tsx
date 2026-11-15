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
  ShieldCheck
} from 'lucide-react';
import { api, Booking } from '@/lib/api';

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
  const [scannerActive, setScannerActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'INVALID';
    message: string;
    booking?: Booking;
    errorDetail?: string;
  } | null>(null);

  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'reader';

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
        (errorMessage) => {
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
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
                  HUD SCANNER
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Mục 4.2: Xác thực Dynamic QR Token 60s, kiểm tra vé hợp lệ và chống gian lận check-in trùng lặp
              </p>
            </div>
          </div>
        </div>
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
              Tiếp tục quét
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
                  Sân & Vị Trí
                </span>
                <span className="font-extrabold text-white block truncate text-base">
                  {scanResult.booking.venueId?.name || 'Sân thể thao'}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  Mã vé: #{(scanResult.booking.bookingCode || scanResult.booking._id).slice(-6).toUpperCase()}
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
                  {scanResult.booking.bookingDate?.split('T')[0]}
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

      {/* Main Scanner Section */}
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
    </div>
  );
}
