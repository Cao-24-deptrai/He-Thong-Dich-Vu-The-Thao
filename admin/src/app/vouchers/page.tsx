// admin/src/app/vouchers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Percent,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Sparkles,
  Clock,
  ShieldCheck,
  TrendingUp,
  Tag,
  Calendar,
} from 'lucide-react';
import { api, Voucher, CreateVoucherPayload } from '@/lib/api';

const SPORT_OPTIONS = [
  { value: 'FOOTBALL', label: 'Bóng đá' },
  { value: 'BADMINTON', label: 'Cầu lông' },
  { value: 'PICKLEBALL', label: 'Pickleball' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'ESPORTS', label: 'Cyber Gaming' },
  { value: 'GYM', label: 'Gym & Fitness' },
];

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState<CreateVoucherPayload>({
    code: '',
    title: '',
    description: '',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 200000,
    maxDiscountAmount: 100000,
    totalBudget: 10000000, // 10 triệu VND
    usageLimit: 100,
    perUserLimit: 1, // 1 lượt/user theo BR-15
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    applicableSports: [],
    applicableCustomerTiers: [],
  });

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const data = await api.getVouchers(onlyActive);
      setVouchers(data || []);
    } catch (err: any) {
      console.error('Failed to load vouchers:', err);
      notifyError(err.message || 'Lỗi tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [onlyActive]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: CreateVoucherPayload = {
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description?.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscountAmount: form.discountType === 'PERCENT' ? Number(form.maxDiscountAmount) : undefined,
        totalBudget: Number(form.totalBudget) || 0,
        usageLimit: Number(form.usageLimit) || 100,
        perUserLimit: Number(form.perUserLimit) || 1,
        startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:59.000Z`).toISOString(),
        applicableSports: form.applicableSports && form.applicableSports.length > 0 ? form.applicableSports : undefined,
        applicableCustomerTiers: form.applicableCustomerTiers && form.applicableCustomerTiers.length > 0 ? form.applicableCustomerTiers : undefined,
      };

      await api.createVoucher(payload);
      setShowCreateModal(false);
      notifySuccess(`Đã tạo thành công mã voucher "${payload.code}"!`);
      // Reset form
      setForm({
        code: '',
        title: '',
        description: '',
        discountType: 'FIXED',
        discountValue: 50000,
        minOrderValue: 200000,
        maxDiscountAmount: 100000,
        totalBudget: 10000000,
        usageLimit: 100,
        perUserLimit: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        applicableSports: [],
        applicableCustomerTiers: [],
      });
      await fetchVouchers();
    } catch (err: any) {
      alert('Lỗi tạo voucher: ' + (err.message || 'Không thể tạo mã voucher'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tính toán KPI tổng quan
  const totalPrograms = vouchers.length;
  const activePrograms = vouchers.filter((v) => v.isActive && new Date(v.endDate) >= new Date()).length;
  const totalBudgetSum = vouchers.reduce((sum, v) => sum + (v.totalBudget || 0), 0);
  const totalUsedBudgetSum = vouchers.reduce((sum, v) => sum + (v.usedBudget || 0), 0);
  const totalUsedCountSum = vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0);

  return (
    <div className="space-y-7">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Ticket className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Quản Lý Voucher & Khuyến Mãi
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  EPIC E13 - M15
                </span>
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Thiết lập ngân sách phát hành, số lượt toàn hệ thống & giới hạn lượt dùng trên mỗi khách hàng (BR-13, BR-15)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-2xl text-xs font-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 mr-1.5 text-slate-950" />
            + TẠO VOUCHER MỚI
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4 text-emerald-400 hover:text-white" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4 text-rose-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chương Trình</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{activePrograms}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-bold">/ {totalPrograms} voucher</span>
          </div>
          <p className="text-[11px] text-cyan-400 font-bold mt-1">Đang kích hoạt trên hệ thống</p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ngân Sách Phát Hành</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">{totalBudgetSum.toLocaleString('vi-VN')}</span>
            <span className="text-xs text-slate-300 ml-1 font-bold">đ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Hạn mức tối đa theo BR-13</p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Đã Giải Ngân</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400">{totalUsedBudgetSum.toLocaleString('vi-VN')}</span>
            <span className="text-xs text-slate-300 ml-1 font-bold">đ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tỷ lệ: {totalBudgetSum > 0 ? ((totalUsedBudgetSum / totalBudgetSum) * 100).toFixed(1) : 0}% ngân sách
          </p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lượt Sử Dụng</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{totalUsedCountSum}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-bold">lượt áp dụng</span>
          </div>
          <p className="text-[11px] text-purple-400 font-bold mt-1">Bảo vệ Race Condition (AC-13)</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã code (PHANTA50K) hoặc tiêu đề..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyActive(!onlyActive)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              onlyActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {onlyActive ? '[x] Đang lọc: Chỉ mã còn hạn' : 'Tất cả trạng thái'}
          </button>
        </div>
      </div>

      {/* Vouchers Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800 backdrop-blur-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
          Đang tải danh sách chương trình khuyến mãi...
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-300">Chưa có mã khuyến mãi nào</p>
          <p className="text-xs text-slate-500 mt-1">Bấm &quot;+ TẠO VOUCHER MỚI&quot; để tạo mã chiết khấu cho khách hàng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVouchers.map((voucher) => {
            const isExpired = new Date(voucher.endDate) < new Date();
            const isBudgetExhausted = voucher.totalBudget > 0 && voucher.usedBudget >= voucher.totalBudget;
            const isQuotaExhausted = voucher.usedCount >= voucher.usageLimit;
            const isAvailable = voucher.isActive && !isExpired && !isBudgetExhausted && !isQuotaExhausted;

            const budgetPercent = voucher.totalBudget > 0
              ? Math.min(100, (voucher.usedBudget / voucher.totalBudget) * 100)
              : 0;

            const usagePercent = voucher.usageLimit > 0
              ? Math.min(100, (voucher.usedCount / voucher.usageLimit) * 100)
              : 0;

            return (
              <div
                key={voucher._id}
                className={`bg-slate-900/90 rounded-3xl border p-5 backdrop-blur-md shadow-xl transition relative flex flex-col justify-between ${
                  isAvailable
                    ? 'border-slate-800/90 hover:border-amber-500/40 hover:shadow-amber-500/5'
                    : 'border-dashed border-slate-800 opacity-70 bg-slate-950/70'
                }`}
              >
                <div>
                  {/* Card Header: Code & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-black tracking-wide text-sm px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                        #{voucher.code}
                      </span>
                      {voucher.discountType === 'PERCENT' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          GIẢM {voucher.discountValue}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          GIẢM {voucher.discountValue.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>

                    <div>
                      {isAvailable ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ĐANG CHẠY
                        </span>
                      ) : isExpired ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          HẾT HẠN
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          HẾT HẠN MỨC
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="font-extrabold text-white text-base leading-snug">{voucher.title}</h3>
                    {voucher.description && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{voucher.description}</p>
                    )}
                  </div>

                  {/* Conditions Details */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Đơn hàng tối thiểu:</span>
                      <span className="font-bold text-white">
                        {voucher.minOrderValue > 0 ? `${voucher.minOrderValue.toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
                      </span>
                    </div>

                    {voucher.discountType === 'PERCENT' && voucher.maxDiscountAmount && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Giảm tối đa (Cap):</span>
                        <span className="font-bold text-amber-300">{voucher.maxDiscountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Giới hạn khách hàng:</span>
                      <span className="font-bold text-cyan-300">{voucher.perUserLimit} lượt / user (BR-15)</span>
                    </div>

                    {voucher.applicableSports && voucher.applicableSports.length > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Môn áp dụng:</span>
                        <span className="font-bold text-emerald-400">{voucher.applicableSports.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Budget & Quota Progress Bars */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    {/* Budget Progress (BR-13) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1">
                        <span>Ngân sách đã dùng (BR-13)</span>
                        <span className="text-amber-300">
                          {voucher.usedBudget.toLocaleString('vi-VN')}đ / {voucher.totalBudget > 0 ? `${voucher.totalBudget.toLocaleString('vi-VN')}đ` : '∞'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Usage Count Progress */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1">
                        <span>Lượt dùng toàn hệ thống</span>
                        <span className="text-purple-300">
                          {voucher.usedCount} / {voucher.usageLimit} ({usagePercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Time */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hạn: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <span className="text-[10px] font-sans font-bold text-slate-300">
                    {isAvailable ? '[SẴN SÀNG]' : 'Đã dừng nhận'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: TẠO VOUCHER MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Thiết Lập Chương Trình Voucher & Khuyến Mãi (M15)
            </h3>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Mã code voucher (In hoa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().trim() })}
                    placeholder="Ví dụ: PHANTA50K"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-amber-300 font-sans font-bold rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Loại chiết khấu *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="FIXED">Số tiền cố định (VND)</option>
                    <option value="PERCENT">Phần trăm chiết khấu (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Tiêu đề chương trình khuyến mãi *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ví dụ: Giảm 50.000đ cho lượt đặt sân cuối tuần"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    {form.discountType === 'PERCENT' ? 'Tỷ lệ giảm (%) *' : 'Mức giảm (VND) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    {form.discountType === 'PERCENT' ? 'Mức giảm tối đa (VND)' : 'Đơn tối thiểu (VND)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.discountType === 'PERCENT' ? form.maxDiscountAmount : form.minOrderValue}
                    onChange={(e) => {
                      if (form.discountType === 'PERCENT') {
                        setForm({ ...form, maxDiscountAmount: Number(e.target.value) });
                      } else {
                        setForm({ ...form, minOrderValue: Number(e.target.value) });
                      }
                    }}
                    placeholder="0 = Không giới hạn"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Budget & Quota Constraints (BR-13, BR-15) */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Ràng Buộc Ngân Sách & Giới Hạn Sử Dụng (BR-13, BR-15)
                </span>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold mb-1">
                      Tổng ngân sách (VND)
                    </label>
                    <input
                      type="number"
                      step={500000}
                      value={form.totalBudget}
                      onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-600 text-white bg-[#0d1322] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold mb-1">
                      Lượt tối đa toàn hệ thống
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.usageLimit}
                      onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-600 text-white bg-[#0d1322] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold mb-1">
                      Lượt tối đa / khách
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.perUserLimit}
                      onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-600 text-white bg-[#0d1322] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Date Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Ngày bắt đầu hiệu lực
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Ngày kết thúc hiệu lực
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-600 text-white bg-[#0d1322] rounded-xl"
                  />
                </div>
              </div>

              {/* Sports Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Môn thể thao áp dụng (Để trống = Áp dụng tất cả)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SPORT_OPTIONS.map((sp) => {
                    const isSelected = form.applicableSports?.includes(sp.value);
                    return (
                      <button
                        type="button"
                        key={sp.value}
                        onClick={() => {
                          const current = form.applicableSports || [];
                          const next = isSelected
                            ? current.filter((s) => s !== sp.value)
                            : [...current, sp.value];
                          setForm({ ...form, applicableSports: next });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border border-amber-400'
                            : 'bg-slate-900 text-slate-300 border border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? `[x] ${sp.label}` : `+ ${sp.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Lưu & Kích Hoạt Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
