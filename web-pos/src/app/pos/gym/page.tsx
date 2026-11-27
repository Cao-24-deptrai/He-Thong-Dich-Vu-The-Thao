'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Printer, QrCode, RefreshCw, Search, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

export default function PosGymPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [checkinInput, setCheckinInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const list = await api.getAllGymPasses();
      setPasses(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast('Không tải được danh sách thẻ Gym', err.message || 'Kiểm tra kết nối backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, []);

  useEffect(() => {
    const onSearch = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setSearchPhone(custom.detail);
    };
    window.addEventListener('phanta-pos-search', onSearch);
    return () => window.removeEventListener('phanta-pos-search', onSearch);
  }, []);

  const handleCheckin = async (passIdOrToken?: string) => {
    const target = (passIdOrToken || checkinInput).trim();
    if (!target || submitting) return;

    setSubmitting(true);
    setCheckinResult(null);
    try {
      const payload = target.length > 30 ? { qrToken: target } : { passId: target };
      const res = await api.checkInGymPass(payload);
      const msg = `Hội viên ${res.user?.fullName || 'Khách Gym'} (${res.user?.phone || 'N/A'}) - Còn ${res.remainingCheckIns ?? 'không giới hạn'} lượt`;
      setCheckinResult({ success: true, message: msg, data: res });
      showToast('Soát vé Gym thành công', msg);
      setCheckinInput('');
      loadPasses();
    } catch (err: any) {
      const msg = err.message || 'Thẻ tập đã hết hạn hoặc không hợp lệ.';
      setCheckinResult({ success: false, message: msg });
      showToast('Từ chối qua cửa Gym', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPasses = useMemo(() => {
    const q = searchPhone.trim().toLowerCase();
    if (!q) return passes;
    return passes.filter((p) => {
      const phone = String(p.userId?.phone || '').toLowerCase();
      const name = String(p.userId?.fullName || '').toLowerCase();
      const id = String(p._id || '').toLowerCase();
      return phone.includes(q) || name.includes(q) || id.includes(q);
    });
  }, [passes, searchPhone]);

  const activeCount = passes.filter((p) => p.status === 'ACTIVE').length;
  const expiredCount = passes.filter((p) => p.status !== 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top 6:6 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Gate Check-in Simulator (6 Cols) */}
        <section className="lg:col-span-6 phanta-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--pos-border-subtle)]">
            <div>
              <h2 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Soát thẻ hội viên và mở cửa xoay Gym
              </h2>
              <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
                Nhập mã thẻ hoặc quét mã QR hội viên để kiểm tra hạn dùng và ghi nhận lượt tập
              </p>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0"
              style={{
                backgroundColor: checkinResult?.success ? 'var(--pos-accent-soft)' : 'var(--pos-bg-card-inner)',
                color: checkinResult?.success ? 'var(--pos-accent)' : 'var(--pos-text-sub)',
                borderColor: 'var(--pos-border)',
              }}
            >
              {checkinResult?.success ? 'Đã nhả chốt cửa' : 'Cửa đang khóa'}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheckin();
            }}
            className="space-y-3"
          >
            <label htmlFor="gym-pass-input" className="block text-xs font-semibold text-[var(--pos-text-main)]">
              Mã thẻ hội viên hoặc QR Token
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="gym-pass-input"
                type="text"
                value={checkinInput}
                onChange={(e) => setCheckinInput(e.target.value)}
                placeholder="Nhập mã Pass ID hoặc quét QR..."
                className="phanta-input flex-1 px-3.5 py-2.5 text-xs font-tabular"
              />
              <button
                type="submit"
                disabled={submitting || !checkinInput.trim()}
                className="phanta-btn-primary px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span>{submitting ? 'Đang kiểm tra...' : 'Xác nhận vào cổng'}</span>
              </button>
            </div>
          </form>

          {/* Checkin Result Box */}
          <div className="phanta-subcard p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--pos-text-heading)]">Trạng thái xác thực gần nhất</span>
              {checkinResult && (
                <span
                  className="inline-flex items-center gap-1 font-bold"
                  style={{ color: checkinResult.success ? 'var(--pos-accent)' : 'var(--pos-danger)' }}
                >
                  {checkinResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{checkinResult.success ? 'Hợp lệ' : 'Từ chối'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--pos-text-sub)]">
              {checkinResult ? checkinResult.message : 'Chưa có lượt soát thẻ nào trong phiên hiện tại.'}
            </p>
          </div>
        </section>

        {/* Right: Quick Summary & Search (6 Cols) */}
        <section className="lg:col-span-6 phanta-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--pos-border-subtle)]">
              <div>
                <h2 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                  Tổng quan hội viên Gym
                </h2>
                <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
                  Theo dõi nhanh thẻ còn hiệu lực và tra cứu theo số điện thoại
                </p>
              </div>
              <button
                type="button"
                onClick={loadPasses}
                className="phanta-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="phanta-subcard p-3.5">
                <div className="text-xs text-[var(--pos-text-sub)]">Tổng số thẻ</div>
                <div className="font-barlow font-extrabold text-2xl text-[var(--pos-text-heading)] font-tabular mt-1">
                  {passes.length}
                </div>
              </div>
              <div className="phanta-subcard p-3.5">
                <div className="text-xs text-[var(--pos-text-sub)]">Đang hoạt động</div>
                <div className="font-barlow font-extrabold text-2xl text-[var(--pos-accent)] font-tabular mt-1">
                  {activeCount}
                </div>
              </div>
              <div className="phanta-subcard p-3.5">
                <div className="text-xs text-[var(--pos-text-sub)]">Hết hạn hoặc khóa</div>
                <div
                  className="font-barlow font-extrabold text-2xl font-tabular mt-1"
                  style={{ color: 'var(--pos-orange)' }}
                >
                  {expiredCount}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="gym-search" className="block text-xs font-semibold text-[var(--pos-text-main)]">
              Tìm hội viên theo tên, SĐT hoặc mã thẻ
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--pos-text-sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="gym-search"
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Nhập SĐT hoặc họ tên hội viên..."
                className="phanta-input w-full pl-9 pr-3 py-2.5 text-xs"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Table */}
      <section className="phanta-card overflow-hidden">
        <div className="p-4 border-b border-[var(--pos-border-subtle)] flex items-center justify-between gap-2">
          <h2 className="font-barlow font-bold text-sm text-[var(--pos-text-heading)] uppercase">
            Danh sách thẻ hội viên Gym
          </h2>
          <span className="text-xs text-[var(--pos-text-sub)] font-tabular">
            Hiển thị {filteredPasses.length} thẻ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--pos-table-head)] text-[var(--pos-text-sub)] uppercase border-b border-[var(--pos-border-subtle)]">
              <tr>
                <th className="p-3">Mã thẻ</th>
                <th className="p-3">Hội viên</th>
                <th className="p-3">Gói tập</th>
                <th className="p-3">Lượt còn lại</th>
                <th className="p-3">Hạn dùng</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pos-border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--pos-text-sub)]">
                    Đang tải danh sách thẻ...
                  </td>
                </tr>
              ) : filteredPasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--pos-text-sub)]">
                    Chưa có thẻ hội viên nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPasses.map((p) => {
                  const isActive = p.status === 'ACTIVE';
                  return (
                    <tr key={p._id} className="hover:bg-[var(--pos-bg-card-inner)] transition-colors">
                      <td className="p-3 font-tabular font-bold text-[var(--pos-accent)]">
                        #{String(p._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[var(--pos-text-heading)]">
                          {p.userId?.fullName || 'Hội viên Phanta'}
                        </div>
                        <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                          {p.userId?.phone || 'Chưa cập nhật SĐT'}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-[var(--pos-text-main)]">
                        {p.packageName || p.type || 'Gói thành viên'}
                      </td>
                      <td className="p-3 font-tabular font-semibold text-[var(--pos-text-heading)]">
                        {p.remainingCheckIns ?? 'Không giới hạn'}
                      </td>
                      <td className="p-3 font-tabular text-[var(--pos-text-sub)]">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                          style={
                            isActive
                              ? {
                                  backgroundColor: 'var(--pos-accent-soft)',
                                  color: 'var(--pos-accent)',
                                  borderColor: 'var(--pos-border)',
                                }
                              : {
                                  backgroundColor: 'var(--pos-danger-soft)',
                                  color: 'var(--pos-danger)',
                                  borderColor: 'var(--pos-danger-border)',
                                }
                          }
                        >
                          {isActive ? 'Còn hạn' : p.status || 'Hết hạn'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!isActive || submitting}
                            onClick={() => handleCheckin(p._id)}
                            className="phanta-btn-primary px-2.5 py-1 text-[11px]"
                          >
                            Check-in
                          </button>
                          <button
                            type="button"
                            aria-label="In thẻ hội viên"
                            onClick={() =>
                              openReceipt({
                                key: 'gym',
                                title: 'THÔNG TIN THẺ HỘI VIÊN GYM',
                                invoiceNo: `#GYM-${String(p._id).slice(-5).toUpperCase()}`,
                                customer: `${p.userId?.fullName || 'Hội viên'} (${p.userId?.phone || ''})`,
                                method: 'Thẻ thành viên Gym',
                                items: [
                                  {
                                    name: p.packageName || 'Gói tập Gym',
                                    qty: 1,
                                    price: p.price || 0,
                                  },
                                ],
                                subtotal: p.price || 0,
                                total: p.price || 0,
                                extraNote: `Trạng thái: ${isActive ? 'Đang hoạt động' : p.status}`,
                              })
                            }
                            className="phanta-btn-secondary p-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
