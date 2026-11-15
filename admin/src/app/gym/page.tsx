// admin/src/app/gym/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Dumbbell, QrCode, CheckCircle2, AlertCircle, Search, RefreshCw, UserCheck } from 'lucide-react';

export default function GymManagementPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [checkinInput, setCheckinInput] = useState('');
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPasses();
  }, []);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const data = await api.getAllGymPasses();
      setPasses(data || []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách thẻ Gym:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (passIdOrToken?: string) => {
    const target = passIdOrToken || checkinInput.trim();
    if (!target) return;

    setSubmitting(true);
    setCheckinResult(null);

    try {
      const payload = target.length > 30 ? { qrToken: target } : { passId: target };
      const res = await api.checkInGymPass(payload);
      setCheckinResult({
        success: true,
        message: `Check-in thành công! Khách hàng: ${res.user?.fullName || 'Hội viên'} (${res.user?.phone || ''}) - Lượt còn lại: ${res.remainingCheckIns}`,
        data: res,
      });
      setCheckinInput('');
      loadPasses();
    } catch (err: any) {
      setCheckinResult({
        success: false,
        message: err.message || 'Check-in thất bại. Thẻ đã hết hạn hoặc hết lượt tập!',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPasses = passes.filter((p) => {
    if (!searchPhone) return true;
    const phone = p.userId?.phone || '';
    const name = p.userId?.fullName || '';
    return phone.includes(searchPhone) || name.toLowerCase().includes(searchPhone.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-500/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            Quản Lý Hội Viên & Soát Vé Phòng Gym
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tra cứu thẻ tập, soát vé cổng quay và trừ lượt check-in tự động (Mục 6.1)
          </p>
        </div>

        <button
          onClick={loadPasses}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Quầy Soát Vé Nhanh */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-orange-400" />
          Quầy Soát Vé & Trừ Lượt Trực Tiếp
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Nhập mã thẻ hội viên hoặc mã JWT Dynamic QR (từ app mobile) để soát vé vào phòng tập
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Nhập Pass ID hoặc quét mã QR token..."
            value={checkinInput}
            onChange={(e) => setCheckinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
            className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-sm font-mono"
          />
          <button
            onClick={() => handleCheckin()}
            disabled={submitting || !checkinInput.trim()}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/30"
          >
            <UserCheck className="w-4 h-4" />
            {submitting ? 'Đang xử lý...' : 'Soát vé / Trừ 1 lượt'}
          </button>
        </div>

        {/* Kết quả soát vé */}
        {checkinResult && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
              checkinResult.success
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
            }`}
          >
            {checkinResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{checkinResult.success ? 'CHECK-IN HỢP LỆ' : 'TỪ CHỐI CHECK-IN'}</p>
              <p className="text-xs mt-0.5 opacity-90">{checkinResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách thẻ hội viên */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Danh Sách Thẻ Tập Hội Viên</h3>
            <p className="text-xs text-slate-500">Tổng cộng {passes.length} thẻ trong hệ thống</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc SĐT..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Hội viên</th>
                <th className="px-6 py-3.5">Loại gói</th>
                <th className="px-6 py-3.5">Số lượt còn</th>
                <th className="px-6 py-3.5">Hạn sử dụng</th>
                <th className="px-6 py-3.5">Trạng thái</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Đang tải danh sách thẻ...
                  </td>
                </tr>
              ) : filteredPasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy thẻ hội viên nào
                  </td>
                </tr>
              ) : (
                filteredPasses.map((p) => {
                  const isExpired = p.expiryDate && new Date() > new Date(p.expiryDate);
                  const isDepleted = (p.remainingCheckIns ?? 0) <= 0;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{p.userId?.fullName || 'N/A'}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.userId?.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          {p.type === 'SINGLE_PASS'
                            ? 'Vé ngày (1 lượt)'
                            : p.type === 'MONTHLY_PASS'
                            ? 'Gói tháng (30 lượt)'
                            : 'Gói năm (365 lượt)'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          {p.remainingCheckIns ?? 0}
                        </span>
                        <span className="text-xs text-slate-400"> / {p.totalCheckIns ?? 0}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Hết hạn
                          </span>
                        ) : isDepleted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Hết lượt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleCheckin(p._id)}
                          disabled={isExpired || isDepleted || submitting}
                          className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-orange-200 disabled:opacity-30 disabled:pointer-events-none"
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
    </div>
  );
}
