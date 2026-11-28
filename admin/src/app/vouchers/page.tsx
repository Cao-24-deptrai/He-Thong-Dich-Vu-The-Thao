'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateVoucherPayload>({
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
      notifySuccess(`Đã tạo thành công mã voucher "${payload.code}".`);
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

  const totalPrograms = vouchers.length;
  const activePrograms = vouchers.filter((v) => v.isActive && new Date(v.endDate) >= new Date()).length;
  const totalBudgetSum = vouchers.reduce((sum, v) => sum + (v.totalBudget || 0), 0);
  const totalUsedBudgetSum = vouchers.reduce((sum, v) => sum + (v.usedBudget || 0), 0);
  const totalUsedCountSum = vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Mã giảm giá & Combo ưu đãi</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Thiết lập ngân sách phát hành, số lượt toàn hệ thống và giới hạn lượt dùng trên mỗi khách hàng
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="phanta-btn-primary px-4 py-2.5 text-xs flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span>Tạo voucher mới</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)]">
            <span className="text-xs font-medium">Chương trình</span>
            <Tag className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2.5 tabular-nums">
            <span className="text-2xl font-heading font-semibold text-[var(--text-heading)]">{activePrograms}</span>
            <span className="text-xs text-[var(--text-sub)] ml-1.5">/ {totalPrograms} voucher</span>
          </div>
          <p className="text-xs text-[var(--pitch-green)] mt-1">Đang kích hoạt trên hệ thống</p>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)]">
            <span className="text-xs font-medium">Ngân sách phát hành</span>
            <DollarSign className="w-4 h-4 text-[var(--burnt-orange)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2.5 tabular-nums">
            <span className="text-2xl font-heading font-semibold text-[var(--text-heading)]">
              {totalBudgetSum.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-[var(--text-sub)] ml-1">đ</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Tổng hạn mức khuyến mãi</p>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)]">
            <span className="text-xs font-medium">Đã giải ngân</span>
            <TrendingUp className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2.5 tabular-nums">
            <span className="text-2xl font-heading font-semibold text-[var(--pitch-green)]">
              {totalUsedBudgetSum.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-[var(--text-sub)] ml-1">đ</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums">
            Tỷ lệ: {totalBudgetSum > 0 ? ((totalUsedBudgetSum / totalBudgetSum) * 100).toFixed(1) : 0}% ngân sách
          </p>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)]">
            <span className="text-xs font-medium">Lượt sử dụng</span>
            <Users className="w-4 h-4 text-[var(--text-sub)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2.5 tabular-nums">
            <span className="text-2xl font-heading font-semibold text-[var(--text-heading)]">{totalUsedCountSum}</span>
            <span className="text-xs text-[var(--text-sub)] ml-1.5">lượt áp dụng</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Kiểm soát giới hạn theo tài khoản</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="phanta-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã code hoặc tiêu đề"
            className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setOnlyActive(!onlyActive)}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
            onlyActive
              ? 'bg-[var(--bg-card-inner)] text-[var(--pitch-green)] border-[var(--pitch-green)]'
              : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
          }`}
        >
          {onlyActive ? 'Đang lọc: Chỉ mã còn hạn' : 'Tất cả trạng thái'}
        </button>
      </div>

      {/* Vouchers Grid */}
      {loading ? (
        <div className="phanta-card p-16 text-center text-xs text-[var(--text-sub)]">
          Đang tải danh sách chương trình khuyến mãi...
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="phanta-card p-12 text-center border-dashed">
          <Ticket className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-heading font-semibold text-sm text-[var(--text-heading)]">Chưa có mã khuyến mãi nào</p>
          <p className="text-xs text-[var(--text-sub)] mt-1">Chọn &quot;Tạo voucher mới&quot; để thiết lập mã chiết khấu cho khách hàng</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVouchers.map((voucher) => {
            const isExpired = new Date(voucher.endDate) < new Date();
            const totalBudget = voucher.totalBudget ?? 0;
            const usedBudget = voucher.usedBudget ?? voucher.spentBudget ?? 0;
            const usageLimit = voucher.usageLimit ?? 0;
            const usedCount = voucher.usedCount ?? 0;
            const minOrderValue = voucher.minOrderValue ?? 0;

            const isBudgetExhausted = totalBudget > 0 && usedBudget >= totalBudget;
            const isQuotaExhausted = usageLimit > 0 && usedCount >= usageLimit;
            const isAvailable = voucher.isActive && !isExpired && !isBudgetExhausted && !isQuotaExhausted;

            const budgetPercent = totalBudget > 0 ? Math.min(100, (usedBudget / totalBudget) * 100) : 0;
            const usagePercent = usageLimit > 0 ? Math.min(100, (usedCount / usageLimit) * 100) : 0;

            return (
              <div
                key={voucher._id}
                className={`phanta-card p-5 flex flex-col justify-between transition-colors ${
                  isAvailable ? 'phanta-card-hover' : 'opacity-70 border-dashed'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-sm px-2.5 py-1 rounded-lg bg-[var(--bg-card-inner)] text-[var(--pitch-green)] border border-[var(--border-color)] tabular-nums">
                        #{voucher.code}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--bg-card-inner)] text-[var(--text-heading)] border border-[var(--border-subtle)] tabular-nums">
                        {voucher.discountType === 'PERCENT'
                          ? `Giảm ${voucher.discountValue}%`
                          : `Giảm ${voucher.discountValue.toLocaleString('vi-VN')} đ`}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border shrink-0 ${
                        isAvailable
                          ? 'bg-emerald-500/10 text-[var(--pitch-green)] border-emerald-500/30'
                          : isExpired
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          : 'bg-amber-500/10 text-[var(--burnt-orange)] border-amber-500/30'
                      }`}
                    >
                      {isAvailable ? 'Đang chạy' : isExpired ? 'Hết hạn' : 'Hết hạn mức'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="font-heading font-semibold text-[var(--text-heading)] text-base leading-snug">
                      {voucher.title}
                    </h3>
                    {voucher.description && (
                      <p className="text-xs text-[var(--text-sub)] mt-1 line-clamp-2">{voucher.description}</p>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-sub)]">Đơn hàng tối thiểu</span>
                      <span className="font-medium text-[var(--text-heading)] tabular-nums">
                        {minOrderValue > 0 ? `${minOrderValue.toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
                      </span>
                    </div>

                    {voucher.discountType === 'PERCENT' && voucher.maxDiscountAmount && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-sub)]">Giảm tối đa</span>
                        <span className="font-medium text-[var(--burnt-orange)] tabular-nums">
                          {voucher.maxDiscountAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-sub)]">Giới hạn mỗi khách</span>
                      <span className="font-medium text-[var(--text-heading)] tabular-nums">
                        {voucher.perUserLimit} lượt / tài khoản
                      </span>
                    </div>

                    {voucher.applicableSports && voucher.applicableSports.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-sub)]">Môn áp dụng</span>
                        <span className="font-medium text-[var(--pitch-green)]">
                          {voucher.applicableSports.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bars */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                        <span className="text-[var(--text-sub)]">Ngân sách đã dùng</span>
                        <span className="text-[var(--burnt-orange)] tabular-nums">
                          {usedBudget.toLocaleString('vi-VN')} đ / {totalBudget > 0 ? `${totalBudget.toLocaleString('vi-VN')} đ` : 'Không giới hạn'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bg-card-inner)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--burnt-orange)] rounded-full"
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                        <span className="text-[var(--text-sub)]">Lượt dùng toàn hệ thống</span>
                        <span className="text-[var(--pitch-green)] tabular-nums">
                          {usedCount} / {usageLimit > 0 ? usageLimit : 'Không giới hạn'} ({usagePercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bg-card-inner)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--pitch-green)] rounded-full"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Hạn: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <span className="font-medium text-[var(--text-heading)]">
                    {isAvailable ? 'Sẵn sàng' : 'Đã dừng nhận'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: TẠO VOUCHER MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="phanta-card max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Thiết lập chương trình khuyến mãi</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                    Mã code voucher (In hoa)
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().trim() })}
                    placeholder="Ví dụ: PHANTA50K"
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--pitch-green)] font-semibold rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                    Loại chiết khấu
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  >
                    <option value="FIXED">Số tiền cố định (VND)</option>
                    <option value="PERCENT">Phần trăm chiết khấu (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                  Tiêu đề chương trình khuyến mãi
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ví dụ: Giảm 50.000đ cho lượt đặt sân cuối tuần"
                  className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                    {form.discountType === 'PERCENT' ? 'Tỷ lệ giảm (%)' : 'Mức giảm (VND)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] tabular-nums rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
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
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] tabular-nums rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-3">
                <span className="text-xs font-medium text-[var(--text-heading)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Ngân sách và giới hạn sử dụng</span>
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-sub)] mb-1">
                      Tổng ngân sách (VND)
                    </label>
                    <input
                      type="number"
                      step={500000}
                      value={form.totalBudget}
                      onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] tabular-nums rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-sub)] mb-1">
                      Lượt tối đa hệ thống
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.usageLimit}
                      onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] tabular-nums rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-sub)] mb-1">
                      Lượt tối đa / khách
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.perUserLimit}
                      onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] tabular-nums rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                    Ngày bắt đầu hiệu lực
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
                    Ngày kết thúc hiệu lực
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">
                  Môn thể thao áp dụng (để trống để áp dụng tất cả)
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                            : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
                        }`}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="phanta-btn-secondary px-4 py-2 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="phanta-btn-primary px-4 py-2 text-xs"
                >
                  {submitting ? 'Đang tạo' : 'Lưu và kích hoạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
