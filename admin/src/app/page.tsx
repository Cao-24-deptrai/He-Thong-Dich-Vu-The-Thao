// admin/src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PackageCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [reviewSummary, setReviewSummary] = useState<any>(null);
  const [facilityBreakdown, setFacilityBreakdown] = useState<any[]>([]);

  // Shift audit check state
  const [shiftInput, setShiftInput] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  useEffect(() => {
    const user = api.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqStats, revSummary, facBreakdown] = await Promise.allSettled([
        api.getEquipmentStats(),
        api.getReviewSummary(),
        api.getFacilityRatingBreakdown(),
      ]);

      if (eqStats.status === 'fulfilled') setEquipmentStats(eqStats.value);
      if (revSummary.status === 'fulfilled') setReviewSummary(revSummary.value);
      if (facBreakdown.status === 'fulfilled') setFacilityBreakdown(facBreakdown.value);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftInput.trim()) return;

    setAuditLoading(true);
    try {
      const res = await api.checkShiftUnreturnedRentals(shiftInput.trim());
      setAuditResult(res);
    } catch (err: any) {
      setAuditResult({
        error: err.message || 'Không thể kiểm tra ca thu ngân này.',
      });
    } finally {
      setAuditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Đang tải dữ liệu tổng quan hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
            <TrendingUp className="w-3.5 h-3.5" /> Báo Cáo Tổng Hợp & Kiểm Toán (E16)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bảng Điều Khiển Vận Hành
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Theo dõi tình trạng thiết bị mượn trả (E07), chất lượng phục vụ & đánh giá (E15), và chốt ca thu ngân (E06).
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/60 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Làm Mới
        </button>
      </div>

      {/* Top Highlight Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Đang cho thuê */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đang Cho Thuê</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {equipmentStats?.totalRented || 0}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>Phiếu đang mượn: {equipmentStats?.totalActiveTickets || 0}</span>
            <Link href="/rentals" className="text-cyan-400 hover:underline flex items-center gap-0.5">
              Xem POS <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Khả dụng trong kho */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sẵn Sàng Cho Mượn</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {equipmentStats?.totalAvailable || 0}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Tổng tồn kho: {equipmentStats?.totalStock || 0} món ({equipmentStats?.totalEquipments || 0} loại)
          </div>
        </div>

        {/* KPI 3: Điểm chất lượng dịch vụ */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Độ Hài Lòng Dịch Vụ</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-300 flex items-baseline gap-1.5">
            {reviewSummary?.avgOverall ? reviewSummary.avgOverall.toFixed(1) : '5.0'}
            <span className="text-sm font-normal text-slate-400">/ 5.0</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>Từ {reviewSummary?.totalReviews || 0} đánh giá</span>
            <Link href="/reviews" className="text-amber-400 hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Cảnh báo khẩn cấp */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cần Chú Ý Xử Lý</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400">
            {reviewSummary?.needsAttentionCount || 0}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Đánh giá sao thấp (&le; 2 sao) hoặc phản ánh chất lượng
          </div>
        </div>
      </div>

      {/* Grid: Shift Audit Tool & Equipment Sport Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Kiểm Tra Chốt Ca Thu Ngân (E06) */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Kiểm Tra Ca Thu Ngân Trước Khi Chốt (E06)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                Audit Tool
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Trước khi nhân viên kết ca hoặc bàn giao tiền mặt, hệ thống tự động kiểm tra xem ca làm việc này còn phiếu thuê dụng cụ nào chưa trả để tránh thất thoát tài sản.
            </p>

            <form onSubmit={handleCheckShift} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập Shift ID hoặc Ca thu ngân..."
                  value={shiftInput}
                  onChange={(e) => setShiftInput(e.target.value)}
                  className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={auditLoading || !shiftInput.trim()}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {auditLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Kiểm tra
                </button>
              </div>
            </form>

            {/* Audit Results */}
            {auditResult && (
              <div className="mt-4 p-4 rounded-xl border text-sm transition">
                {auditResult.error ? (
                  <div className="text-rose-400 flex items-center gap-2 bg-rose-500/10 border-rose-500/20 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{auditResult.error}</span>
                  </div>
                ) : auditResult.canCloseSafely ? (
                  <div className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Ca này an toàn! Không có phiếu mượn đồ nào còn tồn đọng.</span>
                  </div>
                ) : (
                  <div className="space-y-2 bg-amber-500/10 border-amber-500/20 p-3 rounded-lg text-amber-300">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Cảnh báo: Còn {auditResult.unreturnedCount} phiếu thuê chưa được trả!</span>
                    </div>
                    <ul className="text-xs text-amber-200 space-y-1 pl-6 list-disc">
                      {auditResult.tickets?.map((t: any) => (
                        <li key={t._id}>
                          Mã: <span className="font-mono font-bold text-white">{t.ticketCode}</span> - Khách: {t.customerName} ({t.customerPhone}) - Cọc: {t.totalDepositAmount.toLocaleString()}đ
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Ràng buộc: Bất biến BR-39a & kiểm toán sổ cọc</span>
            <Link href="/rentals" className="text-cyan-400 hover:underline">
              Mở trang Trả đồ &rarr;
            </Link>
          </div>
        </div>

        {/* Module 2: Thống kê Dụng cụ theo Môn thể thao (E07 & E16) */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              Tình Trạng Kho Dụng Cụ Theo Bộ Môn
            </h2>
            <Link href="/rentals" className="text-xs font-semibold text-cyan-400 hover:underline">
              Quản lý kho &rarr;
            </Link>
          </div>

          {equipmentStats?.sportBreakdown && Object.keys(equipmentStats.sportBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(equipmentStats.sportBreakdown).map(([sport, stats]: any) => (
                <div key={sport} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white tracking-wide">{sport}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Tổng tồn: {stats.totalQty} &bull; Đang mượn: {stats.rentedQty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Sẵn sàng: {stats.availableQty}
                    </span>
                    {stats.damagedQty > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Hỏng/mất: {stats.damagedQty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              Chưa có dữ liệu dụng cụ theo bộ môn.
            </div>
          )}
        </div>
      </div>

      {/* Facility Reviews Breakdown (E15 & E16) */}
      <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Xếp Hạng Chất Lượng Dịch Vụ Các Cơ Sở (E15)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Đánh giá trung bình theo 4 tiêu chí: Cơ sở vật chất, Dịch vụ, Nhân viên, và Vệ sinh.
            </p>
          </div>
          <Link href="/reviews" className="text-xs font-semibold text-amber-400 hover:underline">
            Tất cả đánh giá &rarr;
          </Link>
        </div>

        {facilityBreakdown && facilityBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Cơ Sở</th>
                  <th className="py-3 px-4 text-center">Lượt Đánh Giá</th>
                  <th className="py-3 px-4 text-center">CSVC</th>
                  <th className="py-3 px-4 text-center">Dịch Vụ</th>
                  <th className="py-3 px-4 text-center">Nhân Viên</th>
                  <th className="py-3 px-4 text-center">Vệ Sinh</th>
                  <th className="py-3 px-4 text-center">Điểm Trung Bình</th>
                  <th className="py-3 px-4 text-right">Cần Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {facilityBreakdown.map((f: any) => (
                  <tr key={f.facilityId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">{f.facilityName}</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">{f.totalReviews}</td>
                    <td className="py-3.5 px-4 text-center">{f.avgFacility}★</td>
                    <td className="py-3.5 px-4 text-center">{f.avgService}★</td>
                    <td className="py-3.5 px-4 text-center">{f.avgStaff}★</td>
                    <td className="py-3.5 px-4 text-center">{f.avgCleanliness}★</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                        {f.avgOverall}★
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {f.needsAttentionCount > 0 ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {f.needsAttentionCount} cảnh báo
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm">
            Chưa có đánh giá nào cho các cơ sở thể thao.
          </div>
        )}
      </div>
    </div>
  );
}
