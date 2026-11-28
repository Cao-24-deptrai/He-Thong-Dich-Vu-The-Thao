// admin/src/app/gym/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Dumbbell, QrCode, CheckCircle2, AlertCircle, Search, RefreshCw, UserCheck, ShieldCheck } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Hội viên & Soát vé Phòng Gym</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Tra cứu thẻ tập hội viên, soát vé cửa xoay tự động và trừ lượt check-in theo thời gian thực
          </p>
        </div>

        <button
          onClick={loadPasses}
          className="phanta-btn-secondary px-3.5 py-2 flex items-center gap-2 text-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Quầy Soát Vé Nhanh */}
      <div className="phanta-card p-6 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-inner)] border border-[var(--pitch-green)]/30">
        <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-[var(--pitch-green)]" />
          <span>Quầy Soát Vé & Trừ Lượt Trực Tiếp</span>
        </h2>
        <p className="text-xs text-[var(--text-sub)] mb-4">
          Quét mã QR động trên ứng dụng điện thoại hoặc nhập mã thẻ tập để trừ lượt qua cổng xoay tự động
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheckin();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={checkinInput}
            onChange={(e) => setCheckinInput(e.target.value)}
            placeholder="Quét mã QR thẻ tập hoặc nhập mã thẻ hội viên..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-[var(--pitch-green)]"
          />
          <button
            type="submit"
            disabled={submitting || !checkinInput.trim()}
            className="phanta-btn-primary px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{submitting ? 'Đang xác thực...' : 'Soát vé vào phòng'}</span>
          </button>
        </form>

        {checkinResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
              checkinResult.success
                ? 'bg-emerald-500/15 text-[var(--pitch-green)] border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {checkinResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{checkinResult.message}</span>
          </div>
        )}
      </div>

      {/* Danh Sách Thẻ Tập */}
      <div className="phanta-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
            <span>Danh sách thẻ hội viên đang phát hành</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30 tabular-nums">
              {filteredPasses.length}
            </span>
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-[var(--pitch-green)]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải danh sách thẻ hội viên...</p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-sub)]">
            Không tìm thấy hội viên nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-sub)] uppercase tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Hội viên / SĐT</th>
                  <th className="pb-3">Gói thẻ</th>
                  <th className="pb-3">Lượt còn lại</th>
                  <th className="pb-3">Hạn sử dụng</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3 text-right pr-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredPasses.map((pass) => (
                  <tr key={pass._id} className="hover:bg-[var(--bg-card-inner)]/50 transition">
                    <td className="py-3.5 pl-2">
                      <div className="font-heading font-bold text-[var(--text-heading)]">
                        {pass.userId?.fullName || 'Hội viên chưa đặt tên'}
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                        {pass.userId?.phone || 'Chưa có SĐT'}
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className="font-semibold text-[var(--text-main)]">
                        {pass.packageName || pass.passType || 'Thẻ Gym Tiêu Chuẩn'}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span className="font-heading font-extrabold text-sm text-[var(--pitch-green)] tabular-nums">
                        {pass.remainingCheckIns ?? pass.remainingSessions ?? 'Không giới hạn'}
                      </span>
                      <span className="text-[11px] text-[var(--text-sub)] ml-1">lượt</span>
                    </td>

                    <td className="py-3.5 text-[var(--text-sub)] font-heading tabular-nums">
                      {pass.expiresAt ? new Date(pass.expiresAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </td>

                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-[var(--pitch-green)] border border-emerald-500/25">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{pass.status || 'Đang hoạt động'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 text-right pr-2">
                      <button
                        type="button"
                        onClick={() => handleCheckin(pass._id)}
                        disabled={submitting}
                        className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Trừ lượt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
