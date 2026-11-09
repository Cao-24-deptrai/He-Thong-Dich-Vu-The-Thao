// admin/src/app/gym/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Dumbbell,
  Waves,
  QrCode,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  UserCheck,
  LogIn,
  LogOut,
  Sliders,
  RotateCcw,
  ShieldAlert,
  Users,
  Clock,
  Sparkles,
  Calendar,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

type TabType = 'GYM' | 'POOL' | 'PASSES';

export default function GymManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('GYM');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- DỮ LIỆU PHÒNG GYM ---
  const [gymCapacity, setGymCapacity] = useState<{
    insideCount: number;
    maxCapacity: number;
    isFull: boolean;
    occupancyPercentage: number;
    availableSpots: number;
  }>({
    insideCount: 0,
    maxCapacity: 100,
    isFull: false,
    occupancyPercentage: 0,
    availableSpots: 100,
  });
  const [turnstileLogs, setTurnstileLogs] = useState<any[]>([]);
  const [gymPlans, setGymPlans] = useState<any[]>([]);

  // Mô phỏng quét cửa xoay Gym
  const [gymScanInput, setGymScanInput] = useState('');
  const [gymScanDirection, setGymScanDirection] = useState<'IN' | 'OUT'>('IN');
  const [gymScanSubmitting, setGymScanSubmitting] = useState(false);
  const [gymScanResult, setGymScanResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Modal ghi đè số đếm Gym (Override)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideCount, setOverrideCount] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // --- DỮ LIỆU HỒ BƠI ---
  const [poolStatus, setPoolStatus] = useState<any>({
    pools: {
      POOL_50M: { code: 'POOL_50M', name: 'Hồ Olympic 50m', maxCapacity: 80, currentOccupancy: 0, status: 'OPEN' },
      POOL_25M: { code: 'POOL_25M', name: 'Hồ Khởi Động 25m', maxCapacity: 40, currentOccupancy: 0, status: 'OPEN' },
    },
    prices: {
      ADULT: 25000,
      CHILD: 20000,
    },
  });

  // Soát vé hồ bơi
  const [poolTicketInput, setPoolTicketInput] = useState('');
  const [selectedPoolForScan, setSelectedPoolForScan] = useState<'POOL_50M' | 'POOL_25M'>('POOL_50M');
  const [poolScanSubmitting, setPoolScanSubmitting] = useState(false);
  const [poolScanResult, setPoolScanResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Modal Đóng hồ đột xuất (AC-87)
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyPoolCode, setEmergencyPoolCode] = useState<'POOL_50M' | 'POOL_25M'>('POOL_50M');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<{
    refundedTicketsCount: number;
    totalRefundAmount: number;
    message: string;
  } | null>(null);

  // --- DỮ LIỆU THẺ TẬP HỘI VIÊN (Tương thích ngược) ---
  const [passes, setPasses] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [legacyCheckinInput, setLegacyCheckinInput] = useState('');
  const [legacyCheckinSubmitting, setLegacyCheckinSubmitting] = useState(false);
  const [legacyCheckinResult, setLegacyCheckinResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Tải dữ liệu toàn hệ thống
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      // 1. Tải Gym Capacity & Logs & Plans
      const [capRes, logsRes, plansRes, poolRes, passesRes] = await Promise.allSettled([
        api.getGymCapacity(),
        api.getGymTurnstileLogs(15),
        api.getGymPlans(),
        api.getPoolStatus(),
        api.getAllGymPasses(),
      ]);

      if (capRes.status === 'fulfilled' && capRes.value) {
        setGymCapacity(capRes.value);
        setOverrideCount(capRes.value.insideCount || 0);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value) {
        setTurnstileLogs(logsRes.value);
      }
      if (plansRes.status === 'fulfilled' && plansRes.value) {
        setGymPlans(plansRes.value);
      }
      if (poolRes.status === 'fulfilled' && poolRes.value) {
        setPoolStatus(poolRes.value);
      }
      if (passesRes.status === 'fulfilled' && passesRes.value) {
        setPasses(passesRes.value);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Gym & Pool:', err);
    } finally {
      if (!isSilent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Tự động làm mới số đếm mỗi 10 giây
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ==========================================
  // XỬ LÝ PHÒNG GYM
  // ==========================================

  // Quét cửa xoay Gym mô phỏng
  const handleGymScan = async (direction: 'IN' | 'OUT') => {
    const qrCode = gymScanInput.trim();
    if (!qrCode) return;

    setGymScanSubmitting(true);
    setGymScanResult(null);

    try {
      const res = await api.scanGymTurnstile({
        qrCode,
        direction,
        gateId: 'GATE_MAIN_01',
      });

      setGymScanResult({
        success: true,
        message:
          direction === 'IN'
            ? `Cửa xoay ĐÃ MỞ (VÀO)! Hội viên: ${res.user?.fullName || 'Hội viên'} | Số người hiện tại: ${res.insideCount}/100`
            : `Cửa xoay ĐÃ MỞ (RA)! Chào tạm biệt hội viên | Số người hiện tại: ${res.insideCount}/100`,
        details: res,
      });
      setGymScanInput('');
      loadData(true);
    } catch (err: any) {
      let friendlyMsg = err.message || 'Quét cửa xoay thất bại!';
      if (friendlyMsg.includes('GYM_CAPACITY_FULL')) {
        friendlyMsg = 'Phòng Gym đã đạt sức chứa tối đa 100 người (BR-29, AC-31). Cửa xoay tự động chặn vào!';
      } else if (friendlyMsg.includes('RECENTLY_SCANNED')) {
        friendlyMsg = 'Cảnh báo chống quét trùng: Mã QR vừa quét cùng chiều trong vòng 5 phút (BR-30, AC-32).';
      } else if (friendlyMsg.includes('PASS_EXPIRED')) {
        friendlyMsg = 'Thẻ tập đã hết hạn. Vui lòng gia hạn để mở cửa xoay (AC-70).';
      }
      setGymScanResult({
        success: false,
        message: friendlyMsg,
      });
    } finally {
      setGymScanSubmitting(false);
    }
  };

  // Ghi đè số đếm thủ công (Override - BR-29)
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh số đếm thủ công!');
      return;
    }

    setOverrideSubmitting(true);
    try {
      await api.overrideGymCapacity({
        count: Number(overrideCount),
        reason: overrideReason.trim(),
      });
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi điều chỉnh số đếm');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Reset số đếm về 0 (Manual reset / 23:00)
  const handleResetCapacity = async () => {
    if (!confirm('Bạn có chắc chắn muốn reset bộ đếm phòng Gym về 0?')) return;
    try {
      await api.resetGymCapacity();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi reset bộ đếm');
    }
  };

  // ==========================================
  // XỬ LÝ HỒ BƠI
  // ==========================================

  // Soát vé bơi vào cổng
  const handlePoolScan = async () => {
    const ticketCode = poolTicketInput.trim();
    if (!ticketCode) return;

    setPoolScanSubmitting(true);
    setPoolScanResult(null);

    try {
      const res = await api.scanPoolTicket({
        ticketCode,
        poolCode: selectedPoolForScan,
      });

      setPoolScanResult({
        success: true,
        message: `Soát vé thành công! Vé ${res.ticket?.ticketType === 'ADULT' ? 'Người lớn' : 'Trẻ em'} đã vào ${
          res.pool?.name
        }. Số người trong hồ: ${res.pool?.currentOccupancy}/${res.pool?.maxCapacity}`,
        details: res,
      });
      setPoolTicketInput('');
      loadData(true);
    } catch (err: any) {
      let friendlyMsg = err.message || 'Soát vé bơi thất bại!';
      if (friendlyMsg.includes('POOL_CAPACITY_FULL')) {
        friendlyMsg = `Hồ bơi đã đạt sức chứa tối đa (${
          selectedPoolForScan === 'POOL_50M' ? '80' : '40'
        } người). Vui lòng đợi khách ra bớt!`;
      } else if (friendlyMsg.includes('POOL_CURRENTLY_CLOSED')) {
        friendlyMsg = 'Hồ bơi này hiện đang đóng cửa đột xuất hoặc bảo trì!';
      } else if (friendlyMsg.includes('TICKET_ALREADY_USED')) {
        friendlyMsg = 'Vé này đã được quét sử dụng trước đó (mỗi vé chỉ có giá trị 1 lượt theo BR-31).';
      }
      setPoolScanResult({
        success: false,
        message: friendlyMsg,
      });
    } finally {
      setPoolScanSubmitting(false);
    }
  };

  // Khách rời hồ bơi (Check-out giải phóng sức chứa)
  const handlePoolCheckout = async (poolCode: 'POOL_50M' | 'POOL_25M') => {
    try {
      const res = await api.checkoutPool({ poolCode });
      alert(`Đã ghi nhận 1 khách rời ${poolCode === 'POOL_50M' ? 'Hồ 50m' : 'Hồ 25m'}. Số người hiện tại: ${res.currentOccupancy}`);
      loadData(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi check-out hồ bơi');
    }
  };

  // Đóng hồ đột xuất kèm hoàn tiền 100% (AC-87)
  const handleEmergencyClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyReason.trim()) {
      alert('Vui lòng nhập lý do đóng hồ đột xuất!');
      return;
    }

    setEmergencySubmitting(true);
    setEmergencyResult(null);

    try {
      const res = await api.emergencyClosePool({
        poolCode: emergencyPoolCode,
        reason: emergencyReason.trim(),
      });

      setEmergencyResult({
        refundedTicketsCount: res.refundedTicketsCount,
        totalRefundAmount: res.totalRefundAmount,
        message: `Đã đóng ${emergencyPoolCode === 'POOL_50M' ? 'Hồ Olympic 50m' : 'Hồ Khởi Động 25m'} thành công. Kích hoạt hủy và hoàn 100% tiền cho ${
          res.refundedTicketsCount
        } vé chưa quét trong ngày (Tổng hoàn: ${res.totalRefundAmount.toLocaleString('vi-VN')} đ) theo quy định AC-87.`,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đóng hồ đột xuất');
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Mở lại hồ bơi
  const handleReopenPool = async (poolCode: 'POOL_50M' | 'POOL_25M') => {
    if (!confirm(`Bạn có chắc muốn mở lại ${poolCode === 'POOL_50M' ? 'Hồ 50m' : 'Hồ 25m'} đón khách?`)) return;
    try {
      await api.reopenPool({ poolCode });
      alert(`Đã mở lại hồ bơi thành công!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi mở lại hồ');
    }
  };

  // ==========================================
  // XỬ LÝ THẺ TẬP CŨ (TƯƠNG THÍCH NGƯỢC)
  // ==========================================
  const handleLegacyCheckin = async (targetId?: string) => {
    const id = targetId || legacyCheckinInput.trim();
    if (!id) return;

    setLegacyCheckinSubmitting(true);
    setLegacyCheckinResult(null);
    try {
      const payload = id.length > 30 ? { qrToken: id } : { passId: id };
      const res = await api.checkInGymPass(payload);
      setLegacyCheckinResult({
        success: true,
        message: `Check-in thành công: ${res.user?.fullName || 'Hội viên'} - Còn lại: ${res.remainingCheckIns} lượt`,
      });
      setLegacyCheckinInput('');
      loadData(true);
    } catch (err: any) {
      setLegacyCheckinResult({
        success: false,
        message: err.message || 'Check-in thất bại!',
      });
    } finally {
      setLegacyCheckinSubmitting(false);
    }
  };

  const filteredPasses = passes.filter((p) => {
    if (!searchPhone) return true;
    const phone = p.userId?.phone || '';
    const name = p.userId?.fullName || '';
    return phone.includes(searchPhone) || name.toLowerCase().includes(searchPhone.toLowerCase());
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Điều Hành */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                Trung Tâm Điều Hành Gym & Hồ Bơi
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Epic E11 (M10)
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Kiểm soát bộ đếm 100 người, cửa xoay 2 chiều & phân hệ vé bơi theo lượt (BR-26 đến BR-31, AC-87)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadData()}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs md:text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          {refreshing ? 'Đang đồng bộ...' : 'Làm mới'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('GYM')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'GYM'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          Phòng Gym & Cửa Xoay
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
            {gymCapacity.insideCount}/100
          </span>
        </button>

        <button
          onClick={() => setActiveTab('POOL')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'POOL'
              ? 'border-sky-500 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Waves className="w-4 h-4" />
          Hồ Bơi & Vé Lượt
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-sky-950 text-sky-300 font-mono border border-sky-800">
            2 Hồ
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PASSES')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'PASSES'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Danh Sách Hội Viên
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-400 font-mono">
            {passes.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PHÒNG GYM (BỘ ĐẾM 100 NGƯỜI & CỬA XOAY 2 CHIỀU)    */}
      {/* ========================================================= */}
      {activeTab === 'GYM' && (
        <div className="space-y-6">
          {/* Card Sức Chứa Thời Gian Thực (BR-29, AC-31) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" />
                    Cập nhật thời gian thực (Redis)
                  </span>
                  {gymCapacity.isFull && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                      QUÁ TẢI (GYM_CAPACITY_FULL)
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white">
                  Bộ Đếm Khách Trong Phòng Gym (BR-29)
                </h2>
                <p className="text-xs text-slate-400">
                  Giới hạn cố định 100 khách. Khi đạt 100/100, cửa xoay tự động từ chối lượt vào và phát cảnh báo (AC-31).
                </p>

                {/* Thanh tiến trình sức chứa */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-semibold mb-1.5 text-slate-300">
                    <span>Đang có: <strong className="text-white text-sm">{gymCapacity.insideCount}</strong> người</span>
                    <span>Sức chứa: <strong>100</strong> người | Còn trống: <strong className="text-emerald-400">{gymCapacity.availableSpots}</strong></span>
                  </div>
                  <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        gymCapacity.isFull
                          ? 'bg-rose-500 shadow-lg shadow-rose-500/50'
                          : gymCapacity.occupancyPercentage > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, gymCapacity.occupancyPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Con số lớn & Nút Điều khiển Quản trị */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="text-center sm:text-right pr-2">
                  <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
                    {gymCapacity.insideCount}
                    <span className="text-xl text-slate-500 font-normal"> / 100</span>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    Tỷ lệ lấp đầy: {gymCapacity.occupancyPercentage}%
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setOverrideCount(gymCapacity.insideCount);
                      setIsOverrideModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Chỉnh số đếm tay
                  </button>
                  <button
                    onClick={handleResetCapacity}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-bold border border-rose-800/50 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset về 0 (23:00)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hàng 2 cột: Quầy Cửa Xoay 2 Chiều & Bảng 4 Gói Tập Chuẩn BR-27 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột Trái (7 cols): Cửa Xoay 2 Chiều Mô Phỏng (BR-30, AC-31, AC-32, AC-70) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Cửa Xoay 2 Chiều (Turnstile Scanner)</h3>
                    <p className="text-xs text-slate-400">
                      Mã QR định danh duy nhất (BR-26, BR-30a) | Khóa chống quét trùng 5 phút (BR-30, AC-32)
                    </p>
                  </div>
                </div>
              </div>

              {/* Input mã QR và chọn chiều */}
              <div className="space-y-3 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập mã QR định danh (VD: GYM_QR_... hoặc chuỗi QR)"
                    value={gymScanInput}
                    onChange={(e) => setGymScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGymScan(gymScanDirection);
                    }}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setGymScanDirection('IN');
                      handleGymScan('IN');
                    }}
                    disabled={gymScanSubmitting || !gymScanInput.trim()}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <LogIn className="w-4 h-4" />
                    {gymScanSubmitting && gymScanDirection === 'IN' ? 'Đang xác thực...' : 'Quét VÀO (IN)'}
                  </button>

                  <button
                    onClick={() => {
                      setGymScanDirection('OUT');
                      handleGymScan('OUT');
                    }}
                    disabled={gymScanSubmitting || !gymScanInput.trim()}
                    className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-600/20"
                  >
                    <LogOut className="w-4 h-4" />
                    {gymScanSubmitting && gymScanDirection === 'OUT' ? 'Đang xác thực...' : 'Quét RA (OUT)'}
                  </button>
                </div>
              </div>

              {/* Thông báo kết quả quét cửa xoay */}
              {gymScanResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs md:text-sm ${
                    gymScanResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  {gymScanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[11px]">
                      {gymScanResult.success ? 'CỬA XOAY KÍCH HOẠT MỞ' : 'TỪ CHỐI MỞ CỬA XOAY'}
                    </p>
                    <p className="mt-0.5">{gymScanResult.message}</p>
                  </div>
                </div>
              )}

              {/* Lịch sử quét gần nhất */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Lịch sử quét cửa xoay gần nhất ({turnstileLogs.length})
                </h4>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {turnstileLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Chưa có lượt quét nào</p>
                  ) : (
                    turnstileLogs.map((log, idx) => (
                      <div
                        key={log._id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.direction === 'IN'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {log.direction}
                          </span>
                          <span className="font-mono text-slate-300">
                            {log.qrCode ? `${log.qrCode.slice(0, 14)}...` : 'N/A'}
                          </span>
                          {log.isManualOverride && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              Override
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 flex items-center gap-3">
                          <span className="text-[11px] font-bold text-slate-300">
                            Sau quét: {log.insideCountAfter}/100
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.timestamp || log.createdAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cột Phải (5 cols): Danh Sách 4 Gói Tập Chuẩn BR-27 */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Bảng Gói Tập Gym Chuẩn (BR-27)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quy định 4 gói tập cố định. Tuyệt đối không cung cấp gói năm (BR-27).
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    code: 'DAY_1',
                    name: 'Gói 1 Ngày',
                    price: '50.000 đ',
                    duration: '1 ngày',
                    desc: 'Dành cho khách vãng lai trải nghiệm',
                    badge: 'Linh hoạt',
                  },
                  {
                    code: 'MONTH_1',
                    name: 'Gói 1 Tháng',
                    price: '500.000 đ',
                    duration: '30 ngày',
                    desc: 'Tiêu chuẩn cho người tập đều đặn',
                    badge: 'Phổ biến',
                  },
                  {
                    code: 'MONTH_3',
                    name: 'Gói 3 Tháng',
                    price: '1.350.000 đ',
                    duration: '90 ngày',
                    desc: 'Tiết kiệm 150.000 đ so với mua lẻ',
                    badge: 'Tiết kiệm 10%',
                  },
                  {
                    code: 'MONTH_6',
                    name: 'Gói 6 Tháng',
                    price: '2.400.000 đ',
                    duration: '180 ngày',
                    desc: 'Tiết kiệm 600.000 đ. Cam kết dài hạn',
                    badge: 'Ưu đãi cao nhất',
                  },
                ].map((plan) => (
                  <div
                    key={plan.code}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{plan.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {plan.badge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{plan.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400 text-sm">{plan.price}</div>
                      <div className="text-[11px] text-slate-500">{plan.duration}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Quy tắc gia hạn & nâng cấp (BR-28):</strong>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Gia hạn cùng gói sẽ cộng dồn tiếp nối hạn cũ. Nâng cấp lên gói dài hơn sẽ được khấu trừ tiền tương ứng với số ngày chưa dùng của gói cũ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HỒ BƠI (SỨC CHỨA 2 HỒ & VÉ LƯỢT TRONG NGÀY)        */}
      {/* ========================================================= */}
      {activeTab === 'POOL' && (
        <div className="space-y-6">
          {/* Card Trạng Thái 2 Hồ Bơi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hồ Olympic 50m */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Hồ Olympic Tiêu Chuẩn</span>
                  <h3 className="text-xl font-black text-white mt-0.5">Hồ Bơi 50m (POOL_50M)</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    poolStatus.pools?.POOL_50M?.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                  }`}
                >
                  {poolStatus.pools?.POOL_50M?.status === 'OPEN' ? 'ĐANG MỞ CỬA' : 'ĐÓNG ĐỘT XUẤT'}
                </span>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div>
                  <div className="text-xs text-slate-400">Khách đang bơi:</div>
                  <div className="text-4xl font-black text-white font-mono mt-0.5">
                    {poolStatus.pools?.POOL_50M?.currentOccupancy || 0}
                    <span className="text-lg text-slate-500 font-normal"> / 80 người</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  Sức chứa tối đa: <strong className="text-white">80 người</strong> (BR-31)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (((poolStatus.pools?.POOL_50M?.currentOccupancy || 0) / 80) * 100)
                    )}%`,
                  }}
                />
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handlePoolCheckout('POOL_50M')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all"
                >
                  Khách rời hồ (-1)
                </button>
                {poolStatus.pools?.POOL_50M?.status === 'OPEN' ? (
                  <button
                    onClick={() => {
                      setEmergencyPoolCode('POOL_50M');
                      setIsEmergencyModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold rounded-lg border border-rose-800 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Đóng đột xuất (AC-87)
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopenPool('POOL_50M')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Mở lại hồ bơi
                  </button>
                )}
              </div>
            </div>

            {/* Hồ Khởi Động 25m */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Hồ Trẻ Em & Khởi Động</span>
                  <h3 className="text-xl font-black text-white mt-0.5">Hồ Bơi 25m (POOL_25M)</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    poolStatus.pools?.POOL_25M?.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                  }`}
                >
                  {poolStatus.pools?.POOL_25M?.status === 'OPEN' ? 'ĐANG MỞ CỬA' : 'ĐÓNG ĐỘT XUẤT'}
                </span>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div>
                  <div className="text-xs text-slate-400">Khách đang bơi:</div>
                  <div className="text-4xl font-black text-white font-mono mt-0.5">
                    {poolStatus.pools?.POOL_25M?.currentOccupancy || 0}
                    <span className="text-lg text-slate-500 font-normal"> / 40 người</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  Sức chứa tối đa: <strong className="text-white">40 người</strong> (BR-31)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (((poolStatus.pools?.POOL_25M?.currentOccupancy || 0) / 40) * 100)
                    )}%`,
                  }}
                />
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handlePoolCheckout('POOL_25M')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all"
                >
                  Khách rời hồ (-1)
                </button>
                {poolStatus.pools?.POOL_25M?.status === 'OPEN' ? (
                  <button
                    onClick={() => {
                      setEmergencyPoolCode('POOL_25M');
                      setIsEmergencyModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold rounded-lg border border-rose-800 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Đóng đột xuất (AC-87)
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopenPool('POOL_25M')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Mở lại hồ bơi
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quầy Soát Vé Cổng Hồ Bơi & Bảng Giá Vé Chuẩn BR-31 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quầy Soát Vé Bơi (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Soát Vé Vào Cổng Hồ Bơi</h3>
                  <p className="text-xs text-slate-400">
                    Vé bơi theo lượt dùng chung cho cả 2 hồ. Quét cổng hồ nào gán vào hồ đó (BR-31).
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPoolForScan('POOL_50M')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedPoolForScan === 'POOL_50M'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Cổng Hồ 50m (Olympic)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPoolForScan('POOL_25M')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedPoolForScan === 'POOL_25M'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Cổng Hồ 25m (Khởi động)
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nhập mã vé bơi (VD: POOL_ADULT_... hoặc POOL_CHILD_...)"
                    value={poolTicketInput}
                    onChange={(e) => setPoolTicketInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePoolScan()}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    onClick={handlePoolScan}
                    disabled={poolScanSubmitting || !poolTicketInput.trim()}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-sky-600/20"
                  >
                    {poolScanSubmitting ? 'Đang duyệt...' : 'Soát Vé'}
                  </button>
                </div>
              </div>

              {/* Kết quả soát vé */}
              {poolScanResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs md:text-sm ${
                    poolScanResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  {poolScanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[11px]">
                      {poolScanResult.success ? 'SOÁT VÉ THÀNH CÔNG' : 'TỪ CHỐI VÀO HỒ BƠI'}
                    </p>
                    <p className="mt-0.5">{poolScanResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bảng Giá Vé Chuẩn BR-31 (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Waves className="w-4 h-4 text-sky-400" />
                Bảng Giá Vé Bơi Theo Lượt (BR-31)
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">Vé Người Lớn</span>
                    <p className="text-xs text-slate-400 mt-0.5">Khách cao từ 1m4 trở lên</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sky-400 text-base">25.000 đ</div>
                    <div className="text-[11px] text-slate-500">chưa bao gồm VAT</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">Vé Trẻ Em</span>
                    <p className="text-xs text-slate-400 mt-0.5">Khách cao dưới 1m4</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-teal-400 text-base">20.000 đ</div>
                    <div className="text-[11px] text-slate-500">chưa bao gồm VAT</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                <strong>Quy định giá trị vé (BR-31):</strong>
                <p className="text-[11px] text-sky-200/90 mt-1">
                  Vé bơi theo lượt chỉ có giá trị trong ngày mua (đến 23:59:59 của ngày mua). Dùng chung cho cả 2 hồ bơi. Mỗi vé chỉ được quét vào cổng 1 lần duy nhất.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DANH SÁCH THẺ TẬP HỘI VIÊN (TƯƠNG THÍCH NGƯỢC)      */}
      {/* ========================================================= */}
      {activeTab === 'PASSES' && (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Danh Sách Thẻ Tập Hội Viên</h3>
              <p className="text-xs text-slate-400">Tổng cộng {passes.length} thẻ trong hệ thống</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Hội viên</th>
                  <th className="px-6 py-3.5">Loại gói</th>
                  <th className="px-6 py-3.5">Số lượt còn</th>
                  <th className="px-6 py-3.5">Hạn sử dụng</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Đang tải danh sách thẻ...
                    </td>
                  </tr>
                ) : filteredPasses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                      Không tìm thấy thẻ hội viên nào
                    </td>
                  </tr>
                ) : (
                  filteredPasses.map((p) => {
                    const isExpired = p.expiryDate && new Date() > new Date(p.expiryDate);
                    const isDepleted = (p.remainingCheckIns ?? 0) <= 0;

                    return (
                      <tr key={p._id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{p.userId?.fullName || 'N/A'}</div>
                          <div className="text-xs text-slate-400 font-mono">{p.userId?.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                            {p.type === 'SINGLE_PASS'
                              ? 'Vé ngày (1 lượt)'
                              : p.type === 'MONTHLY_PASS'
                              ? 'Gói tháng (30 lượt)'
                              : 'Gói năm (365 lượt)'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-white text-base">
                            {p.remainingCheckIns ?? 0}
                          </span>
                          <span className="text-xs text-slate-400"> / {p.totalCheckIns ?? 0}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-400">
                          {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Hết hạn
                            </span>
                          ) : isDepleted ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Hết lượt
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleLegacyCheckin(p._id)}
                            disabled={isExpired || isDepleted || legacyCheckinSubmitting}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            Trừ 1 lượt
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ĐIỀU CHỈNH SỐ ĐẾM GYM THỦ CÔNG (OVERRIDE - BR-29)   */}
      {/* ========================================================= */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Điều Chỉnh Số Đếm Thủ Công (BR-29)
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sử dụng khi đầu đọc cửa xoay bị kẹt hoặc lệch số đếm thực tế. Hành động này sẽ được ghi vào nhật ký hệ thống.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Số người thực tế trong phòng (0 - 100):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={overrideCount}
                  onChange={(e) => setOverrideCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lý do điều chỉnh (Bắt buộc):
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="VD: Cửa xoay kẹt cơ học, khách đi chung 1 lượt quét..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/20"
                >
                  {overrideSubmitting ? 'Đang cập nhật...' : 'Xác nhận ghi đè'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ĐÓNG HỒ BƠI ĐỘT XUẤT & HOÀN TIỀN 100% (AC-87)       */}
      {/* ========================================================= */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-rose-400 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Đóng Hồ Bơi Khẩn Cấp (AC-87)
              </h3>
              <button
                onClick={() => {
                  setIsEmergencyModalOpen(false);
                  setEmergencyResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs space-y-1">
              <p className="font-black flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                CẢNH BÁO HOÀN TIỀN TỰ ĐỘNG (AC-87)
              </p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                Khi kích hoạt đóng hồ đột xuất, hệ thống sẽ <strong>ngay lập tức hủy và hoàn tiền 100%</strong> cho toàn bộ vé bơi chưa quét (<code className="text-white">UNUSED</code>) đã mua trong ngày!
              </p>
            </div>

            {emergencyResult ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs">
                  <p className="font-bold text-emerald-400 text-sm mb-1">Xử lý hoàn tất thành công!</p>
                  <p>{emergencyResult.message}</p>
                </div>
                <button
                  onClick={() => {
                    setIsEmergencyModalOpen(false);
                    setEmergencyResult(null);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  Đóng cửa sổ
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmergencyClose} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chọn hồ bơi cần đóng khẩn cấp:
                  </label>
                  <select
                    value={emergencyPoolCode}
                    onChange={(e: any) => setEmergencyPoolCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="POOL_50M">Hồ Olympic 50m (POOL_50M - Tối đa 80 người)</option>
                    <option value="POOL_25M">Hồ Khởi Động 25m (POOL_25M - Tối đa 40 người)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lý do đóng đột xuất (Bảo trì, sự cố nước, an toàn...):
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="VD: Sự cố hóa chất xử lý nước đột xuất, tạm dừng phục vụ để khử trùng..."
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEmergencyModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={emergencySubmitting}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30"
                  >
                    {emergencySubmitting ? 'Đang kích hoạt...' : 'Kích hoạt Đóng & Hoàn 100%'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
