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
  ArrowRight,
  Filter,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { api, Equipment, RentalTicket } from '@/lib/api';

export default function RentalsPage() {
  const [activeTab, setActiveTab] = useState<'DESK' | 'RETURNS' | 'CATALOG'>('DESK');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<RentalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Desk State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [rentalHours, setRentalHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [cart, setCart] = useState<{ equipmentId: string; quantity: number }[]>([]);

  // Return Modal State
  const [selectedTicketForReturn, setSelectedTicketForReturn] = useState<RentalTicket | null>(null);
  const [returnConditions, setReturnConditions] = useState<{
    [equipmentId: string]: { condition: 'GOOD' | 'DAMAGED' | 'LOST'; customPenaltyFee: number };
  }>({});
  const [returnNotes, setReturnNotes] = useState('');

  // Catalog State
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

  // Quick Cart helpers
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

  // Cart summary calculations
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

  // Submit Create Ticket
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

      setSuccessMsg(`Đã lập phiếu thuê thành công: Mã phiếu ${newTicket.ticketCode}`);
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

  // Open Return Modal
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

  // Submit Return Ticket
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
        `Quyết toán phiếu ${updated.ticketCode} thành công! Tiền cọc hoàn trả: ${updated.refundDepositAmount.toLocaleString()} đ. Phạt: ${updated.totalPenaltyFee.toLocaleString()} đ`,
      );
      setSelectedTicketForReturn(null);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xử lý trả đồ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Create or Update Equipment
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      if (editingEquipment) {
        await api.updateEquipment(editingEquipment._id, equipmentForm as any);
        setSuccessMsg(`Cập nhật thiết bị '${equipmentForm.name}' thành công!`);
      } else {
        await api.createEquipment(equipmentForm as any);
        setSuccessMsg(`Tạo mới thiết bị '${equipmentForm.name}' thành công!`);
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

  // Calculate Metrics
  const totalEquipments = equipments.reduce((sum, e) => sum + e.totalQuantity, 0);
  const totalRented = equipments.reduce((sum, e) => sum + (e.rentedQuantity || 0), 0);
  const totalDamaged = equipments.reduce((sum, e) => sum + (e.damagedQuantity || 0), 0);
  const totalAvailable = equipments.reduce((sum, e) => sum + e.availableQuantity, 0);

  const rentingTickets = tickets.filter((t) => t.status === 'RENTING');
  const returnedTickets = tickets.filter((t) => t.status === 'RETURNED');

  const filteredEquipments = equipments.filter((eq) => {
    const matchSport = selectedSport === 'ALL' || eq.sportType === selectedSport;
    const matchSearch =
      searchCatalog === '' ||
      eq.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
      eq.code.toLowerCase().includes(searchCatalog.toLowerCase());
    return matchSport && matchSearch;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Module M13 • Epic E07
            </span>
            <span className="text-slate-400 text-xs">• Phụ trách: Nguyễn Lê Thành Trung</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-cyan-400" />
            Cho Thuê Dụng Cụ Thể Thao
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Quản lý xuất nhập tồn dụng cụ thể thao, cọc bảo đảm, chống quá bán nguyên tử và quyết toán hư hỏng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Làm mới
          </button>
          <button
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Thêm Dụng Cụ Mới
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tổng Thiết Bị</span>
            <Boxes className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black text-white">{totalEquipments}</div>
          <span className="text-[11px] text-slate-400">tài sản quản lý trong kho</span>
        </div>

        <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Đang Cho Thuê</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black text-amber-400">{totalRented}</div>
          <span className="text-[11px] text-slate-400">món đang ở ngoài sân</span>
        </div>

        <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Hỏng / Mất Cách Ly</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black text-rose-400">{totalDamaged}</div>
          <span className="text-[11px] text-slate-400">cách ly khỏi khả dụng</span>
        </div>

        <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Sẵn Sàng Cho Thuê</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black text-emerald-400">{totalAvailable}</div>
          <span className="text-[11px] text-slate-400">khả dụng tức thời</span>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('DESK')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'DESK'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Quầy Cho Thuê (POS Desk)
        </button>

        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'RETURNS'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Đang Thuê & Trả Đồ
          {rentingTickets.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30">
              {rentingTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'CATALOG'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Kho Dụng Cụ ({equipments.length})
        </button>
      </div>

      {/* TAB 1: POS DESK */}
      {activeTab === 'DESK' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Choose Equipment */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4 bg-[#0d121f] p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {['ALL', 'FOOTBALL', 'TENNIS', 'BADMINTON', 'BASKETBALL', 'GENERAL'].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSelectedSport(sp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedSport === sp
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {sp === 'ALL' ? 'Tất cả môn' : sp}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm dụng cụ..."
                  value={searchCatalog}
                  onChange={(e) => setSearchCatalog(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Grid of Equipment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEquipments.map((eq) => {
                const inCart = cart.find((i) => i.equipmentId === eq._id);
                const isOutOfStock = eq.availableQuantity <= 0;
                return (
                  <div
                    key={eq._id}
                    className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-900/40 border-slate-800/40 opacity-60'
                        : inCart
                        ? 'bg-cyan-950/20 border-cyan-500/50'
                        : 'bg-[#0f172a]/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {eq.code}
                          </span>
                          <span className="ml-2 text-[10px] uppercase font-bold text-slate-400">
                            {eq.sportType}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            eq.availableQuantity > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          Khả dụng: {eq.availableQuantity}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-base mt-2">{eq.name}</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-cyan-400 font-black text-lg">
                          {eq.price.toLocaleString()} đ
                        </span>
                        <span className="text-xs text-slate-400">
                          / {eq.pricingType === 'HOURLY' ? 'giờ' : 'lượt'}
                        </span>
                        {eq.depositAmount > 0 && (
                          <span className="text-[11px] text-amber-400 font-medium">
                            • Cọc: {eq.depositAmount.toLocaleString()} đ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(eq._id, inCart.quantity - 1, eq.availableQuantity)}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-white transition"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black text-cyan-400">{inCart.quantity}</span>
                          <button
                            onClick={() => updateCartQty(eq._id, inCart.quantity + 1, eq.availableQuantity)}
                            className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center justify-center font-bold transition"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={() => addToCart(eq)}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30'
                          }`}
                        >
                          {isOutOfStock ? 'Hết Hàng' : '+ Chọn Thuê'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Desk Checkout Panel */}
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Phiếu Thuê Quầy
              </h2>

              {/* Customer Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">SĐT Khách Hàng (*)</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="0911223344"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Tên Khách Hàng</label>
                  <div className="relative mt-1">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Số Giờ Thuê</label>
                    <select
                      value={rentalHours}
                      onChange={(e) => setRentalHours(Number(e.target.value))}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1}>1 Giờ</option>
                      <option value={2}>2 Giờ</option>
                      <option value={3}>3 Giờ</option>
                      <option value={4}>4 Giờ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Thanh Toán</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="CASH">Tiền Mặt</option>
                      <option value="VIETQR">VietQR</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="border-t border-slate-800/80 pt-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Dụng Cụ Đã Chọn ({cart.length})</span>
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Chưa có món nào được chọn</p>
                ) : (
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const eq = equipments.find((e) => e._id === item.equipmentId);
                      if (!eq) return null;
                      return (
                        <div
                          key={item.equipmentId}
                          className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800"
                        >
                          <div>
                            <span className="font-bold text-white">{eq.name}</span>
                            <span className="text-slate-400 block text-[10px]">
                              {eq.code} • x{item.quantity}
                            </span>
                          </div>
                          <span className="font-bold text-cyan-400">
                            {((eq.pricingType === 'HOURLY' ? eq.price * rentalHours : eq.price) * item.quantity).toLocaleString()} đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Price Calculation Bottom */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tiền thuê dụng cụ:</span>
                <span className="font-bold text-white">{cartSummary.rental.toLocaleString()} đ</span>
              </div>
              <div className="flex justify-between text-xs text-amber-400">
                <span>Tiền cọc giữ đồ:</span>
                <span className="font-bold">{cartSummary.deposit.toLocaleString()} đ</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800/60">
                <span>Tổng thu tại quầy:</span>
                <span className="text-emerald-400 text-lg">{cartSummary.total.toLocaleString()} đ</span>
              </div>

              <button
                disabled={loading || cart.length === 0}
                onClick={handleCreateTicket}
                className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg mt-4 ${
                  loading || cart.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                }`}
              >
                <PackageCheck className="w-5 h-5 stroke-[2.5]" />
                Tạo Phiếu & Giao Đồ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE TICKETS & RETURNS */}
      {activeTab === 'RETURNS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#0d121f] p-4 rounded-2xl border border-slate-800">
            <span className="text-sm font-bold text-white">
              Danh sách phiếu đang mượn ({rentingTickets.length})
            </span>
            <span className="text-xs text-slate-400">
              Nhấn &quot;Trả Đồ & Quyết Toán&quot; để kiểm tra tình trạng hỏng/mất và hoàn tiền cọc
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rentingTickets.map((t) => {
              const isOverdue = new Date(t.dueAt).getTime() < Date.now();
              return (
                <div
                  key={t._id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                    isOverdue
                      ? 'bg-rose-950/20 border-rose-500/50'
                      : 'bg-[#0f172a]/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isOverdue ? 'Quá Hạn' : 'Đang Thuê'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="font-bold text-white text-sm">{t.customerName || 'Khách Vãng Lai'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {t.customerPhone}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Hạn trả: {new Date(t.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Món đồ mượn:</span>
                      {t.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-300">
                          <span>{it.name}</span>
                          <span className="font-bold text-cyan-400">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between text-xs">
                      <span className="text-slate-400">Cọc đang giữ:</span>
                      <span className="font-bold text-amber-400">{t.totalDepositAmount.toLocaleString()} đ</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openReturnModal(t)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                    Trả Đồ & Quyết Toán
                  </button>
                </div>
              );
            })}
          </div>

          {rentingTickets.length === 0 && (
            <div className="p-12 text-center bg-[#0d121f] border border-slate-800 rounded-3xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Không có phiếu thuê nào đang chờ trả</h3>
              <p className="text-xs text-slate-400 mt-1">Toàn bộ dụng cụ đã được hoàn trả và quyết toán đầy đủ.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATALOG & ASSET MANAGEMENT */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white text-sm">Danh Mục Tài Sản Kho</span>
              </div>
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Lọc mã hoặc tên..."
                  value={searchCatalog}
                  onChange={(e) => setSearchCatalog(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Mã</th>
                    <th className="p-4">Tên Thiết Bị</th>
                    <th className="p-4">Môn</th>
                    <th className="p-4">Giá Thuê</th>
                    <th className="p-4">Tiền Cọc</th>
                    <th className="p-4">Phí Hỏng / Mất</th>
                    <th className="p-4">Kho (Khả dụng / Tổng)</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredEquipments.map((eq) => (
                    <tr key={eq._id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 font-mono font-bold text-cyan-400">{eq.code}</td>
                      <td className="p-4 font-bold text-white">{eq.name}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {eq.sportType}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">
                        {eq.price.toLocaleString()} đ
                        <span className="text-[10px] text-slate-400 block font-normal">
                          / {eq.pricingType === 'HOURLY' ? 'giờ' : 'lượt'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-amber-400">
                        {(eq.depositAmount || 0).toLocaleString()} đ
                      </td>
                      <td className="p-4 text-slate-400 text-[11px]">
                        Hỏng: {(eq.damageFee || 0).toLocaleString()} đ<br />
                        Mất: {(eq.lostFee || 0).toLocaleString()} đ
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-emerald-400">{eq.availableQuantity}</span> /{' '}
                        <span>{eq.totalQuantity}</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Đang thuê: {eq.rentedQuantity || 0} • Hỏng: {eq.damagedQuantity || 0}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
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
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold transition"
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
        </div>
      )}

      {/* RETURN MODAL */}
      {selectedTicketForReturn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-cyan-400" />
                  Quyết Toán Trả Đồ • {selectedTicketForReturn.ticketCode}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kiểm tra tình trạng vật lý từng món đồ để tính phạt và hoàn trả cọc.
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketForReturn(null)}
                className="text-slate-400 hover:text-white"
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
                  <div key={item.equipmentId} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{item.name} (x{item.quantity})</span>
                      <span className="text-xs text-slate-400 font-mono">{item.code}</span>
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
                          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                            currentCond.condition === cond
                              ? cond === 'GOOD'
                                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : cond === 'DAMAGED'
                                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                : 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cond === 'GOOD' ? 'Bình Thường' : cond === 'DAMAGED' ? 'Bị Hỏng' : 'Bị Mất'}
                        </button>
                      ))}
                    </div>

                    {currentCond.condition !== 'GOOD' && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-rose-300">
                        <span>Phí bồi thường:</span>
                        <span className="font-bold">{currentCond.customPenaltyFee.toLocaleString()} đ</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tiền cọc ban đầu đã thu:</span>
                <span className="font-bold text-white">
                  {selectedTicketForReturn.totalDepositAmount.toLocaleString()} đ
                </span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Tổng tiền phạt bồi thường:</span>
                <span className="font-bold">
                  {Object.values(returnConditions)
                    .reduce((sum, c) => sum + (c.customPenaltyFee || 0), 0)
                    .toLocaleString()}{' '}
                  đ
                </span>
              </div>
              <div className="flex justify-between text-emerald-400 text-sm font-black pt-2 border-t border-slate-800">
                <span>Số tiền hoàn cọc lại cho khách:</span>
                <span className="text-base">
                  {Math.max(
                    0,
                    selectedTicketForReturn.totalDepositAmount -
                      Object.values(returnConditions).reduce((sum, c) => sum + (c.customPenaltyFee || 0), 0),
                  ).toLocaleString()}{' '}
                  đ
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmReturn}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Xác Nhận Quyết Toán & Hoàn Cọc
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT EQUIPMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEquipment}
            className="bg-[#0d121f] border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">
                {editingEquipment ? 'Chỉnh Sửa Thiết Bị' : 'Thêm Thiết Bị Kho Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Mã Thiết Bị (*)</label>
                  <input
                    type="text"
                    required
                    value={equipmentForm.code}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Môn Thể Thao</label>
                  <select
                    value={equipmentForm.sportType}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, sportType: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FOOTBALL">Bóng Đá</option>
                    <option value="TENNIS">Tennis</option>
                    <option value="BADMINTON">Cầu Lông</option>
                    <option value="BASKETBALL">Bóng Rổ</option>
                    <option value="GENERAL">Chung</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 uppercase">Tên Thiết Bị (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Vợt Tennis Pro Staff..."
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Cách Tính Giá</label>
                  <select
                    value={equipmentForm.pricingType}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, pricingType: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PER_TURN">Theo Lượt / Buổi</option>
                    <option value="HOURLY">Theo Giờ</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Giá Thuê (VND) (*)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={equipmentForm.price}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, price: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Tiền Cọc</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.depositAmount}
                    onChange={(e) =>
                      setEquipmentForm({ ...equipmentForm, depositAmount: Number(e.target.value) })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Phí Hỏng</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.damageFee}
                    onChange={(e) =>
                      setEquipmentForm({ ...equipmentForm, damageFee: Number(e.target.value) })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Phí Mất</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentForm.lostFee}
                    onChange={(e) =>
                      setEquipmentForm({ ...equipmentForm, lostFee: Number(e.target.value) })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 uppercase">Tổng Số Lượng Kho (*)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={equipmentForm.totalQuantity}
                  onChange={(e) =>
                    setEquipmentForm({ ...equipmentForm, totalQuantity: Number(e.target.value) })
                  }
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Lưu Dụng Cụ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
