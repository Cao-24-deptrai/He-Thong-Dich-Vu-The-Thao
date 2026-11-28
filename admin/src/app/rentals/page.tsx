'use client';

import { useState, useEffect } from 'react';
import {
  PackageCheck,
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Phone,
  User,
  DollarSign,
  ShieldAlert,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { api, Equipment, RentalTicket } from '@/lib/api';

const SPORT_LABELS: Record<string, string> = {
  ALL: 'Tất cả môn',
  FOOTBALL: 'Bóng đá',
  TENNIS: 'Tennis',
  BADMINTON: 'Cầu lông',
  BASKETBALL: 'Bóng rổ',
  GENERAL: 'Chung',
};

export default function RentalsPage() {
  const [activeTab, setActiveTab] = useState<'DESK' | 'RETURNS' | 'CATALOG'>('DESK');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<RentalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [rentalHours, setRentalHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [cart, setCart] = useState<{ equipmentId: string; quantity: number }[]>([]);

  const [selectedTicketForReturn, setSelectedTicketForReturn] = useState<RentalTicket | null>(null);
  const [returnConditions, setReturnConditions] = useState<{
    [equipmentId: string]: { condition: 'GOOD' | 'DAMAGED' | 'LOST'; customPenaltyFee: number };
  }>({});
  const [returnNotes, setReturnNotes] = useState('');

  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [searchCatalog, setSearchCatalog] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentForm, setEquipmentForm] = useState({
    code: '',
    name: '',
    sportType: 'FOOTBALL',
    pricingType: 'PER_TURN',
    price: 50000,
    depositAmount: 100000,
    damageFee: 150000,
    lostFee: 300000,
    totalQuantity: 10,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [eqs, tkts] = await Promise.all([
        api.getEquipments(),
        api.getRentalTickets(),
      ]);
      setEquipments(eqs);
      setTickets(tkts);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu dụng cụ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (eq: Equipment) => {
    const existing = cart.find((item) => item.equipmentId === eq._id);
    if (existing) {
      if (existing.quantity >= eq.availableQuantity) {
        setErrorMsg(`Chỉ còn ${eq.availableQuantity} món ${eq.name} khả dụng.`);
        return;
      }
      setCart(cart.map((i) => (i.equipmentId === eq._id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      if (eq.availableQuantity < 1) {
        setErrorMsg(`Thiết bị ${eq.name} hiện đã hết trong kho.`);
        return;
      }
      setCart([...cart, { equipmentId: eq._id, quantity: 1 }]);
    }
  };

  const updateCartQty = (eqId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.equipmentId !== eqId));
      return;
    }
    if (qty > maxQty) {
      setErrorMsg(`Số lượng vượt quá số lượng khả dụng trong kho (${maxQty}).`);
      return;
    }
    setCart(cart.map((i) => (i.equipmentId === eqId ? { ...i, quantity: qty } : i)));
  };

  const cartSummary = cart.reduce(
    (acc, item) => {
      const eq = equipments.find((e) => e._id === item.equipmentId);
      if (!eq) return acc;
      const rentalCost =
        eq.pricingType === 'HOURLY' ? eq.price * rentalHours * item.quantity : eq.price * item.quantity;
      const depositCost = (eq.depositAmount || 0) * item.quantity;
      return {
        rental: acc.rental + rentalCost,
        deposit: acc.deposit + depositCost,
        total: acc.total + rentalCost + depositCost,
      };
    },
    { rental: 0, deposit: 0, total: 0 },
  );

  const handleCreateTicket = async () => {
    if (!customerPhone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một dụng cụ vào danh sách thuê.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const newTicket = await api.createRentalTicket({
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim() || undefined,
        bookingId: bookingId.trim() || undefined,
        rentalHours,
        paymentMethod,
        items: cart,
      });

      setSuccessMsg(`Đã lập phiếu thuê thành công: Mã phiếu ${newTicket.ticketCode}.`);
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setBookingId('');
      await fetchData();
      setActiveTab('RETURNS');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lập phiếu thuê thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (ticket: RentalTicket) => {
    setSelectedTicketForReturn(ticket);
    const initialConditions: any = {};
    ticket.items.forEach((item) => {
      initialConditions[item.equipmentId] = {
        condition: 'GOOD',
        customPenaltyFee: 0,
      };
    });
    setReturnConditions(initialConditions);
    setReturnNotes('');
  };

  const handleConfirmReturn = async () => {
    if (!selectedTicketForReturn) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const payloadItems = selectedTicketForReturn.items.map((item) => {
        const cond = returnConditions[item.equipmentId] || { condition: 'GOOD', customPenaltyFee: 0 };
        return {
          equipmentId: item.equipmentId,
          condition: cond.condition,
          quantity: item.quantity,
          customPenaltyFee: cond.customPenaltyFee,
        };
      });

      const updated = await api.returnRentalTicket(selectedTicketForReturn._id, {
        items: payloadItems,
        notes: returnNotes.trim() || undefined,
      });

      setSuccessMsg(
        `Quyết toán phiếu ${updated.ticketCode} thành công. Hoàn trả cọc: ${updated.refundDepositAmount.toLocaleString('vi-VN')} đ. Phạt: ${updated.totalPenaltyFee.toLocaleString('vi-VN')} đ.`,
      );
      setSelectedTicketForReturn(null);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xử lý trả đồ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      if (editingEquipment) {
        await api.updateEquipment(editingEquipment._id, equipmentForm as any);
        setSuccessMsg(`Cập nhật thiết bị "${equipmentForm.name}" thành công.`);
      } else {
        await api.createEquipment(equipmentForm as any);
        setSuccessMsg(`Tạo mới thiết bị "${equipmentForm.name}" thành công.`);
      }
      setIsAddModalOpen(false);
      setEditingEquipment(null);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lưu thiết bị thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const totalEquipments = equipments.reduce((sum, e) => sum + e.totalQuantity, 0);
  const totalRented = equipments.reduce((sum, e) => sum + (e.rentedQuantity || 0), 0);
  const totalDamaged = equipments.reduce((sum, e) => sum + (e.damagedQuantity || 0), 0);
  const totalAvailable = equipments.reduce((sum, e) => sum + e.availableQuantity, 0);

  const rentingTickets = tickets.filter((t) => t.status === 'RENTING');

  const filteredEquipments = equipments.filter((eq) => {
    const matchSport = selectedSport === 'ALL' || eq.sportType === selectedSport;
    const matchSearch =
      searchCatalog === '' ||
      eq.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
      eq.code.toLowerCase().includes(searchCatalog.toLowerCase());
    return matchSport && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Cho thuê dụng cụ thể thao</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản lý xuất nhập tồn dụng cụ, thu tiền cọc bảo đảm và quyết toán hoàn trả tại quầy
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--pitch-green)]' : ''}`} strokeWidth={1.75} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingEquipment(null);
              setEquipmentForm({
                code: `EQP-${Math.floor(100 + Math.random() * 900)}`,
                name: '',
                sportType: 'FOOTBALL',
                pricingType: 'PER_TURN',
                price: 50000,
                depositAmount: 100000,
                damageFee: 150000,
                lostFee: 300000,
                totalQuantity: 10,
              });
              setIsAddModalOpen(true);
            }}
            className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Thêm dụng cụ mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="phanta-card p-5">
          <div className="flex justify-between items-center text-[var(--text-sub)]">
            <span className="text-xs font-medium">Tổng thiết bị</span>
            <Boxes className="w-4 h-4 text-[var(--text-sub)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2 text-2xl font-heading font-semibold text-[var(--text-heading)] tabular-nums">{totalEquipments}</div>
          <span className="text-xs text-[var(--text-muted)]">Tài sản quản lý trong kho</span>
        </div>

        <div className="phanta-card p-5">
          <div className="flex justify-between items-center text-[var(--text-sub)]">
            <span className="text-xs font-medium">Đang cho thuê</span>
            <Clock className="w-4 h-4 text-[var(--burnt-orange)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2 text-2xl font-heading font-semibold text-[var(--burnt-orange)] tabular-nums">{totalRented}</div>
          <span className="text-xs text-[var(--text-muted)]">Món đang ở ngoài sân</span>
        </div>

        <div className="phanta-card p-5">
          <div className="flex justify-between items-center text-[var(--text-sub)]">
            <span className="text-xs font-medium">Hỏng / Mất cách ly</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
          </div>
          <div className="mt-2 text-2xl font-heading font-semibold text-rose-500 tabular-nums">{totalDamaged}</div>
          <span className="text-xs text-[var(--text-muted)]">Đã tách khỏi kho khả dụng</span>
        </div>

        <div className="phanta-card p-5">
          <div className="flex justify-between items-center text-[var(--text-sub)]">
            <span className="text-xs font-medium">Sẵn sàng cho thuê</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="mt-2 text-2xl font-heading font-semibold text-[var(--pitch-green)] tabular-nums">{totalAvailable}</div>
          <span className="text-xs text-[var(--text-muted)]">Khả dụng tức thời</span>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => setActiveTab('DESK')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'DESK'
              ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PackageCheck className="w-4 h-4" strokeWidth={1.75} />
          <span>Quầy cho thuê</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RETURNS')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'RETURNS'
              ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
          }`}
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
          <span>Đang thuê & Trả đồ</span>
          {rentingTickets.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-[10px] tabular-nums">
              {rentingTickets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CATALOG')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'CATALOG'
              ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
          }`}
        >
          <Boxes className="w-4 h-4" strokeWidth={1.75} />
          <span>Kho dụng cụ ({equipments.length})</span>
        </button>
      </div>

      {/* TAB 1: POS DESK */}
      {activeTab === 'DESK' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="phanta-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'FOOTBALL', 'TENNIS', 'BADMINTON', 'BASKETBALL', 'GENERAL'].map((sp) => (
                  <button
                    type="button"
                    key={sp}
                    onClick={() => setSelectedSport(sp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                      selectedSport === sp
                        ? 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                        : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] text-[var(--text-sub)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    {SPORT_LABELS[sp] || sp}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)]" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Tìm dụng cụ"
                  value={searchCatalog}
                  onChange={(e) => setSearchCatalog(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEquipments.map((eq) => {
                const inCart = cart.find((i) => i.equipmentId === eq._id);
                const isOutOfStock = eq.availableQuantity <= 0;
                return (
                  <div
                    key={eq._id}
                    className={`phanta-card p-4 flex flex-col justify-between transition-colors ${
                      isOutOfStock
                        ? 'opacity-60'
                        : inCart
                        ? 'border-[var(--pitch-green)] bg-[var(--bg-card-inner)]'
                        : 'phanta-card-hover'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] tabular-nums px-2 py-0.5 rounded-md bg-[var(--bg-card-inner)] text-[var(--text-heading)] border border-[var(--border-subtle)] font-medium">
                            {eq.code}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--text-sub)]">
                            {SPORT_LABELS[eq.sportType] || eq.sportType}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border tabular-nums ${
                            eq.availableQuantity > 0
                              ? 'bg-emerald-500/10 text-[var(--pitch-green)] border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          }`}
                        >
                          Khả dụng: {eq.availableQuantity}
                        </span>
                      </div>

                      <h3 className="font-heading font-semibold text-[var(--text-heading)] text-base mt-2.5">{eq.name}</h3>
                      <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                        <span className="text-[var(--pitch-green)] font-heading font-semibold text-lg">
                          {eq.price.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-xs text-[var(--text-sub)]">
                          / {eq.pricingType === 'HOURLY' ? 'giờ' : 'lượt'}
                        </span>
                        {eq.depositAmount > 0 && (
                          <span className="text-[11px] text-[var(--burnt-orange)] font-medium">
                            - Cọc: {eq.depositAmount.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(eq._id, inCart.quantity - 1, eq.availableQuantity)}
                            className="phanta-btn-secondary w-8 h-8 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-[var(--text-heading)] tabular-nums">{inCart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(eq._id, inCart.quantity + 1, eq.availableQuantity)}
                            className="phanta-btn-primary w-8 h-8 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => addToCart(eq)}
                          className={`w-full py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            isOutOfStock
                              ? 'bg-[var(--bg-card-inner)] text-[var(--text-muted)] cursor-not-allowed'
                              : 'phanta-btn-secondary'
                          }`}
                        >
                          {isOutOfStock ? 'Hết hàng' : 'Chọn thuê'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="phanta-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                <DollarSign className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Phiếu thuê quầy</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">SĐT khách hàng</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)]" strokeWidth={1.75} />
                    <input
                      type="text"
                      placeholder="0911223344"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">Tên khách hàng</label>
                  <div className="relative mt-1">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)]" strokeWidth={1.75} />
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-sub)]">Số giờ thuê</label>
                    <select
                      value={rentalHours}
                      onChange={(e) => setRentalHours(Number(e.target.value))}
                      className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                    >
                      <option value={1}>1 Giờ</option>
                      <option value={2}>2 Giờ</option>
                      <option value={3}>3 Giờ</option>
                      <option value={4}>4 Giờ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-sub)]">Thanh toán</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                    >
                      <option value="CASH">Tiền mặt</option>
                      <option value="VIETQR">VietQR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-3">
                <span className="text-xs font-medium text-[var(--text-sub)]">Dụng cụ đã chọn ({cart.length})</span>
                {cart.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">Chưa có món nào được chọn</p>
                ) : (
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const eq = equipments.find((e) => e._id === item.equipmentId);
                      if (!eq) return null;
                      return (
                        <div
                          key={item.equipmentId}
                          className="phanta-subcard flex items-center justify-between text-xs p-2.5"
                        >
                          <div>
                            <span className="font-semibold text-[var(--text-heading)]">{eq.name}</span>
                            <span className="text-[var(--text-sub)] block text-[11px] tabular-nums">
                              {eq.code} - x{item.quantity}
                            </span>
                          </div>
                          <span className="font-semibold text-[var(--pitch-green)] tabular-nums">
                            {((eq.pricingType === 'HOURLY' ? eq.price * rentalHours : eq.price) * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-2 tabular-nums">
              <div className="flex justify-between text-xs text-[var(--text-sub)]">
                <span>Tiền thuê dụng cụ</span>
                <span className="font-semibold text-[var(--text-heading)]">{cartSummary.rental.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--burnt-orange)]">
                <span>Tiền cọc giữ đồ</span>
                <span className="font-semibold">{cartSummary.deposit.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-base font-heading font-semibold text-[var(--text-heading)] pt-2 border-t border-[var(--border-subtle)]">
                <span>Tổng thu tại quầy</span>
                <span className="text-[var(--pitch-green)] text-lg">{cartSummary.total.toLocaleString('vi-VN')} đ</span>
              </div>

              <button
                type="button"
                disabled={loading || cart.length === 0}
                onClick={handleCreateTicket}
                className="phanta-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 mt-4"
              >
                <PackageCheck className="w-4 h-4" strokeWidth={1.75} />
                <span>Tạo phiếu và giao đồ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE TICKETS & RETURNS */}
      {activeTab === 'RETURNS' && (
        <div className="space-y-4">
          <div className="phanta-card p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-sm font-heading font-semibold text-[var(--text-heading)]">
              Danh sách phiếu đang mượn ({rentingTickets.length})
            </span>
            <span className="text-xs text-[var(--text-sub)]">
              Chọn &quot;Trả đồ và quyết toán&quot; để kiểm tra tình trạng và hoàn tiền cọc
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rentingTickets.map((t) => {
              const isOverdue = new Date(t.dueAt).getTime() < Date.now();
              return (
                <div
                  key={t._id}
                  className={`phanta-card p-5 flex flex-col justify-between space-y-4 ${
                    isOverdue ? 'border-rose-500/50' : 'phanta-card-hover'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs tabular-nums font-semibold text-[var(--pitch-green)] px-2.5 py-0.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-subtle)]">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border ${
                          isOverdue
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : 'bg-amber-500/10 text-[var(--burnt-orange)] border-amber-500/30'
                        }`}
                      >
                        {isOverdue ? 'Quá hạn' : 'Đang thuê'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="font-semibold text-[var(--text-heading)] text-sm">{t.customerName || 'Khách vãng lai'}</div>
                      <div className="text-xs text-[var(--text-sub)] flex items-center gap-1.5 tabular-nums">
                        <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>{t.customerPhone}</span>
                      </div>
                      <div className="text-xs text-[var(--text-sub)] flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Hạn trả: {new Date(t.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                      <span className="text-[11px] font-medium text-[var(--text-sub)]">Món đồ mượn</span>
                      {t.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-[var(--text-main)]">
                          <span>{it.name}</span>
                          <span className="font-semibold text-[var(--pitch-green)] tabular-nums">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex justify-between text-xs tabular-nums">
                      <span className="text-[var(--text-sub)]">Cọc đang giữ</span>
                      <span className="font-semibold text-[var(--burnt-orange)]">{t.totalDepositAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openReturnModal(t)}
                    className="phanta-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
                    <span>Trả đồ và quyết toán</span>
                  </button>
                </div>
              );
            })}
          </div>

          {rentingTickets.length === 0 && (
            <div className="phanta-card p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-[var(--pitch-green)] mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-sm font-heading font-semibold text-[var(--text-heading)]">Không có phiếu thuê nào đang chờ trả</h3>
              <p className="text-xs text-[var(--text-sub)] mt-1">Toàn bộ dụng cụ đã được hoàn trả và quyết toán đầy đủ</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATALOG & ASSET MANAGEMENT */}
      {activeTab === 'CATALOG' && (
        <div className="phanta-card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              <span className="font-heading font-semibold text-[var(--text-heading)] text-sm">Danh mục tài sản kho</span>
            </div>
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)]" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Lọc mã hoặc tên"
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--table-head-bg)] text-[var(--text-sub)] font-medium border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="p-4">Mã</th>
                  <th className="p-4">Tên thiết bị</th>
                  <th className="p-4">Môn</th>
                  <th className="p-4 text-right">Giá thuê</th>
                  <th className="p-4 text-right">Tiền cọc</th>
                  <th className="p-4">Phí hỏng / mất</th>
                  <th className="p-4">Kho (Khả dụng / Tổng)</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
                {filteredEquipments.map((eq) => (
                  <tr key={eq._id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                    <td className="p-4 font-semibold text-[var(--pitch-green)]">{eq.code}</td>
                    <td className="p-4 font-semibold text-[var(--text-heading)]">{eq.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card-inner)] text-[var(--text-main)] border border-[var(--border-subtle)]">
                        {SPORT_LABELS[eq.sportType] || eq.sportType}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-[var(--pitch-green)]">
                      {eq.price.toLocaleString('vi-VN')} đ
                      <span className="text-[11px] text-[var(--text-sub)] block font-normal">
                        / {eq.pricingType === 'HOURLY' ? 'giờ' : 'lượt'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-[var(--burnt-orange)]">
                      {(eq.depositAmount || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-4 text-[var(--text-sub)] text-[11px]">
                      Hỏng: {(eq.damageFee || 0).toLocaleString('vi-VN')} đ<br />
                      Mất: {(eq.lostFee || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-[var(--pitch-green)]">{eq.availableQuantity}</span> /{' '}
                      <span className="text-[var(--text-heading)]">{eq.totalQuantity}</span>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Đang thuê: {eq.rentedQuantity || 0} - Hỏng: {eq.damagedQuantity || 0}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEquipment(eq);
                          setEquipmentForm({
                            code: eq.code,
                            name: eq.name,
                            sportType: eq.sportType,
                            pricingType: eq.pricingType,
                            price: eq.price,
                            depositAmount: eq.depositAmount,
                            damageFee: eq.damageFee,
                            lostFee: eq.lostFee,
                            totalQuantity: eq.totalQuantity,
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="phanta-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {selectedTicketForReturn && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phanta-card w-full max-w-xl p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Quyết toán trả đồ - {selectedTicketForReturn.ticketCode}</span>
                </h3>
                <p className="text-xs text-[var(--text-sub)] mt-1">
                  Kiểm tra tình trạng từng món đồ để tính phí bồi thường và hoàn trả cọc
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForReturn(null)}
                className="text-[var(--text-sub)] hover:text-[var(--text-heading)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {selectedTicketForReturn.items.map((item) => {
                const currentCond = returnConditions[item.equipmentId] || {
                  condition: 'GOOD',
                  customPenaltyFee: 0,
                };
                const eq = equipments.find((e) => e._id === item.equipmentId);
                return (
                  <div key={item.equipmentId} className="phanta-subcard p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[var(--text-heading)] text-sm">
                        {item.name} (x{item.quantity})
                      </span>
                      <span className="text-xs text-[var(--text-sub)] tabular-nums">{item.code}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['GOOD', 'DAMAGED', 'LOST'] as const).map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => {
                            let penalty = 0;
                            if (cond === 'DAMAGED' && eq) penalty = eq.damageFee * item.quantity;
                            if (cond === 'LOST' && eq) penalty = eq.lostFee * item.quantity;
                            setReturnConditions({
                              ...returnConditions,
                              [item.equipmentId]: { condition: cond, customPenaltyFee: penalty },
                            });
                          }}
                          className={`py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center ${
                            currentCond.condition === cond
                              ? cond === 'GOOD'
                                ? 'bg-[var(--pitch-green)] text-[#0C0F0C] font-semibold'
                                : cond === 'DAMAGED'
                                ? 'bg-[var(--burnt-orange)] text-white font-semibold'
                                : 'bg-rose-500 text-white font-semibold'
                              : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-sub)] hover:text-[var(--text-heading)]'
                          }`}
                        >
                          {cond === 'GOOD' ? 'Bình thường' : cond === 'DAMAGED' ? 'Bị hỏng' : 'Bị mất'}
                        </button>
                      ))}
                    </div>

                    {currentCond.condition !== 'GOOD' && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-rose-500 tabular-nums">
                        <span>Phí bồi thường</span>
                        <span className="font-semibold">{currentCond.customPenaltyFee.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="phanta-subcard p-4 space-y-2 text-xs tabular-nums">
              <div className="flex justify-between text-[var(--text-sub)]">
                <span>Tiền cọc ban đầu đã thu</span>
                <span className="font-semibold text-[var(--text-heading)]">
                  {selectedTicketForReturn.totalDepositAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Tổng tiền phạt bồi thường</span>
                <span className="font-semibold">
                  {Object.values(returnConditions)
                    .reduce((sum, c) => sum + (c.customPenaltyFee || 0), 0)
                    .toLocaleString('vi-VN')}{' '}
                  đ
                </span>
              </div>
              <div className="flex justify-between text-[var(--pitch-green)] text-sm font-heading font-semibold pt-2 border-t border-[var(--border-subtle)]">
                <span>Số tiền hoàn cọc cho khách</span>
                <span className="text-base">
                  {Math.max(
                    0,
                    selectedTicketForReturn.totalDepositAmount -
                      Object.values(returnConditions).reduce((sum, c) => sum + (c.customPenaltyFee || 0), 0),
                  ).toLocaleString('vi-VN')}{' '}
                  đ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmReturn}
              className="phanta-btn-primary w-full py-3 text-xs"
            >
              Xác nhận quyết toán và hoàn cọc
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT EQUIPMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEquipment} className="phanta-card w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)]">
                {editingEquipment ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị kho mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--text-sub)] hover:text-[var(--text-heading)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Mã thiết bị</label>
                  <input
                    type="text"
                    required
                    value={equipmentForm.code}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Môn thể thao</label>
                  <select
                    value={equipmentForm.sportType}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, sportType: e.target.value })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                  >
                    <option value="FOOTBALL">Bóng đá</option>
                    <option value="TENNIS">Tennis</option>
                    <option value="BADMINTON">Cầu lông</option>
                    <option value="BASKETBALL">Bóng rổ</option>
                    <option value="GENERAL">Chung</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[var(--text-sub)]">Tên thiết bị</label>
                <input
                  type="text"
                  required
                  placeholder="Vợt Tennis Pro Staff"
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Cách tính giá</label>
                  <select
                    value={equipmentForm.pricingType}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, pricingType: e.target.value })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                  >
                    <option value="PER_TURN">Theo lượt / buổi</option>
                    <option value="HOURLY">Theo giờ</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Giá thuê (VND)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={equipmentForm.price}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, price: Number(e.target.value) })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Tiền cọc</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.depositAmount}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, depositAmount: Number(e.target.value) })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Phí hỏng</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.damageFee}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, damageFee: Number(e.target.value) })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[var(--text-sub)]">Phí mất</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.lostFee}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, lostFee: Number(e.target.value) })}
                    className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[var(--text-sub)]">Tổng số lượng kho</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={equipmentForm.totalQuantity}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, totalQuantity: Number(e.target.value) })}
                  className="w-full mt-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-main)] tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Hủy
              </button>
              <button type="submit" className="phanta-btn-primary px-4 py-2 text-xs">
                Lưu dụng cụ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
