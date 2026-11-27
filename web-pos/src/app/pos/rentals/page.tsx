'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Plus, Printer, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { api, Equipment, RentalTicket } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

export default function PosRentalsPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<RentalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RENTING' | 'RETURNED'>('ALL');
  const [search, setSearch] = useState('');

  // New rental modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rentalHours, setRentalHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  // Return modal
  const [returningTicket, setReturningTicket] = useState<RentalTicket | null>(null);
  const [conditions, setConditions] = useState<
    Record<string, { condition: 'GOOD' | 'DAMAGED' | 'LOST'; customPenaltyFee: number }>
  >({});
  const [returnNotes, setReturnNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqs, tkts] = await Promise.all([
        api.getEquipments(),
        api.getRentalTickets(),
      ]);
      const eqList = Array.isArray(eqs) ? eqs : [];
      setEquipments(eqList);
      setTickets(Array.isArray(tkts) ? tkts : []);
      if (eqList.length > 0 && !selectedEquipmentId) {
        setSelectedEquipmentId(eqList[0]._id);
      }
    } catch (err: any) {
      showToast('Không tải được dữ liệu thuê đồ', err.message || 'Kiểm tra kết nối backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onSearch = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setSearch(custom.detail);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewModalOpen(false);
        setReturningTicket(null);
      }
    };
    window.addEventListener('phanta-pos-search', onSearch);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('phanta-pos-search', onSearch);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchSearch =
        !q ||
        t.ticketCode?.toLowerCase().includes(q) ||
        t.customerPhone?.toLowerCase().includes(q) ||
        t.customerName?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [tickets, statusFilter, search]);

  const rentingCount = tickets.filter((t) => t.status === 'RENTING').length;
  const returnedCount = tickets.filter((t) => t.status === 'RETURNED').length;
  const totalHeldDeposits = tickets
    .filter((t) => t.status === 'RENTING')
    .reduce((sum, t) => sum + (t.totalDepositAmount || 0), 0);

  const selectedEquipment = equipments.find((e) => e._id === selectedEquipmentId);
  const unitRentalPrice = selectedEquipment
    ? selectedEquipment.pricingType === 'HOURLY'
      ? selectedEquipment.price * rentalHours
      : selectedEquipment.price
    : 0;
  const estimatedRentalFee = unitRentalPrice * quantity;
  const estimatedDeposit = (selectedEquipment?.depositAmount || 0) * quantity;
  const estimatedTotal = estimatedRentalFee + estimatedDeposit;

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    if (!customerPhone.trim()) {
      showToast('Thiếu số điện thoại', 'Vui lòng nhập số điện thoại khách hàng.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createRentalTicket({
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim() || 'Khách thuê tại quầy',
        rentalHours,
        paymentMethod,
        items: [{ equipmentId: selectedEquipment._id, quantity }],
      });

      openReceipt({
        key: 'rental',
        title: 'PHIẾU THUÊ DỤNG CỤ VÀ THU CỌC',
        invoiceNo: `#${created.ticketCode || created._id.slice(-6).toUpperCase()}`,
        customer: `${customerName.trim() || 'Khách thuê'} (${customerPhone.trim()})`,
        method: paymentMethod === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR',
        items: [
          {
            name: `Tiền thuê: ${selectedEquipment.name} (${rentalHours}h)`,
            qty: quantity,
            price: unitRentalPrice,
          },
          {
            name: `Tiền cọc giữ: ${selectedEquipment.name}`,
            qty: quantity,
            price: selectedEquipment.depositAmount || 0,
          },
        ],
        subtotal: created.totalRentalPrice + created.totalDepositAmount || estimatedTotal,
        total: created.totalRentalPrice + created.totalDepositAmount || estimatedTotal,
        extraNote: 'Xuất trình phiếu khi trả dụng cụ để nhận lại tiền cọc',
      });

      showToast('Tạo phiếu thuê thành công', `Đã lập phiếu #${created.ticketCode || ''}`);
      setNewModalOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setQuantity(1);
      loadData();
    } catch (err: any) {
      showToast('Không thể tạo phiếu thuê', err.message || 'Kiểm tra số lượng tồn kho', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openReturnModal = (ticket: RentalTicket) => {
    setReturningTicket(ticket);
    setReturnNotes('');
    const init: Record<string, { condition: 'GOOD' | 'DAMAGED' | 'LOST'; customPenaltyFee: number }> = {};
    (ticket.items || []).forEach((it) => {
      init[it.equipmentId] = { condition: 'GOOD', customPenaltyFee: 0 };
    });
    setConditions(init);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningTicket) return;
    setSubmitting(true);
    try {
      const payloadItems = (returningTicket.items || []).map((it) => {
        const cond = conditions[it.equipmentId] || { condition: 'GOOD' as const, customPenaltyFee: 0 };
        return {
          equipmentId: it.equipmentId,
          condition: cond.condition,
          ...(cond.customPenaltyFee > 0 ? { customPenaltyFee: cond.customPenaltyFee } : {}),
        };
      });

      const updated = await api.returnRentalTicket(returningTicket._id, {
        items: payloadItems,
        notes: returnNotes.trim() || undefined,
      });

      const refundAmt = updated.refundDepositAmount ?? returningTicket.totalDepositAmount;
      openReceipt({
        key: 'rental',
        title: 'PHIẾU HOÀN CỌC VÀ TRẢ DỤNG CỤ',
        invoiceNo: `#RF-${returningTicket.ticketCode || returningTicket._id.slice(-5).toUpperCase()}`,
        customer: `${returningTicket.customerName || 'Khách thuê'} (${returningTicket.customerPhone})`,
        method: 'Hoàn cọc tại quầy',
        items: [
          {
            name: `Hoàn trả tiền cọc phiếu #${returningTicket.ticketCode}`,
            qty: 1,
            price: refundAmt,
          },
        ],
        subtotal: refundAmt,
        total: refundAmt,
        extraNote: returnNotes.trim() || 'Đã nhận lại đủ dụng cụ theo quy định',
      });

      showToast('Hoàn cọc thành công', `Đã hoàn ${refundAmt.toLocaleString('vi-VN')} đ tiền cọc`);
      setReturningTicket(null);
      loadData();
    } catch (err: any) {
      showToast('Lỗi hoàn trả dụng cụ', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-barlow font-extrabold text-xl text-[var(--pos-text-heading)] uppercase">
            Quản lý thuê dụng cụ và thu tiền cọc
          </h2>
          <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
            Theo dõi tồn kho dụng cụ theo thời gian thực - Lập phiếu thuê, thu cọc và quyết toán hoàn cọc
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="phanta-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            disabled={equipments.length === 0}
            onClick={() => setNewModalOpen(true)}
            className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo phiếu thuê mới</span>
          </button>
        </div>
      </div>

      {/* Equipment Stock Cards */}
      {loading ? (
        <div className="phanta-card p-6 text-center text-xs text-[var(--pos-text-sub)]">
          Đang tải danh mục dụng cụ...
        </div>
      ) : equipments.length === 0 ? (
        <div className="phanta-card p-6 text-center text-xs text-[var(--pos-text-sub)]">
          Chưa có dụng cụ nào trong danh mục cho thuê.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {equipments.slice(0, 8).map((eq) => {
            const total = Math.max(1, eq.totalQuantity || 1);
            const avail = Math.max(0, eq.availableQuantity ?? 0);
            const pct = Math.min(100, Math.round((avail / total) * 100));
            const isLow = avail <= 3;

            return (
              <div key={eq._id} className="phanta-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--pos-text-heading)] truncate flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-[var(--pos-accent)] shrink-0" />
                    <span className="truncate">{eq.name}</span>
                  </span>
                  <span className="text-[11px] font-tabular text-[var(--pos-text-sub)] shrink-0">
                    {eq.sportType}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-barlow font-extrabold text-2xl text-[var(--pos-text-heading)] font-tabular">
                    {avail} / {total}
                  </span>
                  <span
                    className="text-[11px] font-bold font-tabular px-2 py-0.5 rounded border"
                    style={
                      isLow
                        ? {
                            backgroundColor: 'var(--pos-danger-soft)',
                            color: 'var(--pos-danger)',
                            borderColor: 'var(--pos-danger-border)',
                          }
                        : {
                            backgroundColor: 'var(--pos-accent-soft)',
                            color: 'var(--pos-accent)',
                            borderColor: 'var(--pos-border)',
                          }
                    }
                  >
                    {isLow ? `Sắp hết (${avail})` : `Thuê ${(eq.price || 0).toLocaleString('vi-VN')} đ`}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[var(--pos-bg-card-inner)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isLow ? 'var(--pos-danger)' : 'var(--pos-accent)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rental Tickets Table */}
      <section className="phanta-card overflow-hidden">
        <div className="p-4 border-b border-[var(--pos-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-barlow font-extrabold text-sm text-[var(--pos-text-heading)] uppercase">
              Danh sách phiếu thuê dụng cụ
            </h3>
            <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
              Theo dõi tiền thuê, tiền cọc giữ và thực hiện hoàn cọc khi khách trả đồ
            </p>
          </div>
          <div className="phanta-subcard px-3.5 py-2 text-xs font-tabular">
            <span className="text-[var(--pos-text-sub)]">Tổng cọc đang giữ: </span>
            <strong className="font-barlow font-extrabold text-base" style={{ color: 'var(--pos-warning)' }}>
              {totalHeldDeposits.toLocaleString('vi-VN')} đ
            </strong>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-3 border-b border-[var(--pos-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'ALL', label: `Tất cả (${tickets.length})` },
              { key: 'RENTING', label: `Đang thuê (${rentingCount})` },
              { key: 'RETURNED', label: `Đã trả (${returnedCount})` },
            ].map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                    active
                      ? 'bg-[var(--pos-accent)] text-[var(--pos-accent-fg)] border-[var(--pos-accent)] font-bold'
                      : 'bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-sub)] border-[var(--pos-border-subtle)]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--pos-text-sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu hoặc SĐT..."
              aria-label="Tìm phiếu thuê dụng cụ"
              className="phanta-input w-full pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--pos-table-head)] text-[var(--pos-text-sub)] uppercase border-b border-[var(--pos-border-subtle)]">
              <tr>
                <th className="p-3">Mã phiếu</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Dụng cụ</th>
                <th className="p-3 text-right">Tiền thuê</th>
                <th className="p-3 text-right">Tiền cọc</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pos-border-subtle)]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--pos-text-sub)]">
                    Không có phiếu thuê nào trong mục này.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isRenting = t.status === 'RENTING';
                  const itemsSummary = (t.items || [])
                    .map((i) => `${i.quantity}x ${i.name || i.equipmentId}`)
                    .join(', ');

                  return (
                    <tr key={t._id} className="hover:bg-[var(--pos-bg-card-inner)] transition-colors">
                      <td className="p-3 font-tabular font-bold text-[var(--pos-accent)]">
                        {t.ticketCode || `#${t._id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[var(--pos-text-heading)]">
                          {t.customerName || 'Khách thuê'}
                        </div>
                        <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                          {t.customerPhone}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--pos-text-main)]">{itemsSummary || '-'}</td>
                      <td className="p-3 text-right font-tabular font-bold text-[var(--pos-accent)]">
                        {(t.totalRentalPrice || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td
                        className="p-3 text-right font-tabular font-bold"
                        style={{ color: 'var(--pos-warning)' }}
                      >
                        {(t.totalDepositAmount || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                          style={
                            isRenting
                              ? {
                                  backgroundColor: 'var(--pos-warning-soft)',
                                  color: 'var(--pos-warning)',
                                  borderColor: 'var(--pos-warning-border)',
                                }
                              : {
                                  backgroundColor: 'var(--pos-accent-soft)',
                                  color: 'var(--pos-accent)',
                                  borderColor: 'var(--pos-border)',
                                }
                          }
                        >
                          {isRenting ? 'Đang thuê' : 'Đã hoàn tất'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {isRenting ? (
                          <button
                            type="button"
                            onClick={() => openReturnModal(t)}
                            className="phanta-btn-primary px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Trả đồ và hoàn cọc</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                            Hoàn: {(t.refundDepositAmount ?? 0).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Rental Modal */}
      {newModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-rental-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
        >
          <form onSubmit={handleCreateRental} className="w-full max-w-md phanta-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <h3 id="new-rental-title" className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Tạo phiếu thuê dụng cụ
              </h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                aria-label="Đóng cửa sổ tạo phiếu thuê"
                className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rental-cust-name" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Tên khách hàng
                  </label>
                  <input
                    id="rental-cust-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="phanta-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="rental-cust-phone" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    id="rental-cust-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0912345678"
                    className="phanta-input w-full px-3 py-2 text-xs font-tabular"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rental-eq-select" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                  Dụng cụ cần thuê
                </label>
                <select
                  id="rental-eq-select"
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="phanta-input w-full px-3 py-2 text-xs"
                >
                  {equipments.map((eq) => (
                    <option key={eq._id} value={eq._id}>
                      {eq.name} (Còn {eq.availableQuantity} - Thuê {eq.price.toLocaleString('vi-VN')} đ - Cọc{' '}
                      {eq.depositAmount.toLocaleString('vi-VN')} đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rental-qty" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Số lượng
                  </label>
                  <input
                    id="rental-qty"
                    type="number"
                    min={1}
                    max={selectedEquipment?.availableQuantity || 10}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="phanta-input w-full px-3 py-2 text-xs font-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rental-hours" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Thời lượng (giờ)
                  </label>
                  <input
                    id="rental-hours"
                    type="number"
                    min={1}
                    max={12}
                    value={rentalHours}
                    onChange={(e) => setRentalHours(Math.max(1, Number(e.target.value) || 1))}
                    className="phanta-input w-full px-3 py-2 text-xs font-tabular"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 font-semibold text-[var(--pos-text-heading)] cursor-pointer">
                  <input
                    type="radio"
                    name="rental-pay"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                  />
                  <span>Tiền mặt</span>
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-[var(--pos-text-heading)] cursor-pointer">
                  <input
                    type="radio"
                    name="rental-pay"
                    checked={paymentMethod === 'VIETQR'}
                    onChange={() => setPaymentMethod('VIETQR')}
                  />
                  <span>Chuyển khoản VietQR</span>
                </label>
              </div>

              <div className="phanta-subcard p-3.5 space-y-1.5 font-tabular">
                <div className="flex justify-between">
                  <span className="text-[var(--pos-text-sub)]">Tiền thuê dụng cụ:</span>
                  <span className="font-bold text-[var(--pos-accent)]">
                    {estimatedRentalFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pos-text-sub)]">Tiền cọc giữ:</span>
                  <span className="font-bold" style={{ color: 'var(--pos-warning)' }}>
                    {estimatedDeposit.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[var(--pos-border-subtle)] text-sm font-bold text-[var(--pos-text-heading)]">
                  <span>Tổng thu tại quầy:</span>
                  <span className="font-barlow text-lg text-[var(--pos-accent)]">
                    {estimatedTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{submitting ? 'Đang tạo phiếu...' : 'Thu tiền và in phiếu 80mm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="phanta-btn-secondary px-4 py-2.5 text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return & Refund Deposit Modal */}
      {returningTicket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-rental-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReturningTicket(null);
          }}
        >
          <form onSubmit={handleConfirmReturn} className="w-full max-w-md phanta-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <h3 id="return-rental-title" className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Trả đồ và hoàn cọc #{returningTicket.ticketCode}
              </h3>
              <button
                type="button"
                onClick={() => setReturningTicket(null)}
                aria-label="Đóng cửa sổ trả dụng cụ"
                className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {(returningTicket.items || []).map((it) => {
                const state = conditions[it.equipmentId] || { condition: 'GOOD', customPenaltyFee: 0 };
                return (
                  <div key={it.equipmentId} className="phanta-subcard p-3 space-y-2">
                    <div className="font-semibold text-[var(--pos-text-heading)]">
                      {it.quantity}x {it.name || it.equipmentId}
                    </div>
                    <select
                      aria-label={`Tình trạng trả ${it.name || it.equipmentId}`}
                      value={state.condition}
                      onChange={(e) =>
                        setConditions((prev) => ({
                          ...prev,
                          [it.equipmentId]: {
                            ...state,
                            condition: e.target.value as 'GOOD' | 'DAMAGED' | 'LOST',
                          },
                        }))
                      }
                      className="phanta-input w-full px-2.5 py-1.5 text-xs"
                    >
                      <option value="GOOD">Nguyên vẹn (Hoàn đủ cọc)</option>
                      <option value="DAMAGED">Hư hỏng (Khấu trừ phí sửa)</option>
                      <option value="LOST">Mất dụng cụ (Khấu trừ phí mất)</option>
                    </select>
                  </div>
                );
              })}

              <div>
                <label htmlFor="return-notes" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                  Ghi chú kiểm tra
                </label>
                <input
                  id="return-notes"
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Nhận đủ dụng cụ..."
                  className="phanta-input w-full px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{submitting ? 'Đang xử lý...' : 'Xác nhận hoàn cọc và in phiếu'}</span>
              </button>
              <button
                type="button"
                onClick={() => setReturningTicket(null)}
                className="phanta-btn-secondary px-4 py-2.5 text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
