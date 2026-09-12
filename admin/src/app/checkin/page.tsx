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
  Search
} from 'lucide-react';
import { api, Booking } from '@/lib/api';

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
      setScanResult({
        status: 'SUCCESS',
        message: res.message || 'Check-in thành công!',
        booking: res.booking,
      });
      // Clear manual input on success
      setManualToken('');
    } catch (err: any) {
      console.error('Checkin scan error:', err);
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
          // ignore scan frame misses
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
      } catch (e) {
        // ignore
      }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <QrCode className="w-7 h-7 text-blue-600" />
          Quét Check-in Vé Vào Sân
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Mục 4.2: Quét Dynamic QR Code từ điện thoại của khách hàng, xác thực mã JWT 60 giây và chống check-in trùng lặp.
        </p>
      </div>

      {/* Result Card: Displayed right at top for instant visibility */}
      {scanResult && (
        <div
          className={`p-6 rounded-2xl border-2 shadow-lg transition-all duration-300 animate-in fade-in zoom-in-95 ${
            scanResult.status === 'SUCCESS'
              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950'
              : 'bg-rose-50/90 border-rose-500 text-rose-950'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {scanResult.status === 'SUCCESS' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  {scanResult.status === 'SUCCESS' ? 'XÁC THỰC THÀNH CÔNG - HỢP LỆ VÀO SÂN' : 'VÉ KHÔNG HỢP LỆ'}
                </h2>
                <p className="text-sm font-medium mt-0.5 opacity-90">
                  {scanResult.status === 'SUCCESS' ? scanResult.message : scanResult.errorDetail}
                </p>
              </div>
            </div>

            <button
              onClick={() => setScanResult(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/80 hover:bg-white border shadow-xs transition"
            >
              Quét tiếp theo
            </button>
          </div>

          {/* Success Booking Details */}
          {scanResult.status === 'SUCCESS' && scanResult.booking && (
            <div className="mt-6 pt-5 border-t border-emerald-200/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Khách hàng
                </span>
                <span className="font-bold text-slate-900 block truncate">
                  {scanResult.booking.customerName || scanResult.booking.userId?.fullName || 'Khách hàng'}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {scanResult.booking.customerPhone || scanResult.booking.userId?.phone || 'N/A'}
                </span>
              </div>

              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Sân & Cơ sở
                </span>
                <span className="font-bold text-slate-900 block truncate">
                  {scanResult.booking.venueId?.name || 'Sân thể thao'}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">
                  Mã vé: {scanResult.booking.bookingCode || scanResult.booking._id.slice(-6).toUpperCase()}
                </span>
              </div>

              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Khung giờ chơi
                </span>
                <span className="font-bold text-slate-900 block">
                  {scanResult.booking.startTime} - {scanResult.booking.endTime}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {scanResult.booking.bookingDate}
                </span>
              </div>

              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Thời gian check-in
                </span>
                <span className="font-bold text-emerald-700 block">
                  {scanResult.booking.checkedInAt
                    ? new Date(scanResult.booking.checkedInAt).toLocaleTimeString('vi-VN')
                    : 'Vừa xong'}
                </span>
                <span className="text-xs text-slate-400">
                  Đã ghi nhận vào hệ thống
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Camera Scanner View */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              Camera Quét Trực Tiếp
            </h2>
            <div className="flex items-center gap-2">
              {!scannerActive ? (
                <button
                  onClick={startScanner}
                  className="inline-flex items-center px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs transition"
                >
                  <Camera className="w-3.5 h-3.5 mr-1" />
                  Mở Camera
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="inline-flex items-center px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-xs transition"
                >
                  Tắt Camera
                </button>
              )}
            </div>
          </div>

          <div className="relative bg-slate-900 rounded-2xl overflow-hidden min-h-[320px] flex items-center justify-center border border-slate-800">
            <div id={scannerContainerId} className="w-full h-full max-w-sm" />

            {!scannerActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950/90 text-white">
                <Camera className="w-12 h-12 text-slate-500 mb-3" />
                <p className="font-semibold text-sm">Camera hiện đang tắt</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Bấm &quot;Mở Camera&quot; bên trên để bật camera quét mã QR trên điện thoại khách hàng, hoặc dùng ô nhập mã bên phải.
                </p>
                <button
                  onClick={startScanner}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition"
                >
                  Bật Camera Ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Manual Input & Testing Section */}
        <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Nhập Mã QR Thủ Công
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dành cho trường hợp camera bị mờ, hoặc quét bằng máy quét mã vạch cầm tay
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessQr(manualToken);
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Chuỗi Dynamic QR Token (JWT)
              </label>
              <textarea
                rows={4}
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Dán chuỗi token hoặc quét mã barcode vào đây..."
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Đang xác thực mã...</span>
                </div>
              ) : (
                <span>Xác Thực Check-in</span>
              )}
            </button>
          </form>

          {/* Quick instructions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quy tắc Check-in Bảo Mật (Mục 3.4 & 4.2):
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-500">
              <li>Mã QR của khách hàng thay đổi định kỳ mỗi <strong>60 giây</strong> trên điện thoại.</li>
              <li>Chống chụp màn hình gửi cho người khác hoặc quét nhiều lần.</li>
              <li>Khi check-in thành công, trạng thái booking được đánh dấu <code>isCheckedIn = true</code>. Quét lại lần thứ 2 sẽ báo lỗi đỏ ngay lập tức.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
